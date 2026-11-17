import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { APP_VERSION, RELEASES, pick } from './releases.ts'

const json = (rel: string) => JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8'))

describe('journal des versions', () => {
  it('la dernière entrée correspond à la version de l’application', () => {
    assert.equal(APP_VERSION, json('../../package.json').version)
    assert.equal(APP_VERSION, json('../../app.json').expo.version)
    assert.equal(APP_VERSION, json('../../../planii-vite/package.json').version)
  })

  it('les entrées sont triées de la plus récente à la plus ancienne, sans doublon', () => {
    const dates = RELEASES.map((r) => r.date)
    assert.deepEqual([...dates].sort().reverse(), dates)
    assert.equal(new Set(RELEASES.map((r) => r.version)).size, RELEASES.length)
  })

  it('chaque entrée est rédigée en français et en anglais', () => {
    for (const r of RELEASES) {
      assert.ok(r.items.length > 0, r.version)
      for (const text of [r.title, ...r.items.map((i) => i.text)]) {
        assert.ok(text.fr.trim() && text.en.trim(), r.version)
      }
    }
  })

  it('les langues non rédigées retombent sur l’anglais', () => {
    assert.equal(pick({ fr: 'a', en: 'b' }, 'sw'), 'b')
    assert.equal(pick({ fr: 'a', en: 'b' }, 'fr'), 'a')
  })
})
