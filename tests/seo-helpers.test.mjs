import assert from 'node:assert/strict'
import test from 'node:test'
import {
  SITE_URL,
  absoluteUrl,
  ideaPath,
  isUuid,
  serializeJsonLd,
  siteJsonLd,
  toPlainText,
  truncate,
} from '../src/lib/seo/site.ts'

test('canonical URLs always use the production origin', () => {
  assert.equal(SITE_URL, 'https://greatwallofideas.com')
  assert.equal(absoluteUrl('/ideas'), 'https://greatwallofideas.com/ideas')
  assert.equal(
    absoluteUrl(ideaPath('0b6f4d3e-1c2a-4b5d-8e9f-0a1b2c3d4e5f')),
    'https://greatwallofideas.com/ideas?id=0b6f4d3e-1c2a-4b5d-8e9f-0a1b2c3d4e5f',
  )
})

test('only UUIDs are accepted as idea ids', () => {
  assert.equal(isUuid('0b6f4d3e-1c2a-4b5d-8e9f-0a1b2c3d4e5f'), true)
  assert.equal(isUuid('not-a-uuid'), false)
  assert.equal(isUuid("1' or '1'='1"), false)
  assert.equal(isUuid(undefined), false)
})

test('rich-text descriptions become single-line plain text', () => {
  assert.equal(
    toPlainText('<p>Hello <strong>world</strong></p><p>Tom &amp; Jerry&nbsp;&lt;3</p>'),
    'Hello world Tom & Jerry 3',
  )
  assert.equal(toPlainText(null), '')
})

test('truncate keeps short text and cuts long text on a word boundary', () => {
  assert.equal(truncate('short', 10), 'short')
  const cut = truncate('one two three four five six', 15)
  assert.ok(cut.length <= 15)
  assert.ok(cut.endsWith('…'))
})

test('JSON-LD serialization cannot close the surrounding script tag', () => {
  const html = serializeJsonLd({ text: '</script><script>alert(1)</script>' })
  assert.equal(html.includes('</script>'), false)
  assert.deepEqual(JSON.parse(html), { text: '</script><script>alert(1)</script>' })
})

test('site JSON-LD declares WebSite with a working search target', () => {
  const graph = siteJsonLd()['@graph']
  const website = graph.find((node) => node['@type'] === 'WebSite')
  assert.ok(graph.some((node) => node['@type'] === 'Organization'))
  assert.equal(
    website.potentialAction.target.urlTemplate,
    'https://greatwallofideas.com/ideas?q={search_term_string}',
  )
})
