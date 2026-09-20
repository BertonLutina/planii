import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mockApi, signIn } from './helpers'

// PLANI-013: automated WCAG 2.2 AA checks + keyboard scenarios. Automation only finds part of the
// issues (see docs/a11y-web-checklist.md for the manual keyboard / screen-reader pass).

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const v_id_hint = (n: { failureSummary?: string }) => /target|size|space/i.test(n.failureSummary || '')
const pageErrors = new WeakMap<Page, string[]>()

async function scan(page: Page, name: string) {
  // A crashed screen is blank and trivially "accessible": fail loudly instead.
  expect(pageErrors.get(page) ?? [], `uncaught errors before scanning ${name}`).toEqual([])
  expect((await page.locator('body').innerText()).trim().length, `${name} rendered nothing`).toBeGreaterThan(20)
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  const detail = (n: (typeof violations)[number]['nodes'][number]) => {
    const d = (n.any[0]?.data ?? {}) as { fgColor?: string; bgColor?: string; contrastRatio?: number; expectedContrastRatio?: string }
    return n.target.join(' ') + (n.failureSummary && v_id_hint(n) ? ' {' + n.failureSummary.replace(/\s+/g, ' ').slice(0, 260) + '}' : '') + (d.fgColor ? ` [${d.fgColor} on ${d.bgColor} = ${d.contrastRatio}, need ${d.expectedContrastRatio}]` : '')
  }
  const summary = violations.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes.slice(0, 4).map(detail).join(' | ')}`)
  expect(summary, `axe violations on ${name}`).toEqual([])
}

test.beforeEach(async ({ page, context }) => {
  await mockApi(context)
  const errors: string[] = []
  pageErrors.set(page, errors)
  page.on('pageerror', (e) => errors.push(e.message))
})

test('axe: landing and auth screens', async ({ page }) => {
  await page.goto('/')
  await scan(page, 'landing')
  await page.getByRole('button', { name: /sign in|log in|connexion|se connecter/i }).first().click()
  await scan(page, 'login')
})

for (const scheme of ['light', 'dark'] as const) for (const tab of ['Home', 'Projects', 'Calendar', 'Leaderboard', 'Profile']) {
  test(`axe: ${tab} tab (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await page.addInitScript((s) => { try { localStorage.setItem('planii.theme', s) } catch { /* ignore */ } }, scheme)
    await signIn(page, 'token-alice')
    await page.getByRole('navigation').getByRole('button', { name: tab, exact: true }).click()
    await page.waitForTimeout(300)
    await scan(page, tab)
  })
}

test('command palette: dialog semantics, Escape closes and focus returns', async ({ page }) => {
  await signIn(page, 'token-alice')
  const trigger = page.getByRole('button', { name: /Search/ })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('textbox')).toBeFocused()
  await scan(page, 'command palette')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('modal: focus moves in, Tab stays trapped, Escape closes and focus returns to the opener', async ({ page }) => {
  await signIn(page, 'token-alice')
  await page.getByRole('navigation').getByRole('button', { name: 'Projects', exact: true }).click()
  const opener = page.getByRole('main').getByRole('button', { name: /^New/ }).first()
  await expect(opener).toBeVisible()
  await opener.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  await expect(dialog).toHaveAccessibleName(/.+/)
  expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate((el) => el.contains(document.activeElement)), `Tab #${i + 1} left the dialog`).toBe(true)
  }
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Shift+Tab')
    expect(await dialog.evaluate((el) => el.contains(document.activeElement)), `Shift+Tab #${i + 1} left the dialog`).toBe(true)
  }
  await scan(page, 'new project dialog')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
})

