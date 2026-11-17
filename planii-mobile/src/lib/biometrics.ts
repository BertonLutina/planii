/** Biomètrie locale — verrou d'application, pas un second login.
 *  Toute erreur native est avalée : un capteur absent ou un trousseau
 *  illisible ne doit jamais faire planter le démarrage. */

const APP = 'planii'
const FINGERPRINT = 1
const FACIAL_RECOGNITION = 2

interface Store {
  getItemAsync(key: string): Promise<string | null>
  setItemAsync(key: string, value: string): Promise<void>
  deleteItemAsync(key: string): Promise<void>
}

interface AuthAdapter {
  hasHardwareAsync(): Promise<boolean>
  isEnrolledAsync(): Promise<boolean>
  supportedAuthenticationTypesAsync(): Promise<number[]>
  authenticateAsync(options: {
    promptMessage?: string
    disableDeviceFallback?: boolean
  }): Promise<{ success: boolean }>
}

let storeOverride: Store | null = null
let authOverride: AuthAdapter | null = null

/** Réservé aux tests : remplace le trousseau et le module natif. */
export function setBiometricAdapters(next: { store?: Store | null; auth?: AuthAdapter | null }): void {
  if ('store' in next) storeOverride = next.store ?? null
  if ('auth' in next) authOverride = next.auth ?? null
}

async function store(): Promise<Store> {
  if (storeOverride) return storeOverride
  return import('expo-secure-store')
}

async function auth(): Promise<AuthAdapter> {
  if (authOverride) return authOverride
  return import('expo-local-authentication')
}

function os(): string {
  if (process.env.EXPO_OS) return process.env.EXPO_OS
  try {
    // Import tardif : les tests Node ne chargent pas React Native.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native').Platform.OS as string
  } catch {
    return 'ios'
  }
}

export function enabledKey(userId: string): string {
  return `${APP}_bio_enabled_${userId}`
}

export function offeredKey(userId: string): string {
  return `${APP}_bio_offered_${userId}`
}

/** Icône d'après le libellé renvoyé par `getLabel`. */
export function biometricIcon(label: string): 'scan-face' | 'fingerprint' {
  return /face/i.test(label) ? 'scan-face' : 'fingerprint'
}

export async function isAvailable(): Promise<boolean> {
  try {
    const native = await auth()
    const [hardware, enrolled] = await Promise.all([
      native.hasHardwareAsync(),
      native.isEnrolledAsync(),
    ])
    return hardware === true && enrolled === true
  } catch {
    return false
  }
}

export async function getLabel(): Promise<string> {
  try {
    const types = await (await auth()).supportedAuthenticationTypesAsync()
    const face = types.includes(FACIAL_RECOGNITION)
    const finger = types.includes(FINGERPRINT)
    if (os() === 'ios') {
      if (face) return 'Face ID'
      if (finger) return 'Touch ID'
      return 'Biometric'
    }
    if (finger) return 'Fingerprint'
    return 'Biometric'
  } catch {
    return 'Biometric'
  }
}

/** Le code de l'appareil reste accepté (`disableDeviceFallback: false`). */
export async function authenticate(promptMessage: string): Promise<boolean> {
  try {
    const result = await (await auth()).authenticateAsync({
      promptMessage,
      disableDeviceFallback: false,
    })
    return result.success === true
  } catch {
    return false
  }
}

export async function isEnabled(userId: string): Promise<boolean> {
  if (!userId) return false
  try {
    const value = await (await store()).getItemAsync(enabledKey(userId))
    return value === '1'
  } catch {
    return false
  }
}

export async function setEnabled(userId: string, enabled: boolean): Promise<void> {
  if (!userId) return
  try {
    const secure = await store()
    if (enabled) await secure.setItemAsync(enabledKey(userId), '1')
    else await secure.deleteItemAsync(enabledKey(userId))
  } catch {
    /* le réglage reste inchangé, l'app continue */
  }
}

export async function wasOffered(userId: string): Promise<boolean> {
  if (!userId) return false
  try {
    const value = await (await store()).getItemAsync(offeredKey(userId))
    return value === '1'
  } catch {
    return false
  }
}

export async function markOffered(userId: string): Promise<void> {
  if (!userId) return
  try {
    await (await store()).setItemAsync(offeredKey(userId), '1')
  } catch {
    /* une offre manquée se représentera ; rien ne doit planter */
  }
}

/** Verrou au froid seulement si le réglage est actif ET le capteur est prêt. */
export async function shouldLockAtLaunch(userId: string): Promise<boolean> {
  if (!userId) return false
  try {
    const [enabled, available] = await Promise.all([isEnabled(userId), isAvailable()])
    return enabled && available
  } catch {
    return false
  }
}
