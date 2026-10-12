import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { PGlite } from '@electric-sql/pglite'

const uuid = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const alice = uuid(101)
const bob = uuid(102)
const migration = name => readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8')

function definition(source, name) {
  const start = source.lastIndexOf(`CREATE OR REPLACE FUNCTION ${name}(`)
  assert.notEqual(start, -1, `Missing ${name}`)
  const end = source.indexOf('$$;', start)
  assert.notEqual(end, -1, `Incomplete ${name}`)
  return source.slice(start, end + 3)
}

async function asCaller(db, role, user, operation) {
  assert.ok(['anon', 'authenticated'].includes(role))
  await db.exec(`SET ROLE ${role}`)
  try {
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [user ?? ''])
    return await operation()
  } finally {
    await db.exec("RESET ROLE; RESET request.jwt.claim.sub")
  }
}

async function fixture(db) {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
    CREATE TYPE public.idea_status AS ENUM ('draft', 'in_review', 'in_progress', 'completed', 'cancelled', 'on_hold');
    CREATE TYPE public.notification_type AS ENUM ('status_change');
    CREATE TABLE public.ideas (
      id uuid PRIMARY KEY, user_id uuid, title text, description text, target_audience text,
      category_id uuid, subcategory_id uuid, is_private boolean NOT NULL DEFAULT false,
      status public.idea_status DEFAULT 'draft', created_at timestamptz, updated_at timestamptz,
      author_name text, upvotes integer DEFAULT 0, downvotes integer DEFAULT 0,
      engagement_score double precision DEFAULT 0, status_updated_at timestamptz,
      status_updated_by uuid, remixed_from_id uuid REFERENCES public.ideas(id)
    );
    ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
    CREATE POLICY readable_ideas ON public.ideas FOR SELECT
      USING (NOT is_private OR user_id = auth.uid());
    GRANT SELECT ON public.ideas TO anon, authenticated;
    CREATE TABLE public.profiles (id uuid PRIMARY KEY, username text, full_name text);
    CREATE TABLE public.notifications (
      id uuid DEFAULT gen_random_uuid(), user_id uuid, type public.notification_type,
      title text, message text, idea_id uuid, link text
    );
    CREATE TABLE public.audit_logs (
      id uuid DEFAULT gen_random_uuid(), table_name text, record_id uuid, user_id uuid,
      action text, old_data jsonb, new_data jsonb, created_at timestamptz DEFAULT now()
    );
  `)
  const rows = [
    [1, alice, 'Public original', false, null, 10, 1],
    [2, bob, 'Public search fixture', false, null, 5, 5],
    [3, alice, 'Alice private title', true, 1, 20, 0],
    [4, bob, 'Bob private title', true, 1, 30, 0],
    [5, null, 'Ownerless private title', true, 1, 40, 0],
  ]
  for (const [id, owner, title, privateIdea, parent, engagement, upvotes] of rows) {
    await db.query(`INSERT INTO public.ideas
      (id, user_id, title, description, target_audience, category_id, subcategory_id,
       is_private, created_at, author_name, remixed_from_id, engagement_score, upvotes)
      VALUES ($1, $2, $3, $3, 'Fixture audience', $4, $5, $6, $7, 'Fixture author', $8, $9, $10)`,
    [uuid(id), owner, title, uuid(70), uuid(71), privateIdea, `2025-01-01T00:00:0${id}Z`, parent ? uuid(parent) : null, engagement, upvotes])
  }
  await db.query('INSERT INTO public.profiles (id, username) VALUES ($1, $2), ($3, $4)', [alice, 'Alice', bob, 'Bob'])

  const filter = await migration('20250117000003_fix_idea_privacy.sql')
  await db.exec(filter)
  const remix = await migration('20250117000001_add_idea_remixes.sql')
  await db.exec(definition(remix, 'get_idea_remix_history'))
  await db.exec('GRANT EXECUTE ON FUNCTION public.get_idea_remix_history(uuid) TO anon, authenticated')
  const status = await migration('20250116000008_add_idea_status_management.sql')
  // This historical file duplicates a declaration. Exercise its intended body,
  // without claiming that the entire historical migration chain can be replayed.
  await db.exec(definition(status, 'public.update_idea_status'))
  await db.exec(definition(status, 'public.handle_status_update'))
  await db.exec(`CREATE TRIGGER on_status_update BEFORE UPDATE OF status ON public.ideas
    FOR EACH ROW EXECUTE FUNCTION public.handle_status_update()`)
}

async function filtered(db, { sort = 'all', user = null, page = 0, limit = 10, category = null, subcategory = null, search = null, status = null } = {}) {
  return (await db.query('SELECT id FROM public.get_filtered_ideas($1, $2, $3, $4, $5, $6, $7, $8)',
    [page, limit, sort, user, category, subcategory, search, status])).rows.map(row => row.id)
}

test('privileged idea RPCs bind private reads and writes to authenticated callers', async t => {
  const db = new PGlite()
  t.after(() => db.close())
  await fixture(db)

  await t.test('the legacy definitions reproduce both private-read regressions despite RLS', async () => {
    await asCaller(db, 'authenticated', bob, async () => {
      assert.deepEqual(await filtered(db, { sort: 'my_ideas', user: alice }), [uuid(3), uuid(1)])
      assert.deepEqual((await db.query('SELECT id FROM public.ideas ORDER BY id')).rows.map(row => row.id), [uuid(1), uuid(2), uuid(4)])
    })
    await asCaller(db, 'anon', null, async () => {
      assert.ok((await filtered(db, { sort: 'my_ideas', user: alice })).includes(uuid(3)))
      const rows = (await db.query('SELECT * FROM public.get_idea_remix_history($1)', [uuid(1)])).rows
      assert.equal(rows.find(row => row.id === uuid(3)).title, 'Alice private title')
      assert.equal(rows.find(row => row.id === uuid(5)).title, 'Ownerless private title')
    })
  })

  const aclQuery = `SELECT proname, pg_get_userbyid(proowner) AS owner, proacl::text AS acl
    FROM pg_proc WHERE pronamespace = 'public'::regnamespace
      AND proname IN ('get_filtered_ideas', 'get_idea_remix_history', 'update_idea_status') ORDER BY proname`
  const previousAcl = (await db.query(aclQuery)).rows
  await db.exec(await migration('20261012200000_bind_idea_rpc_authorization.sql'))

  await t.test('replacement preserves function ownership and execute grants', async () => {
    assert.deepEqual((await db.query(aclQuery)).rows, previousAcl)
  })

  await t.test('my ideas permits the verified owner and rejects forged, missing and anonymous identities', async () => {
    await asCaller(db, 'authenticated', alice, async () => {
      assert.deepEqual(await filtered(db, { sort: 'my_ideas', user: alice }), [uuid(3), uuid(1)])
      assert.deepEqual(await filtered(db, { sort: 'my_ideas', user: null }), [])
    })
    await asCaller(db, 'authenticated', bob, async () => {
      assert.deepEqual(await filtered(db, { sort: 'my_ideas', user: alice }), [])
      assert.deepEqual(await filtered(db, { sort: 'my_ideas', user: bob }), [uuid(4), uuid(2)])
    })
    await asCaller(db, 'anon', null, async () => {
      assert.deepEqual(await filtered(db, { sort: 'my_ideas', user: alice }), [])
      assert.deepEqual(await filtered(db, { sort: 'my_ideas' }), [])
    })
  })

  await t.test('public browsing, filters, ordering and pagination retain their behavior', async () => {
    await asCaller(db, 'anon', null, async () => {
      assert.deepEqual(await filtered(db), [uuid(2), uuid(1)])
      assert.deepEqual(await filtered(db, { sort: 'trending' }), [uuid(1), uuid(2)])
      assert.deepEqual(await filtered(db, { sort: 'top' }), [uuid(2), uuid(1)])
      assert.deepEqual(await filtered(db, { limit: 1, page: 1 }), [uuid(1)])
      assert.deepEqual(await filtered(db, { search: 'search', category: uuid(70), subcategory: uuid(71), status: 'draft' }), [uuid(2)])
      assert.deepEqual(await filtered(db, { category: uuid(72) }), [])
      assert.deepEqual(await filtered(db, { subcategory: uuid(72) }), [])
      assert.deepEqual(await filtered(db, { status: 'completed' }), [])
    })
    await asCaller(db, 'authenticated', alice, async () => {
      assert.deepEqual(await filtered(db), [uuid(3), uuid(2), uuid(1)])
    })
  })

  await t.test('history redacts other owners and ownerless private titles, including anonymous requests', async () => {
    for (const [role, user] of [['anon', null], ['authenticated', alice], ['authenticated', bob]]) {
      await asCaller(db, role, user, async () => {
        const rows = (await db.query('SELECT * FROM public.get_idea_remix_history($1)', [uuid(3)])).rows
        assert.equal(rows.find(row => row.id === uuid(1)).title, 'Public original')
        assert.equal(rows.find(row => row.id === uuid(3)).title, user === alice ? 'Alice private title' : 'Private Idea')
        assert.equal(rows.find(row => row.id === uuid(4)).title, user === bob ? 'Bob private title' : 'Private Idea')
        assert.equal(rows.find(row => row.id === uuid(5)).title, 'Private Idea')
        assert.deepEqual(rows.map(row => row.remix_level), [0, 1, 1, 1])
      })
    }
  })

  await t.test('status updates reject impersonation and preserve owner notification and audit behavior', async () => {
    const update = (id, user) => db.query('SELECT * FROM public.update_idea_status($1, $2, $3)', [uuid(id), 'completed', user])
    await asCaller(db, 'authenticated', bob, async () => {
      await assert.rejects(update(3, alice), /Unauthorized/)
      await assert.rejects(update(4, null), /Unauthorized/)
      await assert.rejects(update(5, bob), /Unauthorized/)
    })
    await asCaller(db, 'anon', null, async () => {
      await assert.rejects(update(3, alice), /Unauthorized/)
      await assert.rejects(update(5, null), /Unauthorized/)
    })
    await asCaller(db, 'authenticated', alice, async () => {
      await assert.rejects(update(999, alice), /Idea not found/)
      const rows = (await update(3, alice)).rows
      assert.equal(rows[0].status, 'completed')
      assert.equal(rows[0].status_updated_by, alice)
    })
    assert.equal((await db.query('SELECT status FROM public.ideas WHERE id = $1', [uuid(4)])).rows[0].status, 'draft')
    assert.equal((await db.query('SELECT count(*)::int AS count FROM public.notifications')).rows[0].count, 1)
    const audit = (await db.query('SELECT user_id, old_data, new_data FROM public.audit_logs')).rows
    assert.deepEqual(audit, [{ user_id: alice, old_data: { status: 'draft' }, new_data: { status: 'completed' } }])
  })
})
