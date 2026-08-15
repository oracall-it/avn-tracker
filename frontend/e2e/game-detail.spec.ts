import { test, expect } from '@playwright/test'
import { createTestGame, cleanupE2EGames } from './helpers'

const CARD = '[data-testid="game-card"]'

test.describe('Game Detail page', () => {
  test.beforeEach(async ({ request }) => {
    await cleanupE2EGames(request)
  })

  test.afterEach(async ({ request }) => {
    await cleanupE2EGames(request)
  })

  async function openDetail(page: Parameters<Parameters<typeof test>[1]>[0], title: string) {
    await page.locator(CARD).filter({ hasText: title }).getByRole('button', { name: title }).click()
    await expect(page).toHaveURL(/\/game\//)
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  test('clicking title on card navigates to detail page', async ({ page, request }) => {
    const game = await createTestGame(request)
    await page.goto('/')
    await openDetail(page, game.title)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(game.title)
  })

  test('back button returns to library', async ({ page, request }) => {
    const game = await createTestGame(request)
    await page.goto('/')
    await openDetail(page, game.title)
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page).toHaveURL('/')
  })

  test('nav bar is always visible on detail page', async ({ page, request }) => {
    const game = await createTestGame(request)
    await page.goto('/')
    await openDetail(page, game.title)
    await expect(page.getByRole('link', { name: 'Library' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Discover' })).toBeVisible()
  })

  // ── Fields ────────────────────────────────────────────────────────────────

  test('displays developer and versions', async ({ page, request }) => {
    const game = await createTestGame(request, {
      title: '[E2E] Detail Fields',
      developer: 'Field Studio',
      myVersion: '0.9.0',
      latestVersion: '1.0.0',
    })
    await page.goto('/')
    await openDetail(page, game.title)

    await expect(page.getByText('Field Studio')).toBeVisible()
    await expect(page.getByText('0.9.0')).toBeVisible()
    await expect(page.getByText('1.0.0').first()).toBeVisible()
  })

  test('shows notes when present', async ({ page, request }) => {
    const game = await createTestGame(request, { notes: 'My personal notes here' })
    await page.goto('/')
    await openDetail(page, game.title)
    await expect(page.getByText('My personal notes here')).toBeVisible()
  })

  test('shows update available section when versions differ', async ({ page, request }) => {
    const game = await createTestGame(request, { myVersion: '0.5.0', latestVersion: '1.0.0' })
    await page.goto('/')
    await openDetail(page, game.title)
    await expect(page.getByText('Update available')).toBeVisible()
    await expect(page.getByText(/New version available/)).toBeVisible()
  })

  test('no update section when versions match', async ({ page, request }) => {
    const game = await createTestGame(request, { myVersion: '1.0.0', latestVersion: '1.0.0' })
    await page.goto('/')
    await openDetail(page, game.title)
    await expect(page.getByText(/New version available/)).not.toBeVisible()
  })

  // ── Tags collapse ─────────────────────────────────────────────────────────

  test('tags collapse at 12 and expand on click', async ({ page, request }) => {
    const tags = Array.from({ length: 20 }, (_, i) => `Tag${i + 1}`)
    const game = await createTestGame(request, { tags, title: '[E2E] Tag Collapse' })
    await page.goto('/')
    await openDetail(page, game.title)

    await expect(page.getByRole('button', { name: /\+\d+ more/ })).toBeVisible()
    await page.getByRole('button', { name: /\+\d+ more/ }).click()
    await expect(page.getByRole('button', { name: 'Show less' })).toBeVisible()
    await expect(page.getByText('Tag20', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Show less' }).click()
    await expect(page.getByRole('button', { name: /\+\d+ more/ })).toBeVisible()
  })

  // ── Edit ──────────────────────────────────────────────────────────────────

  test('edit modal opens from detail page', async ({ page, request }) => {
    const game = await createTestGame(request)
    await page.goto('/')
    await openDetail(page, game.title)
    await page.getByTestId('edit-game-btn').click()
    await expect(page.getByRole('heading', { name: 'Edit Game' })).toBeVisible()
  })

  test('changing status via edit modal updates detail page', async ({ page, request }) => {
    const game = await createTestGame(request, { status: 'WANT' })
    await page.goto('/')
    await openDetail(page, game.title)
    await page.getByTestId('edit-game-btn').click()

    // Select the status dropdown (first select in the form).
    await page.locator('form select').first().selectOption('PLAYING')
    await page.getByRole('button', { name: 'Save Changes' }).click()

    await expect(page.getByText('Playing').first()).toBeVisible()
  })

  test('clearing notes via edit saves empty notes', async ({ page, request }) => {
    const game = await createTestGame(request, { notes: 'Notes to clear' })
    await page.goto('/')
    await openDetail(page, game.title)
    await expect(page.getByText('Notes to clear')).toBeVisible()

    await page.getByTestId('edit-game-btn').click()
    await page.getByPlaceholder(/Personal notes/).clear()
    await page.getByRole('button', { name: 'Save Changes' }).click()

    // Notes section should be gone (only renders when notes is non-empty).
    await expect(page.getByText('Notes to clear')).not.toBeVisible()
  })

  // ── Modal scroll lock ─────────────────────────────────────────────────────

  test('body scroll locked while edit modal is open', async ({ page, request }) => {
    const game = await createTestGame(request)
    await page.goto('/')
    await openDetail(page, game.title)

    await page.getByTestId('edit-game-btn').click()
    await expect(page.getByRole('heading', { name: 'Edit Game' })).toBeVisible()

    const overflow = await page.evaluate(() => document.body.style.overflow)
    expect(overflow).toBe('hidden')

    await page.getByRole('button', { name: 'Cancel' }).click()
    const overflowAfter = await page.evaluate(() => document.body.style.overflow)
    expect(overflowAfter).not.toBe('hidden')
  })

  test('body scroll locked while remove confirm modal is open', async ({ page, request }) => {
    const game = await createTestGame(request)
    await page.goto('/')
    await openDetail(page, game.title)

    await page.getByRole('button', { name: 'Remove' }).click()
    await expect(page.getByText(`Remove "${game.title}" from library?`)).toBeVisible()

    const overflow = await page.evaluate(() => document.body.style.overflow)
    expect(overflow).toBe('hidden')

    await page.getByRole('button', { name: 'Cancel' }).click()
    const overflowAfter = await page.evaluate(() => document.body.style.overflow)
    expect(overflowAfter).not.toBe('hidden')
  })

  // ── Screenshot carousel ───────────────────────────────────────────────────

  test('screenshots section hidden when game has no screenshots', async ({ page, request }) => {
    const game = await createTestGame(request)
    await page.goto('/')
    await openDetail(page, game.title)
    // Library games added manually have no screenshots — section must not appear.
    await expect(page.getByRole('heading', { name: /screenshots/i })).not.toBeVisible()
  })

  // ── Delete ────────────────────────────────────────────────────────────────

  test('delete from detail page redirects to library', async ({ page, request }) => {
    const game = await createTestGame(request)
    await page.goto('/')
    await openDetail(page, game.title)

    // "Remove" opens ConfirmModal; the modal's confirm calls GameDetail.handleDelete
    // which in turn fires a native browser confirm — accept both.
    await page.getByRole('button', { name: 'Remove' }).click()
    await expect(page.getByText(`Remove "${game.title}" from library?`)).toBeVisible()

    page.once('dialog', d => d.accept())
    await page.getByRole('button', { name: 'Remove', exact: true }).last().click()

    await expect(page).toHaveURL('/')
    await expect(page.getByText(game.title)).not.toBeVisible()
  })
})
