import { test, expect, type Page } from '@playwright/test'
import { mockApi, signIn } from './helpers'

// PLANI-002: the service worker must never keep account data, so nothing from a previous
// account can reappear after logout, an account switch, or while offline.

/** Everything stored by the service worker, as text, keyed by cache name. */
async function dumpCaches(page: Page): Promise<Record<string, string[]>> {
  return page.evaluate(async () => {
    const out: Record<string, string[]> = {}
    for (const name of await caches.keys()) {
      const cache = await caches.open(name)
      const items: string[] = []
      for (const req of await cache.keys()) {
        const res = await cache.match(req)
        items.push(req.url + ' ' + (name.startsWith('workbox-precache') ? '' : await res!.clone().text()))
      }
      out[name] = items
    }
    return out
  })
}

const runtimeCaches = (all: Record<string, string[]>) => Object.keys(all).filter((n) => !n.startsWith('workbox-precache'))

test('service worker precaches the shell only and drops the legacy planii-api cache', async ({ page, context }) => {
  await mockApi(context)
  await page.goto('/')
  // Seed the cache an older release would have left behind, then let the new worker activate.
  await page.evaluate(async () => {
    const c = await caches.open('planii-api')
    await c.put('https://api.planii.app/api/me', new Response(JSON.stringify({ user: { firstName: 'Legacy' } })))
  })
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready
    await reg.update()
  })
  await page.reload()
  await page.evaluate(() => navigator.serviceWorker.ready)
  await expect.poll(async () => runtimeCaches(await dumpCaches(page))).toEqual([])
  expect(Object.keys(await dumpCaches(page)).some((n) => n.startsWith('workbox-precache'))).toBe(true)
})

test('two accounts on one browser: no private data in Cache Storage, none offline after account switch', async ({ page, context }) => {
  await mockApi(context)
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)

  await signIn(page, 'token-alice')
  await page.getByRole('button', { name: 'Profile' }).click()
  await expect(page.getByText('alice@example.test').first()).toBeVisible()
  let dump = JSON.stringify(await dumpCaches(page))
  expect(dump).not.toContain('alice@example.test')
  expect(runtimeCaches(await dumpCaches(page))).toEqual([])

  // Account switch: real logout for Alice, sign in as Bob, go offline.
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('planii.token'))).toBeNull()
  await signIn(page, 'token-bob')
  await page.getByRole('button', { name: 'Profile' }).click()
  await expect(page.getByText('bob@example.test').first()).toBeVisible()
  await context.setOffline(true)
  await page.reload()
  await page.getByRole('button', { name: 'Profile' }).click()
  await expect(page.getByText('bob@example.test').first()).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/Alice|alice@/)
  dump = JSON.stringify(await dumpCaches(page))
  expect(dump).not.toContain('alice@example.test')
  expect(dump).not.toContain('bob@example.test')

  // Offline with no session: the installable shell still loads, with no account data.
  await page.evaluate(() => localStorage.removeItem('planii.token'))
  await page.reload()
  await expect(page.locator('#root')).not.toBeEmpty()
  await expect(page.locator('body')).not.toContainText(/Alice|Bob/)
})