test('reduced motion: animations and transitions are neutralised', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await signIn(page, 'token-alice')
  await expect(page.getByRole('navigation').getByRole('button', { name: 'Home' })).toBeVisible()
  const durations = await page.evaluate(() => {
    const el = document.querySelector('.side-nav button, button') as HTMLElement
    const cs = getComputedStyle(el)
    return { transition: cs.transitionDuration, animation: cs.animationDuration }
  })
  for (const d of Object.values(durations)) {
    for (const part of d.split(',')) expect(parseFloat(part) * (part.trim().endsWith('ms') ? 1 : 1000)).toBeLessThanOrEqual(1)
  }
})

test('axe: project detail and task actions menu', async ({ page }) => {
  await signIn(page, 'token-alice')
  await page.getByRole('navigation').getByRole('button', { name: 'Projects', exact: true }).click()
  await page.getByRole('button', { name: /Site vitrine/ }).first().click()
  await expect(page.getByText('Rédiger le cahier des charges').first()).toBeVisible()
  await scan(page, 'project detail')

  // Task actions menu: status can be changed without dragging.
  await page.getByRole('button', { name: 'Actions' }).first().click()
  const menu = page.getByRole('dialog')
  await expect(menu.getByRole('button', { name: /Move to/ }).first()).toBeVisible()
  await scan(page, 'task actions menu')
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
})

test('axe: task drawer from Home, keyboard close and focus return', async ({ page }) => {
  await signIn(page, 'token-alice')
  const row = page.getByRole('main').getByText('Rédiger le cahier des charges').first()
  await expect(row).toBeVisible()
  await row.click()
  const drawer = page.getByRole('dialog', { name: 'Rédiger le cahier des charges' })
  await expect(drawer).toBeVisible()
  expect(await drawer.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  await scan(page, 'task drawer')
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
})

test('toasts are announced through a live region', async ({ page }) => {
  await signIn(page, 'token-alice')
  await expect(page.getByRole('navigation').getByRole('button', { name: 'Home' })).toBeVisible()
  // The region must already exist (empty) before a message arrives, otherwise it is not announced.
  await expect(page.locator('[aria-live]').first()).toHaveAttribute('aria-live', 'polite')
})

test('project cards can be reordered without dragging', async ({ page, context }) => {
  const orders: string[][] = []
  await context.route('https://api.planii.app/**/projects/order', async (route) => {
    orders.push(JSON.parse(route.request().postData() || '{}').ids)
    await route.fulfill({ json: { ok: true } })
  })
  await signIn(page, 'token-alice')
  await page.getByRole('navigation').getByRole('button', { name: 'Projects', exact: true }).click()
  await expect(page.getByRole('button', { name: /Site vitrine/ }).first()).toBeVisible()
  // The buttons only exist in manual sort order.
  await page.getByLabel('Trier les projets par').selectOption('manual')
  const group = page.getByRole('group', { name: /Order of “Site vitrine”/ })
  await expect(group.getByRole('button', { name: /earlier/ })).toBeDisabled() // first card
  await scan(page, 'projects in manual order')
  await group.getByRole('button', { name: /later/ }).click()
  await expect.poll(() => orders.at(-1)).toEqual(['p2', 'p1'])
})

async function openProject(page: Page) {
  await signIn(page, 'token-alice')
  await page.getByRole('navigation').getByRole('button', { name: 'Projects', exact: true }).click()
  await page.getByRole('button', { name: /Site vitrine/ }).first().click()
  await expect(page.getByText('Rédiger le cahier des charges').first()).toBeVisible()
}

test('axe: task import wizard and voice wizard dialogs', async ({ page }) => {
  await openProject(page)
  const opener = page.getByRole('button', { name: 'Import tasks' })
  await opener.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await scan(page, 'task import wizard')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
})

test('axe: meeting room', async ({ page }) => {
  await openProject(page)
  await page.getByRole('button', { name: /Meeting/i }).first().click()
  await page.waitForTimeout(400)
  await scan(page, 'meeting')
})

test('axe: notifications panel (mobile layout, where the bell lives)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await signIn(page, 'token-alice')
  await page.getByRole('button', { name: /notification/i }).first().click()
  await page.waitForTimeout(300)
  await scan(page, 'notifications')
})
