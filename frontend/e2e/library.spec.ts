import { test, expect } from '@playwright/test'
import { createTestGame, cleanupE2EGames } from './helpers'

const CARD = '[data-testid="game-card"]'

test.describe('Library page', () => {
  test.beforeEach(async ({ request }) => {
    await cleanupE2EGames(request)
  })

  test.afterEach(async ({ request }) => {
    await cleanupE2EGames(request)
  })

  // ── Page structure ────────────────────────────────────────────────────────

  test('loads and shows heading', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'My Library' })).toBeVisible()
  })

  test('shows empty state when no games match filter', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/Search title/).fill('ZZZNOMATCH_E2E_9999')
    await page.waitForTimeout(700)
    await expect(page.getByText('No games found')).toBeVisible()
  })

  test('nav bar visible — Library and Discover links present', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Library' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Discover' })).toBeVisible()
  })

  test('logo click navigates to library from settings', async ({ page }) => {
    await page.goto('/settings')
    await page.locator('header img[alt="AVN Tracker"]').click()
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'My Library' })).toBeVisible()
  })

  // ── Game cards ────────────────────────────────────────────────────────────

  test('shows game card after adding via API', async ({ page, request }) => {
    const game = await createTestGame(request)
    await page.goto('/')
    await expect(page.locator(CARD).first()).toBeVisible()
    await expect(page.getByText(game.title)).toBeVisible()
  })

  test('shows update badge when versions differ', async ({ page, request }) => {
    await createTestGame(request, { myVersion: '0.5.0', latestVersion: '1.0.0' })
    await page.goto('/')
    // UpdateBadge renders a span with title="Update available"
    await expect(page.locator('[title="Update available"]').first()).toBeVisible()
  })

  test('no update badge when versions match', async ({ page, request }) => {
    await createTestGame(request, { myVersion: '1.0.0', latestVersion: '1.0.0' })
    await page.goto('/')
    await expect(page.locator('[title="Update available"]')).not.toBeVisible()
  })

  // ── View toggle ───────────────────────────────────────────────────────────

  test('switching to list view shows table', async ({ page, request }) => {
    await createTestGame(request)
    await page.goto('/')
    await page.getByTitle('List').click()
    await expect(page.locator('table')).toBeVisible()
  })

  test('list view toggle persists on reload', async ({ page, request }) => {
    await createTestGame(request)
    await page.goto('/')
    await page.getByTitle('List').click()
    await page.reload()
    await expect(page.locator('table')).toBeVisible()
  })

  test('switching back to grid hides table', async ({ page, request }) => {
    await createTestGame(request)
    await page.goto('/')
    await page.getByTitle('List').click()
    await page.getByTitle('Grid').click()
    await expect(page.locator('table')).not.toBeVisible()
    await expect(page.locator(CARD).first()).toBeVisible()
  })

  // ── Filters ───────────────────────────────────────────────────────────────

  test('status filter Playing shows only playing games', async ({ page, request }) => {
    await createTestGame(request, { status: 'PLAYING', title: '[E2E] Playing Game' })
    await createTestGame(request, { status: 'WANT',    title: '[E2E] Want Game' })

    await page.goto('/')
    await page.getByRole('button', { name: 'Playing', exact: true }).click()

    await expect(page.getByText('[E2E] Playing Game')).toBeVisible()
    await expect(page.getByText('[E2E] Want Game')).not.toBeVisible()
  })

  test('Has updates filter shows only outdated games', async ({ page, request }) => {
    await createTestGame(request, { myVersion: '0.5.0', latestVersion: '1.0.0', title: '[E2E] Outdated' })
    await createTestGame(request, { myVersion: '1.0.0', latestVersion: '1.0.0', title: '[E2E] Current'  })

    await page.goto('/')
    await page.getByRole('button', { name: 'Has updates' }).click()

    await expect(page.getByText('[E2E] Outdated')).toBeVisible()
    await expect(page.getByText('[E2E] Current')).not.toBeVisible()
  })

  test('search filters by title in real time', async ({ page, request }) => {
    await createTestGame(request, { title: '[E2E] UniqueSearchTitle' })
    await createTestGame(request, { title: '[E2E] Other Game' })

    await page.goto('/')
    await page.getByPlaceholder(/Search title/).fill('UniqueSearch')
    await page.waitForTimeout(400)

    await expect(page.getByText('[E2E] UniqueSearchTitle')).toBeVisible()
    await expect(page.getByText('[E2E] Other Game')).not.toBeVisible()
  })

  // ── CRUD via UI ───────────────────────────────────────────────────────────

  test('add game manually via modal', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Add Game' }).click()
    await expect(page.getByRole('heading', { name: 'Add Game' })).toBeVisible()

    await page.getByPlaceholder('Game title').fill('[E2E] Manual Add Test')
    await page.getByRole('button', { name: 'Add Game', exact: true }).last().click()

    await expect(page.getByText('[E2E] Manual Add Test')).toBeVisible()
  })

  test('edit game via hover overlay changes status', async ({ page, request }) => {
    const game = await createTestGame(request, { status: 'WANT' })
    await page.goto('/')

    const card = page.locator(CARD).filter({ hasText: game.title })
    await card.hover()

    // Wait for the slide-up animation to complete before clicking.
    await page.waitForTimeout(300)
    await card.getByTitle('Edit').click()

    await expect(page.getByRole('heading', { name: 'Edit Game' })).toBeVisible()
    await page.locator('form select').first().selectOption('PLAYING')
    await page.getByRole('button', { name: 'Save Changes' }).click()

    await expect(page.locator(CARD).filter({ hasText: game.title }).getByText('Playing')).toBeVisible()
  })

  test('delete game via hover overlay removes it', async ({ page, request }) => {
    const game = await createTestGame(request)
    await page.goto('/')

    const card = page.locator(CARD).filter({ hasText: game.title })
    await card.hover()
    await page.waitForTimeout(300)

    page.once('dialog', d => d.accept())
    await card.getByTitle('Delete').click()

    await expect(page.locator(CARD).filter({ hasText: game.title })).not.toBeVisible()
  })
})
