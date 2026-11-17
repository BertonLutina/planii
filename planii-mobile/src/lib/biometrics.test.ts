import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  authenticate,
  biometricIcon,
  enabledKey,
  getLabel,
  isAvailable,
  isEnabled,
  markOffered,
  offeredKey,
  setBiometricAdapters,
  setEnabled,
  shouldLockAtLaunch,
  wasOffered,
} from './biometrics.ts'

function memory() {
  const data = new Map<string, string>()
  return {
    data,
    store: {
      async getItemAsync(key: string) { return data.has(key) ? data.get(key)! : null },
      async setItemAsync(key: string, value: string) { data.set(key, value) },
      async deleteItemAsync(key: string) { data.delete(key) },
    },
  }
}

function native(over: Partial<{
  hardware: boolean
  enrolled: boolean
  types: number[]
  success: boolean
  throwOn: 'hardware' | 'auth' | 'types' | null
}> = {}) {
  const calls: Array<Record<string, unknown>> = []
  const cfg = {
    hardware: true,
    enrolled: true,
    types: [2],
    success: true,
    throwOn: null as 'hardware' | 'auth' | 'types' | null,
    ...over,
  }
  return {
    calls,
    auth: {
      async hasHardwareAsync() {
        if (cfg.throwOn === 'hardware') throw new Error('capteur')
        return cfg.hardware
      },
      async isEnrolledAsync() { return cfg.enrolled },
      async supportedAuthenticationTypesAsync() {
        if (cfg.throwOn === 'types') throw new Error('types')
        return cfg.types
      },
      async authenticateAsync(options: { promptMessage?: string; disableDeviceFallback?: boolean }) {
        calls.push(options)
        if (cfg.throwOn === 'auth') throw new Error('prompt')
        return { success: cfg.success }
      },
    },
  }
}

afterEach(() => setBiometricAdapters({ store: null, auth: null }))

describe('préférences par compte', () => {
  it('mémorise l’activation sans toucher au compte voisin', async () => {
    const mem = memory()
    setBiometricAdapters({ store: mem.store })
    assert.equal(enabledKey('ada'), 'planii_bio_enabled_ada')
    assert.equal(await isEnabled('ada'), false)
    await setEnabled('ada', true)
    await setEnabled('grace', true)
    assert.equal(mem.data.get('planii_bio_enabled_ada'), '1')
    assert.equal(await isEnabled('ada'), true)
    await setEnabled('ada', false)
    assert.equal(mem.data.has('planii_bio_enabled_ada'), false)
    assert.equal(await isEnabled('ada'), false)
    assert.equal(await isEnabled('grace'), true)
  })

  it('marque l’offre une fois, même si le trousseau échoue', async () => {
    const mem = memory()
    setBiometricAdapters({ store: mem.store })
    assert.equal(offeredKey('ada'), 'planii_bio_offered_ada')
    assert.equal(await wasOffered('ada'), false)
    await markOffered('ada')
    assert.equal(await wasOffered('ada'), true)

    setBiometricAdapters({
      store: {
        async getItemAsync() { throw new Error('locked') },
        async setItemAsync() { throw new Error('locked') },
        async deleteItemAsync() { throw new Error('locked') },
      },
    })
    assert.equal(await isEnabled('ada'), false)
    assert.equal(await wasOffered('ada'), false)
    await setEnabled('ada', true)
    await markOffered('ada')
  })
})

describe('matériel', () => {
  it('n’est disponible que si le capteur existe et qu’une biométrie est enregistrée', async () => {
    const ok = native()
    setBiometricAdapters({ auth: ok.auth })
    assert.equal(await isAvailable(), true)

    setBiometricAdapters({ auth: native({ enrolled: false }).auth })
    assert.equal(await isAvailable(), false)

    setBiometricAdapters({ auth: native({ hardware: false }).auth })
    assert.equal(await isAvailable(), false)

    setBiometricAdapters({ auth: native({ throwOn: 'hardware' }).auth })
    assert.equal(await isAvailable(), false)
  })

  it('nomme Face ID, Touch ID, ou l’empreinte Android', async () => {
    const prev = process.env.EXPO_OS
    try {
      process.env.EXPO_OS = 'ios'
      setBiometricAdapters({ auth: native({ types: [2] }).auth })
      assert.equal(await getLabel(), 'Face ID')
      setBiometricAdapters({ auth: native({ types: [1] }).auth })
      assert.equal(await getLabel(), 'Touch ID')
      setBiometricAdapters({ auth: native({ types: [1, 2] }).auth })
      assert.equal(await getLabel(), 'Face ID')

      process.env.EXPO_OS = 'android'
      setBiometricAdapters({ auth: native({ types: [1] }).auth })
      assert.equal(await getLabel(), 'Fingerprint')
      setBiometricAdapters({ auth: native({ types: [2] }).auth })
      assert.equal(await getLabel(), 'Biometric')
      setBiometricAdapters({ auth: native({ throwOn: 'types' }).auth })
      assert.equal(await getLabel(), 'Biometric')
    } finally {
      if (prev === undefined) delete process.env.EXPO_OS
      else process.env.EXPO_OS = prev
    }
  })

  it('choisit le visage seulement pour Face ID', () => {
    assert.equal(biometricIcon('Face ID'), 'scan-face')
    assert.equal(biometricIcon('Touch ID'), 'fingerprint')
    assert.equal(biometricIcon('Fingerprint'), 'fingerprint')
    assert.equal(biometricIcon('Biometric'), 'fingerprint')
  })
})

describe('authenticate', () => {
  it('laisse le code de l’appareil en repli et ne renvoie qu’un booléen', async () => {
    const ok = native({ success: true })
    setBiometricAdapters({ auth: ok.auth })
    assert.equal(await authenticate('Déverrouiller Planii'), true)
    assert.deepEqual(ok.calls[0], {
      promptMessage: 'Déverrouiller Planii',
      disableDeviceFallback: false,
    })

    setBiometricAdapters({ auth: native({ success: false }).auth })
    assert.equal(await authenticate('Déverrouiller Planii'), false)

    setBiometricAdapters({ auth: native({ throwOn: 'auth' }).auth })
    assert.equal(await authenticate('Déverrouiller Planii'), false)
  })
})

describe('shouldLockAtLaunch', () => {
  it('verrouille seulement si le compte l’a demandé et que le capteur est prêt', async () => {
    const mem = memory()
    setBiometricAdapters({ store: mem.store, auth: native().auth })
    assert.equal(await shouldLockAtLaunch('ada'), false)
    await setEnabled('ada', true)
    assert.equal(await shouldLockAtLaunch('ada'), true)

    setBiometricAdapters({ store: mem.store, auth: native({ enrolled: false }).auth })
    assert.equal(await shouldLockAtLaunch('ada'), false)

    setBiometricAdapters({ store: mem.store, auth: native({ throwOn: 'hardware' }).auth })
    assert.equal(await shouldLockAtLaunch('ada'), false)
    assert.equal(await shouldLockAtLaunch(''), false)
  })
})
