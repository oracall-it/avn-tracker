import { test, expect } from '@playwright/test'
import { createTestLink, cleanupE2ELinks } from './helpers'

const TAB = '[aria-label="Open saved links"]'
const DRAWER = '[data-testid="links-drawer"]'
const LIST = '[data-testid="link-list"]'

test.describe('Links drawer', () => {
  test.beforeEach(async ({ request }) => {
    await cleanupE2ELinks(request)
  })

  test.afterEach(async ({ request }) => {
    await cleanupE2ELinks(request)
  })

  // ── Floating tab ──────────────────────────────────────────────────────────

  test('floating tab is visible on library page', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator(TAB)).toBeVisible()
  })

  test('floating tab is visible on discover page', async ({ page }) => {
    await page.goto('/discover')
    await expect(page.locator(TAB)).toBeVisible()
  })

  test('floating tab is visible on settings page', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.locator(TAB)).toBeVisible()
  })

  // ── Open / close ──────────────────────────────────────────────────────────

  test('clicking tab opens drawer', async ({ page }) => {
    await page.goto('/')
    await page.locator(TAB).click()
    await expect(page.locator(DRAWER).getByText('Saved Lists')).toBeVisible()
    // Tab uses visibility:hidden when drawer is open — Playwright detects it.
    await expect(page.locator(TAB)).not.toBeVisible()
  })

  test('close button dismisses drawer', async ({ page }) => {
    await page.goto('/')
    await page.locator(TAB).click()
    await expect(page.locator(DRAWER).getByText('Saved Lists')).toBeVisible()
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.locator(TAB)).toBeVisible()
  })

  test('Escape key closes drawer', async ({ page }) => {
    await page.goto('/')
    await page.locator(TAB).click()
    await expect(page.locator(DRAWER).getByText('Saved Lists')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator(TAB)).toBeVisible()
  })

  test('clicking backdrop closes drawer', async ({ page }) => {
    await page.goto('/')
    await page.locator(TAB).click()
    await expect(page.locator(DRAWER).getByText('Saved Lists')).toBeVisible()
    await page.mouse.click(100, 100)
    await expect(page.locator(TAB)).toBeVisible()
  })

  // ── Add ───────────────────────────────────────────────────────────────────

  test('add form appears on button click', async ({ page }) => {
    await page.goto('/')
    await page.locator(TAB).click()
    await page.locator(DRAWER).getByRole('button', { name: 'Add new link' }).click()
    await expect(page.locator(DRAWER).getByPlaceholder('Paste URL…')).toBeVisible()
    await expect(page.locator(DRAWER).locator('input[placeholder="Title"]')).toBeVisible()
  })

  test('can add a link manually', async ({ page }) => {
    await page.goto('/')
    await page.locator(TAB).click()
    await page.locator(DRAWER).getByRole('button', { name: 'Add new link' }).click()

    const urlInput = page.locator(DRAWER).getByPlaceholder('Paste URL…')
    await urlInput.fill('https://example.com')
    // Tab away to trigger onBlur → fetchTitle; input disables during fetch.
    await urlInput.press('Tab')
    // Wait for title input to re-enable (fetch done, regardless of result).
    const titleInput = page.locator(DRAWER).locator('input[placeholder="Title"]')
    await expect(titleInput).toBeEnabled({ timeout: 15000 })
    await titleInput.fill('[E2E] My Test List')
    await page.locator(DRAWER).getByRole('button', { name: 'Save' }).click()

    await expect(page.locator(DRAWER).getByText('[E2E] My Test List')).toBeVisible()
  })

  test('cancel add hides the form', async ({ page }) => {
    await page.goto('/')
    await page.locator(TAB).click()
    await page.locator(DRAWER).getByRole('button', { name: 'Add new link' }).click()
    await expect(page.locator(DRAWER).getByPlaceholder('Paste URL…')).toBeVisible()

    await page.locator(DRAWER).getByRole('button', { name: 'Cancel' }).click()
    await expect(page.locator(DRAWER).getByPlaceholder('Paste URL…')).not.toBeVisible()
    await expect(page.locator(DRAWER).getByRole('button', { name: 'Add new link' })).toBeVisible()
  })

  test('Save button disabled until both fields filled', async ({ page }) => {
    await page.goto('/')
    await page.locator(TAB).click()
    await page.locator(DRAWER).getByRole('button', { name: 'Add new link' }).click()

    const save = page.locator(DRAWER).getByRole('button', { name: 'Save' })
    await expect(save).toBeDisabled()

    await page.locator(DRAWER).getByPlaceholder('Paste URL…').fill('https://example.com')
    await expect(save).toBeDisabled()

    await page.locator(DRAWER).locator('input[placeholder="Title"]').fill('[E2E] A title')
    await expect(save).toBeEnabled()
  })

  // ── List interactions ─────────────────────────────────────────────────────

  test('saved link renders as clickable anchor', async ({ page, request }) => {
    await createTestLink(request, '[E2E] Anchor Test', 'https://example.com')
    await page.goto('/')
    await page.locator(TAB).click()
    const link = page.locator(DRAWER).getByRole('link', { name: '[E2E] Anchor Test' })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', 'https://example.com')
  })

  test('can edit a link title', async ({ page, request }) => {
    await createTestLink(request, '[E2E] Original Title')
    await page.goto('/')
    await page.locator(TAB).click()
    await expect(page.locator(DRAWER).getByText('[E2E] Original Title')).toBeVisible()

    // Scope Edit button to the specific link row to avoid ambiguity with other links.
    const row = page.locator(`${LIST} > div`).filter({ hasText: '[E2E] Original Title' })
    await row.getByRole('button', { name: 'Edit' }).click()

    // After Edit is clicked the row's visible text changes to an input — hasText no longer
    // matches, so find the edit input in the drawer scope (excluding the search input).
    const editInput = page.locator(DRAWER).locator('input[type="text"]:not([placeholder="Search links…"])')
    await editInput.clear()
    await editInput.fill('[E2E] Updated Title')
    await page.locator(DRAWER).getByRole('button', { name: 'Save' }).click()

    await expect(page.locator(DRAWER).getByText('[E2E] Updated Title')).toBeVisible()
    await expect(page.locator(DRAWER).getByText('[E2E] Original Title')).not.toBeVisible()
  })

  test('can delete a link', async ({ page, request }) => {
    await createTestLink(request, '[E2E] To Delete')
    await page.goto('/')
    await page.locator(TAB).click()
    await expect(page.locator(DRAWER).getByText('[E2E] To Delete')).toBeVisible()

    // Scope Delete button to the specific link row to avoid ambiguity with other links.
    const row = page.locator(`${LIST} > div`).filter({ hasText: '[E2E] To Delete' })
    await row.getByRole('button', { name: 'Delete' }).click()

    await expect(page.locator(DRAWER).getByText('[E2E] To Delete')).not.toBeVisible()
  })

  // ── Search ────────────────────────────────────────────────────────────────

  test('search filters visible links', async ({ page, request }) => {
    await createTestLink(request, '[E2E] Alpha List', 'https://example.com/alpha')
    await createTestLink(request, '[E2E] Beta List', 'https://example.com/beta')
    await page.goto('/')
    await page.locator(TAB).click()
    await expect(page.locator(DRAWER).getByText('[E2E] Alpha List')).toBeVisible()
    await expect(page.locator(DRAWER).getByText('[E2E] Beta List')).toBeVisible()

    await page.locator(DRAWER).getByPlaceholder('Search links…').fill('Alpha')
    await expect(page.locator(DRAWER).getByText('[E2E] Alpha List')).toBeVisible()
    await expect(page.locator(DRAWER).getByText('[E2E] Beta List')).not.toBeVisible()
  })

  test('search with no match shows empty state', async ({ page, request }) => {
    await createTestLink(request, '[E2E] Some Link')
    await page.goto('/')
    await page.locator(TAB).click()
    await page.locator(DRAWER).getByPlaceholder('Search links…').fill('zzz-no-match')
    await expect(page.locator(DRAWER).getByText('No links match your search.')).toBeVisible()
  })

  // ── Open all ──────────────────────────────────────────────────────────────

  test('"Open all" button visible when links exist', async ({ page, request }) => {
    await createTestLink(request, '[E2E] Open All Test')
    await page.goto('/')
    await page.locator(TAB).click()
    await expect(page.locator(DRAWER).getByRole('button', { name: /^Open all/ })).toBeVisible()
  })

  test('"Open all" aria-label includes link count', async ({ page, request }) => {
    await createTestLink(request, '[E2E] Link 1')
    await createTestLink(request, '[E2E] Link 2')
    await page.goto('/')
    await page.locator(TAB).click()
    // Filter to only the 2 E2E links so count is predictable regardless of real data in DB.
    await page.locator(DRAWER).getByPlaceholder('Search links…').fill('[E2E] Link')
    await expect(page.locator(DRAWER).getByRole('button', { name: 'Open all 2 links' })).toBeVisible()
  })
})
