import assert from 'node:assert/strict'
import test from 'node:test'
import { safeRedirectPath } from '../src/lib/utils/redirect-utils.ts'

test('authentication return paths reject external authorities and script URLs', () => {
  for (const value of ['https://evil.example', '//evil.example', '@evil.example/', '/\\evil.example', '/%5cevil.example', '/%2f%2fevil.example', 'javascript:alert(1)', '/ideas\n', '/ideas%0d%0aLocation:evil', '/bad%']) {
    assert.equal(safeRedirectPath(value), '/ideas', value)
  }
})

test('internal navigation preserves query strings and fragments', () => {
  assert.equal(safeRedirectPath('/profile?tab=saved#top'), '/profile?tab=saved#top')
  assert.equal(safeRedirectPath('/ideas?q=hello%20world'), '/ideas?q=hello%20world')
  assert.equal(safeRedirectPath(null, '/auth'), '/auth')
})
