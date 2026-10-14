import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'

test('installed React client and server renderers load and render together', () => {
  assert.equal(typeof createRoot, 'function')
  assert.equal(
    renderToStaticMarkup(createElement('span', null, 'Renderer compatibility')),
    '<span>Renderer compatibility</span>',
  )
})
