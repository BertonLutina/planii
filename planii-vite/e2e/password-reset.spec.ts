import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mockApi } from './helpers'

// PLANI-018: web password-reset journey (login → "forgot" → e-mail → link → new password + confirmation).
// The API is mocked; the server side is covered by planii-backend/tests/auth.test.ts.

const TOKEN = 'SECRET-reset-token-0123456789'
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']

type Calls = { forgot: unknown[]; reset: unknown[]; urls: string[]; leaks: string[] }

async function mockAuth(context: BrowserContext, reset: { status: number; body: unknown } = { status: 200, body: { ok: true } }): Promise<Calls> {
  await mockApi(context)
  const calls: Calls = { forgot: [], reset: [], urls: [], leaks: [] }
  context.on('request', (r) => {
    // The opened link itself (the document) necessarily carries the token; everything the page then requests must not.
    if (r.resourceType() !== 'document') {
      calls.urls.push(r.url())
      const referer = r.headers()['referer'] || ''
      if (referer.includes('SECRET')) calls.leaks.push(`${r.resourceType()} ${r.url()} referer=${referer}`)
    }
  })
  // Registered after mockApi → takes precedence.
  await context.route('https://api.planii.app/api/auth/forgot-password', (route) => {
    calls.forgot.push(route.request().postDataJSON())
    return route.fulfill({ json: { ok: true } }) // always the same answer, whatever the address
  })
  await context.route('https://api.planii.app/api/auth/reset-password', (route) => {
    calls.reset.push(route.request().postDataJSON())
    return route.fulfill({ status: reset.status, json: reset.body })
  })
  return calls
}

async function pin(page: Page, scheme: 'light' | 'dark' = 'light') {
  await page.addInitScript((s) => { try { localStorage.setItem('planii.theme', s) } catch { /* ignore */ } }, scheme)
}

async function openLogin(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /sign in|log in|se connecter/i }).first().click()
  await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible()
}

