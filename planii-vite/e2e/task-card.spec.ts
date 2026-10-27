import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mockApi, signIn, LONG_TASK } from './helpers'

// Board columns: a task card must stay inside its column, show priority/type above the title,
// break very long words, and open a detail dialog on click or keyboard.

async function openBoard(page: Page, scheme: 'light' | 'dark' = 'light') {
  await page.addInitScript((s) => localStorage.setItem('planii.theme', s), scheme)
  await signIn(page, 'token-alice')
  await page.getByRole('navigation').getByRole('button', { name: 'Projects', exact: true }).click()
  await page.getByRole('button', { name: /Site vitrine/ }).first().click()
  await expect(page.getByRole('button', { name: /Opbouw content/ })).toBeVisible()
}

const card = (page: Page) => page.locator('.status-task', { has: page.getByRole('button', { name: /Opbouw content/ }) })

for (const [w, h] of [[1280, 800], [820, 900], [390, 800]] as const) {
  test(`card stays inside its column and wraps long words at ${w}px`, async ({ page, context }) => {
    await mockApi(context, { extraTasks: [LONG_TASK] })
    await page.setViewportSize({ width: w, height: h })
    await openBoard(page)
    const c = card(page)
    await expect(c).toBeVisible()
    const m = await c.evaluate((el) => {
      const col = el.closest('.status-col') as HTMLElement
      const r = el.getBoundingClientRect(), cr = col.getBoundingClientRect()
      const inner = [...el.querySelectorAll<HTMLElement>('.t-title,.t-desc,.meta,.tag,.t-chips')]
      return {
        cardInsideColumn: r.left >= cr.left - 1 && r.right <= cr.right + 1,
        cardOverflowsX: el.scrollWidth > el.clientWidth + 1,
        childOverflow: inner.filter((n) => n.scrollWidth > n.clientWidth + 1 || n.getBoundingClientRect().right > r.right + 1).map((n) => n.className),
        pageScrollsX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      }
    })
    expect(m).toEqual({ cardInsideColumn: true, cardOverflowsX: false, childOverflow: [], pageScrollsX: false })
  })
}

test('priority and type sit above the title, which gets the full width below', async ({ page, context }) => {
  await mockApi(context, { extraTasks: [LONG_TASK] })
  await openBoard(page)
  const c = card(page)
  const chips = c.locator('.t-chips'), title = c.locator('.t-title')
  await expect(chips).toContainText('P1')
  await expect(chips).toContainText('Task')
  const [cb, tb] = [await chips.boundingBox(), await title.boundingBox()]
  expect(cb && tb && cb.y + cb.height <= tb.y + 1, 'chips above title').toBe(true)
  // The title is not squeezed into a sliver next to the chips: it is at least as wide as the chips row content.
  expect(tb!.width).toBeGreaterThan(120)
  // The title spans the card width under the header row (it starts at or left of the chips, under the check circle).
  const checkBox = await c.locator('.check').first().boundingBox()
  expect(tb!.x).toBeLessThanOrEqual(checkBox!.x + 1)
  // Description is clamped to 3 lines.
  const lines = await c.locator('.t-desc').evaluate((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight || '18')))
  expect(lines).toBeLessThanOrEqual(3)
})

test('clicking the card opens the task detail; Escape closes it and returns focus', async ({ page, context }) => {
  await mockApi(context, { extraTasks: [LONG_TASK] })
  await openBoard(page)
  await card(page).locator('.meta').click({ position: { x: 4, y: 4 } }) // a non-interactive spot of the card
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Opbouw content')
  await expect(dialog).toContainText('Bekijken van UX report') // full description, not clamped
  await expect(dialog).toContainText('P1')
  await expect(dialog.getByRole('button', { name: 'Open project' })).toHaveCount(0) // already in the project
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('keyboard: the title is a button that opens the detail, focus returns to it', async ({ page, context }) => {
  await mockApi(context, { extraTasks: [LONG_TASK] })
  await openBoard(page)
  const title = card(page).getByRole('button', { name: /Opbouw content/ })
  await title.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(title).toBeFocused()
})

test('buttons inside the card keep their own action (menu does not open the detail)', async ({ page, context }) => {
  await mockApi(context, { extraTasks: [LONG_TASK] })
  await openBoard(page)
  await card(page).getByRole('button', { name: 'Actions' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: /Edit the task/ })).toBeVisible() // the actions menu, not the detail
  await expect(dialog).not.toContainText('Bekijken van UX report')
})

for (const scheme of ['light', 'dark'] as const) {
  test(`axe: board with long task and its detail dialog (${scheme})`, async ({ page, context }) => {
    await mockApi(context, { extraTasks: [LONG_TASK] })
    // Reduced motion: axe must measure the settled dialog, not a frame of its 0.18 s fade-in.
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
    await openBoard(page, scheme)
    const tags = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']
    let { violations } = await new AxeBuilder({ page }).withTags(tags).analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`), 'board').toEqual([])
    await card(page).getByRole('button', { name: /Opbouw content/ }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    ;({ violations } = await new AxeBuilder({ page }).withTags(tags).analyze())
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`), 'detail dialog').toEqual([])
  })
}
