import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mockApi, signIn, LONG_TASK } from './helpers'

// Project page (tasks tab): a task must stay inside its row / card, show priority and type above the
// title on a card, break very long words, and open the "edit the task" dialog on click or keyboard.

async function openProject(page: Page, scheme: 'light' | 'dark' = 'light', view?: 'Columns' | 'Grid') {
  await page.addInitScript((s) => localStorage.setItem('planii.theme', s), scheme)
  await signIn(page, 'token-alice')
  await page.getByRole('navigation').getByRole('button', { name: 'Projects', exact: true }).click()
  await page.getByRole('button', { name: /Site vitrine/ }).first().click()
  if (view) await page.getByRole('group', { name: 'Task view' }).getByRole('button', { name: view }).click()
  await expect(page.getByRole('button', { name: /Opbouw content/ })).toBeVisible()
}

const row = (page: Page) => page.locator('.pv-row', { has: page.getByRole('button', { name: /Opbouw content/ }) })
const card = (page: Page) => page.locator('.pv-kc', { has: page.getByRole('button', { name: /Opbouw content/ }) })

for (const [w, h] of [[1280, 800], [820, 900], [390, 800]] as const) {
  test(`table row stays inside the page and wraps long words at ${w}px`, async ({ page, context }) => {
    await mockApi(context, { extraTasks: [LONG_TASK] })
    await page.setViewportSize({ width: w, height: h })
    await openProject(page)
    const r = row(page)
    await expect(r).toBeVisible()
    const m = await r.evaluate((el, w) => {
      const rect = el.getBoundingClientRect()
      const scroller = el.closest('.pv-tscroll') as HTMLElement
      const title = el.querySelector<HTMLElement>('.pv-ttl .t')!
      return {
        // on a phone the row is a card: it must fit the screen; on desktop the table scrolls inside its own box
        fitsScreen: w > 900 ? true : rect.left >= 0 && rect.right <= window.innerWidth + 1,
        titleOverflows: title.scrollWidth > title.clientWidth + 1,
        scrollerOnly: w > 900 ? scroller.scrollWidth >= scroller.clientWidth : true,
        pageScrollsX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      }
    }, w)
    expect(m).toEqual({ fitsScreen: true, titleOverflows: false, scrollerOnly: true, pageScrollsX: false })
  })
}

test('column card stays inside its column and wraps long words', async ({ page, context }) => {
  await mockApi(context, { extraTasks: [LONG_TASK] })
  await page.setViewportSize({ width: 1280, height: 800 })
  await openProject(page, 'light', 'Columns')
  const c = card(page)
  await expect(c).toBeVisible()
  const m = await c.evaluate((el) => {
    const col = el.closest('.pv-kcol') as HTMLElement
    const r = el.getBoundingClientRect(), cr = col.getBoundingClientRect()
    const inner = [...el.querySelectorAll<HTMLElement>('h3,.pv-kc-top,.pv-kc-foot')]
    return {
      cardInsideColumn: r.left >= cr.left - 1 && r.right <= cr.right + 1,
      cardOverflowsX: el.scrollWidth > el.clientWidth + 1,
      childOverflow: inner.filter((n) => n.scrollWidth > n.clientWidth + 1 || n.getBoundingClientRect().right > r.right + 1).map((n) => n.className || n.tagName),
      pageScrollsX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }
  })
  expect(m).toEqual({ cardInsideColumn: true, cardOverflowsX: false, childOverflow: [], pageScrollsX: false })
})

test('priority and type sit above the title on a column card', async ({ page, context }) => {
  await mockApi(context, { extraTasks: [LONG_TASK] })
  await openProject(page, 'light', 'Columns')
  const c = card(page)
  const chips = c.locator('.pv-kc-top'), title = c.locator('h3')
  await expect(chips).toContainText('P1')
  await expect(chips).toContainText('Task')
  const [cb, tb] = [await chips.boundingBox(), await title.boundingBox()]
  expect(cb && tb && cb.y + cb.height <= tb.y + 1, 'chips above title').toBe(true)
  expect(tb!.width).toBeGreaterThan(120)
})

test('clicking a task opens the edit dialog with its content; Escape closes it', async ({ page, context }) => {
  await mockApi(context, { extraTasks: [LONG_TASK] })
  await openProject(page)
  await row(page).locator('.pv-cell.c-who').click() // a non-interactive spot of the row
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Edit the task')
  await expect(dialog.getByLabel('Title')).toHaveValue(/Opbouw content/)
  await expect(dialog.getByLabel('Description')).toHaveValue(/Bekijken van UX report/) // full description, not clamped
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('keyboard: the title is a button that opens the dialog, focus returns to it', async ({ page, context }) => {
  await mockApi(context, { extraTasks: [LONG_TASK] })
  await openProject(page, 'light', 'Columns')
  const title = card(page).getByRole('button', { name: /Opbouw content/ })
  await title.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(title).toBeFocused()
})

test('buttons inside the card keep their own action (menu does not open the edit dialog)', async ({ page, context }) => {
  await mockApi(context, { extraTasks: [LONG_TASK] })
  await openProject(page, 'light', 'Columns')
  await card(page).getByRole('button', { name: 'Actions' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: /Edit the task/ })).toBeVisible() // the actions menu, not the edit dialog
  await expect(dialog.getByLabel('Title')).toHaveCount(0)
})

test('"New task" opens a dialog (not an inline form) with a photo / file drop zone', async ({ page, context }) => {
  await mockApi(context)
  await openProject(page).catch(() => undefined)
  await page.getByRole('button', { name: 'New task', exact: true }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Title')).toBeFocused()
  await expect(dialog.getByRole('button', { name: /Add a photo or a file/ })).toBeVisible()
  await dialog.getByRole('button', { name: 'Create task' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Give the task a title')
})

for (const scheme of ['light', 'dark'] as const) {
  test(`axe: columns board with long task and its edit dialog (${scheme})`, async ({ page, context }) => {
    await mockApi(context, { extraTasks: [LONG_TASK] })
    // Reduced motion: axe must measure the settled dialog, not a frame of its fade-in.
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
    await openProject(page, scheme, 'Columns')
    const tags = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']
    let { violations } = await new AxeBuilder({ page }).withTags(tags).analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`), 'board').toEqual([])
    await card(page).getByRole('button', { name: /Opbouw content/ }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    ;({ violations } = await new AxeBuilder({ page }).withTags(tags).analyze())
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`), 'edit dialog').toEqual([])
  })

  test(`axe: table view and new task dialog (${scheme})`, async ({ page, context }) => {
    await mockApi(context, { extraTasks: [LONG_TASK] })
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
    await openProject(page, scheme)
    const tags = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']
    let { violations } = await new AxeBuilder({ page }).withTags(tags).analyze()
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`), 'table').toEqual([])
    await page.getByRole('button', { name: 'New task', exact: true }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    ;({ violations } = await new AxeBuilder({ page }).withTags(tags).analyze())
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`), 'new task dialog').toEqual([])
  })
}