async function axe(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`), `axe on ${label}`).toEqual([])
}

test('login offers "Forgot password?" under the password field and opens the e-mail step', async ({ page, context }) => {
  await mockAuth(context); await pin(page)
  await openLogin(page)
  const link = page.getByRole('button', { name: 'Forgot password?' })
  await expect(link).toBeVisible()
  // It sits after the password field in reading/tab order.
  const order = await page.evaluate(() => {
    const pw = document.querySelector('input[type="password"]')!
    const lk = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Forgot password?')!
    return !!(pw.compareDocumentPosition(lk) & Node.DOCUMENT_POSITION_FOLLOWING)
  })
  expect(order).toBe(true)
  await link.click()
  await expect(page.getByRole('heading', { name: 'Forgot password' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeFocused()
})

test('requesting a link: same generic, announced answer; only the e-mail is sent', async ({ page, context }) => {
  const calls = await mockAuth(context); await pin(page)
  await openLogin(page)
  await page.getByRole('button', { name: 'Forgot password?' }).click()
  await page.getByLabel('Email').fill('someone@example.test')
  await page.getByRole('button', { name: 'Send the link' }).click()
  const status = page.getByRole('status').filter({ hasText: 'If an account exists' })
  await expect(status).toBeVisible()
  expect(calls.forgot).toEqual([{ email: 'someone@example.test' }])
  await page.getByRole('button', { name: 'Back to sign in' }).click()
  await expect(page.getByRole('button', { name: 'Forgot password?' })).toBeVisible()
})

test('opening the link: token leaves the address bar at once and is only sent in the reset POST', async ({ page, context }) => {
  const calls = await mockAuth(context); await pin(page)
  await page.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('planii.token', 'token-alice') } })
  await page.goto(`/reset-password?token=${TOKEN}`)
  await expect(page.getByRole('heading', { name: 'New password' }).first()).toBeVisible()
  await expect(page).toHaveURL(/\/reset-password$/)
  expect(page.url()).not.toContain('SECRET')
  expect(await page.evaluate(() => history.length)).toBeGreaterThan(0)

  await page.getByLabel('New password', { exact: true }).fill('nouveau-mdp-123')
  await page.getByLabel('Confirm password').fill('nouveau-mdp-123')
  await page.getByRole('button', { name: 'Save' }).click()

  await expect.poll(() => calls.reset.length).toBe(1)
  expect(calls.reset[0]).toEqual({ token: TOKEN, password: 'nouveau-mdp-123' })
  // Success: back to sign-in, any previous local session purged.
  await expect(page.getByRole('button', { name: 'Forgot password?' })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('planii.token'))).toBeNull()
  // The token never appears in any URL (page, subresources, API calls) — only in the POST body.
  expect(calls.urls.filter((u) => u.includes('SECRET'))).toEqual([])
  expect(page.url()).not.toContain('SECRET')
  // …nor in the Referer of the files the page loads right after the link is opened.
  expect(calls.leaks).toEqual([])
})

test('too short or mismatched passwords are caught before any request, with an announced message', async ({ page, context }) => {
  const calls = await mockAuth(context); await pin(page)
  await page.goto(`/reset-password?token=${TOKEN}`)
  const pw = page.getByLabel('New password', { exact: true })
  await expect(pw).toBeFocused()
  await expect(pw).toHaveAccessibleDescription('At least 8 characters.')

  await pw.fill('short'); await page.getByLabel('Confirm password').fill('short')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'At least 8 characters.' })).toBeVisible()

  await pw.fill('long-enough-1'); await page.getByLabel('Confirm password').fill('different-two')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'do not match' })).toBeVisible()
  await expect(pw).toHaveAttribute('aria-invalid', 'true')
  expect(calls.reset).toEqual([])
})

test('Enter submits from the keyboard', async ({ page, context }) => {
  const calls = await mockAuth(context); await pin(page)
  await page.goto(`/reset-password?token=${TOKEN}`)
  await page.getByLabel('New password', { exact: true }).fill('clavier-seul-1')
  await page.keyboard.press('Tab')
  await page.keyboard.type('clavier-seul-1')
  await page.keyboard.press('Enter')
  await expect.poll(() => calls.reset.length).toBe(1)
})

for (const [name, status, body] of [
  ['expired or already used link (replay)', 400, { error: 'Lien invalide ou expiré' }],
  ['unknown link', 400, { error: 'Lien invalide ou expiré' }],
] as const) {
  test(`${name}: dedicated message with a way to request a new link`, async ({ page, context }) => {
    const calls = await mockAuth(context, { status, body }); await pin(page)
    await page.goto(`/reset-password?token=${TOKEN}`)
    await page.getByLabel('New password', { exact: true }).fill('nouveau-mdp-123')
    await page.getByLabel('Confirm password').fill('nouveau-mdp-123')
    await page.getByRole('button', { name: 'Save' }).click()
    const alert = page.getByRole('alert').filter({ hasText: 'no longer valid' })
    await expect(alert).toBeVisible()
    await expect(page.getByLabel('New password', { exact: true })).toHaveCount(0) // the form is gone: no dead end
    const again = page.getByRole('button', { name: 'Request a new link' })
    await expect(again).toBeFocused()
    expect(calls.reset).toHaveLength(1)
    await again.click()
    await expect(page.getByRole('heading', { name: 'Forgot password' })).toBeVisible()
  })
}

test('a link opened without token (or after a reload) offers a new link instead of an empty form', async ({ page, context }) => {
  await mockAuth(context); await pin(page)
  await page.goto('/reset-password')
  await expect(page.getByRole('alert').filter({ hasText: 'no longer valid' })).toBeVisible()
  await page.getByRole('button', { name: 'Request a new link' }).click()
  await expect(page.getByLabel('Email')).toBeFocused()

  // Reload after the token was stripped from the URL: same safe state.
  await page.goto(`/reset-password?token=${TOKEN}`)
  await expect(page).toHaveURL(/\/reset-password$/)
  await page.reload()
  await expect(page.getByRole('alert').filter({ hasText: 'no longer valid' })).toBeVisible()
})

test('a server-side failure keeps the form so the user can retry', async ({ page, context }) => {
  const calls = await mockAuth(context, { status: 500, body: { error: 'Erreur serveur' } }); await pin(page)
  await page.goto(`/reset-password?token=${TOKEN}`)
  await page.getByLabel('New password', { exact: true }).fill('nouveau-mdp-123')
  await page.getByLabel('Confirm password').fill('nouveau-mdp-123')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect.poll(() => calls.reset.length).toBe(1)
  await expect(page.getByLabel('New password', { exact: true })).toBeVisible()
})

for (const scheme of ['light', 'dark'] as const) {
  test(`axe: forgot, reset form and invalid-link states (${scheme})`, async ({ page, context }) => {
    await mockAuth(context, { status: 400, body: { error: 'Lien invalide ou expiré' } }); await pin(page, scheme)
    await page.emulateMedia({ colorScheme: scheme })
    await openLogin(page)
    await axe(page, 'login ' + scheme)
    await page.getByRole('button', { name: 'Forgot password?' }).click()
    await axe(page, 'forgot ' + scheme)
    await page.getByLabel('Email').fill('someone@example.test')
    await page.getByRole('button', { name: 'Send the link' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'If an account exists' })).toBeVisible()
    await axe(page, 'forgot sent ' + scheme)

    await page.goto(`/reset-password?token=${TOKEN}`)
    await expect(page.getByLabel('New password', { exact: true })).toBeVisible()
    await axe(page, 'reset form ' + scheme)
    await page.getByLabel('New password', { exact: true }).fill('abc')
    await page.getByLabel('Confirm password').fill('abc')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await axe(page, 'reset error ' + scheme)
    await page.getByLabel('New password', { exact: true }).fill('nouveau-mdp-123')
    await page.getByLabel('Confirm password').fill('nouveau-mdp-123')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('button', { name: 'Request a new link' })).toBeVisible()
    await axe(page, 'invalid link ' + scheme)
  })
}
