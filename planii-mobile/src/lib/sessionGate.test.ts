import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  firstNameOf,
  gateRestoredSession,
  gateUnlock,
  shouldOfferBiometrics,
  shouldPersistBiometricChange,
} from './sessionGate.ts'

const ada = { id: 'ada', name: 'Ada Lovelace', firstName: 'Ada', admin: true }
const grace = { id: 'grace', name: 'Grace Hopper' }

describe('gateRestoredSession', () => {
  it('ouvre la session restaurée quand le verrou n’est pas demandé', () => {
    assert.deepEqual(gateRestoredSession(ada, false), { kind: 'open', user: ada })
  })

  it('retient le profil et laisse l’utilisateur vide quand il faut verrouiller', () => {
    assert.deepEqual(gateRestoredSession(ada, true), {
      kind: 'locked',
      pendingUser: ada,
      firstName: 'Ada',
    })
  })

  it('ne verrouille pas une restauration sans profil', () => {
    assert.deepEqual(gateRestoredSession(null, true), { kind: 'signed-out' })
  })

  it('prend le premier mot du nom s’il n’y a pas de prénom', () => {
    assert.equal(firstNameOf(grace), 'Grace')
    assert.equal(firstNameOf({ name: '  ', firstName: '  ' }), '')
    assert.deepEqual(gateRestoredSession(grace, true).kind === 'locked'
      ? gateRestoredSession(grace, true)
      : null, {
      kind: 'locked',
      pendingUser: grace,
      firstName: 'Grace',
    })
  })
})

describe('gateUnlock', () => {
  it('publie le profil en attente seulement après une biométrie réussie', () => {
    assert.deepEqual(gateUnlock(ada, true), { user: ada, locked: false })
  })

  it('reste verrouillé si la personne annule', () => {
    assert.deepEqual(gateUnlock(ada, false), { user: null, locked: true })
  })

  it('ne fabrique pas de session s’il n’y a personne en attente', () => {
    assert.deepEqual(gateUnlock(null, true), { user: null, locked: false })
  })
})

describe('offre et réglage', () => {
  it('propose une fois, après une connexion active, si le matériel existe', () => {
    assert.equal(shouldOfferBiometrics({ justSignedIn: true, available: true, offered: false }), true)
    assert.equal(shouldOfferBiometrics({ justSignedIn: true, available: true, offered: true }), false)
    assert.equal(shouldOfferBiometrics({ justSignedIn: false, available: true, offered: false }), false)
    assert.equal(shouldOfferBiometrics({ justSignedIn: true, available: false, offered: false }), false)
  })

  it('exige une biométrie pour activer, et désactive tout de suite', () => {
    assert.equal(shouldPersistBiometricChange(true, true), true)
    assert.equal(shouldPersistBiometricChange(true, false), false)
    assert.equal(shouldPersistBiometricChange(false, false), true)
  })
})
