import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mockApi, signIn } from './helpers'

// PLANI-030: Jitsi under the production CSP / Permissions-Policy of nginx.conf (served by
// e2e/serve-with-nginx-headers.mjs on :4174). The real Jitsi is stubbed: we test our own contract
// (what is contacted, when, and what the user sees when it fails), not Jitsi's UI.

test.use({ baseURL: 'http://localhost:4174', serviceWorkers: 'block' })

const STUB_API = `window.__jitsi = { handlers: {} };
window.JitsiMeetExternalAPI = class {
  constructor(domain, o) { this.f = document.createElement('iframe'); this.f.src = 'https://' + domain + '/' + o.roomName; o.parentNode.appendChild(this.f) }
  getIFrame() { return this.f }
  addListener(name, fn) { window.__jitsi.handlers[name] = fn }
  dispose() {}
}`

async function stubJitsi(context: BrowserContext, opts: { script?: 'ok' | 'fail' } = {}) {
  const requested: string[] = []
  await context.route('https://meet.jit.si/**', async (route) => {
    const url = route.request().url()
    requested.push(url)
    if (url.endsWith('/external_api.js')) {
      if (opts.script === 'fail') return route.abort('failed')
      return route.fulfill({ contentType: 'application/javascript', body: STUB_API })
    }
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>stub meeting</title><p>meeting</p>' })
  })
  return requested
}

async function trackViolations(page: Page) {
  await page.addInitScript(() => {
    ;(window as any).__csp = []
    document.addEventListener('securitypolicyviolation', (e) => (window as any).__csp.push(`${e.violatedDirective} ${e.blockedURI}`))
  })
}
const violations = (page: Page) => page.evaluate(() => (window as any).__csp as string[])

async function openMeeting(page: Page) {
  await signIn(page, 'token-alice')
  await page.getByRole('navigation').getByRole('button', { name: 'Projects', exact: true }).click()
  await page.getByRole('button', { name: /Site vitrine/ }).first().click()
  await expect(page.getByText('Rédiger le cahier des charges').first()).toBeVisible()
  await page.getByRole('button', { name: /Meeting/i }).first().click()
}

test('served headers: restrictive CSP with only meet.jit.si opened, permissions delegated to it', async ({ request }) => {
  const res = await request.get('/')
  const csp = res.headers()['content-security-policy']
  const pp = res.headers()['permissions-policy']
  expect(csp).toContain("script-src 'self' https://meet.jit.si;")
  expect(csp).toContain('frame-src https://meet.jit.si;')
  expect(csp).toContain("default-src 'self'")
  expect(csp).not.toContain('*')
  expect(csp).not.toContain('unsafe-eval')
  expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/)
  expect(pp).toContain('camera=("https://meet.jit.si")')
  expect(pp).toContain('microphone=(self "https://meet.jit.si")')
  expect(pp).not.toMatch(/camera=\([^)]*\bself\b/) // the app itself never uses the camera
  expect(pp).toContain('geolocation=()')
})

test('nothing is sent to Jitsi before the user asks; then script and frame load without CSP violations', async ({ page, context }) => {
  await mockApi(context)
  const requested = await stubJitsi(context)
  await trackViolations(page)
  await openMeeting(page)

  const gate = page.getByRole('region', { name: /Video meeting by Jitsi Meet/ })
  await expect(gate).toBeVisible()
  await expect(gate).toContainText('meet.jit.si')
  await expect(gate.getByRole('link', { name: /privacy/i })).toHaveAttribute('href', '/privacy')
  await expect(gate.getByRole('button', { name: 'Join the meeting' })).toBeFocused()
  expect(requested, 'no request to the provider before consent').toEqual([])

  await gate.getByRole('button', { name: 'Join the meeting' }).click()
  const frame = page.locator('#jitsi-container iframe')
  await expect(frame).toHaveAttribute('src', 'https://meet.jit.si/planii-p1')
  await expect(frame).toHaveAttribute('title', 'Meeting')
  await expect(page.frameLocator('#jitsi-container iframe').getByText('meeting')).toBeVisible()
  expect(requested.some((u) => u.endsWith('/external_api.js'))).toBe(true)
  expect(await violations(page)).toEqual([])

  // Leaving cleanly returns to the project without leftovers.
  await page.getByRole('button', { name: /Leave|Quit|Quitter/i }).first().click()
  await expect(page.locator('#jitsi-container')).toHaveCount(0)
})

test('other origins stay blocked: no wildcard, other scripts and frames violate the CSP', async ({ page, context }) => {
  await mockApi(context)
  await context.route('https://example.com/**', (route) => route.fulfill({ contentType: 'application/javascript', body: 'window.__leak = true' }))
  await trackViolations(page)
  await signIn(page, 'token-alice')
  await page.evaluate(() => {
    const s = document.createElement('script'); s.src = 'https://example.com/x.js'; document.body.appendChild(s)
    const f = document.createElement('iframe'); f.src = 'https://example.com/'; document.body.appendChild(f)
  })
  await expect.poll(() => violations(page)).toEqual(expect.arrayContaining([expect.stringContaining('script-src'), expect.stringContaining('frame-src')]))
  expect(await page.evaluate(() => (window as any).__leak)).toBeUndefined()
})

test('provider down or blocked: accessible translated error, focus on retry, retry recovers', async ({ page, context }) => {
  await mockApi(context)
  await stubJitsi(context, { script: 'fail' })
  await openMeeting(page)
  await page.getByRole('button', { name: 'Join the meeting' }).click()

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('could not start')
  await expect(alert).toContainText('meet.jit.si')
  await expect(alert.getByRole('button', { name: 'Try again' })).toBeFocused()
  const { violations: v } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect(v.map((x) => x.id)).toEqual([])

  await context.unroute('https://meet.jit.si/**')
  await stubJitsi(context)
  await alert.getByRole('button', { name: 'Try again' }).click()
  await expect(page.locator('#jitsi-container iframe')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('camera / microphone refusal is announced without breaking the meeting', async ({ page, context }) => {
  await mockApi(context)
  await stubJitsi(context)
  await openMeeting(page)
  await page.getByRole('button', { name: 'Join the meeting' }).click()
  await expect(page.locator('#jitsi-container iframe')).toBeVisible()
  await page.evaluate(() => (window as any).__jitsi.handlers.cameraError())
  await expect(page.getByRole('status').filter({ hasText: 'camera' })).toBeVisible()
  await page.evaluate(() => (window as any).__jitsi.handlers.micError())
  await expect(page.getByRole('status').filter({ hasText: 'microphone' })).toBeVisible()
  await expect(page.locator('#jitsi-container iframe')).toBeVisible()
})

test('consent screen passes axe in light and dark', async ({ page, context }) => {
  await mockApi(context)
  await stubJitsi(context)
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme })
    await page.addInitScript((s) => localStorage.setItem('planii.theme', s), scheme)
    await openMeeting(page)
    await expect(page.getByRole('region', { name: /Video meeting/ })).toBeVisible()
    const { violations: v } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
    expect(v.map((x) => `${x.id}: ${x.nodes[0]?.target}`), scheme).toEqual([])
  }
})
