import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mockApi } from './helpers'

// The language choice is a drop-down list (<select>), not a row of radio-like buttons.

test('login: language is a drop-down list, changes language and stays accessible', async ({ page, context }) => {
  await mockApi(context)
  await page.addInitScript(() => { try { localStorage.setItem('planii.theme', 'light') } catch { /* ignore */ } })
  await page.goto('/')
  await page.getByRole('button', { name: /se connecter|log in|sign in/i }).first().click().catch(() => {})

  const select = page.locator('select.lang-select')
  await expect(select).toBeVisible()
  await expect(select.locator('option')).toHaveCount(9)
  await expect(page.locator('.lang-seg')).toHaveCount(0)

  await select.selectOption('en')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(select).toHaveValue('en')

  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect(violations).toEqual([])
})
