import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseResetToken } from './resetLink.ts'

describe('parseResetToken', () => {
  it('accepte un jeton brut', () => {
    assert.equal(parseResetToken('abcdefghijklmnop'), 'abcdefghijklmnop')
  })

  it('extrait le jeton d’une URL web ou native', () => {
    assert.equal(
      parseResetToken('https://planii.app/reset-password?token=abcdefghijklmnop'),
      'abcdefghijklmnop',
    )
    assert.equal(
      parseResetToken('planii://reset-password?token=abcdefghijklmnop'),
      'abcdefghijklmnop',
    )
  })

  it('refuse les valeurs vides ou trop courtes', () => {
    assert.equal(parseResetToken(''), '')
    assert.equal(parseResetToken('short'), '')
    assert.equal(parseResetToken(undefined), '')
    assert.equal(parseResetToken(['abcdefghijklmnop']), 'abcdefghijklmnop')
  })
})
