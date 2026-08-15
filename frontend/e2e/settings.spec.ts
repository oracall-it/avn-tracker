import { test, expect } from '@playwright/test'
import { createTestGame, cleanupE2EGames, gql } from './helpers'
import path from 'path'
import fs from 'fs'
import os from 'os'

test.describe('Settings page', () => {
  test.beforeEach(async ({ request }) => {
    await cleanupE2EGames(request)
  })

  test.afterEach(async ({ request }) => {
    await cleanupE2EGames(request)
  })

  // ── Navigation ────────────────────────────────────────────────────────────

  test('navigates to settings via gear icon in nav', async ({ page }) => {
    await page.goto('/')
    // The settings NavLink wraps a Settings2 icon with title="Settings".
    await page.locator('header a[title="Settings"]').click()
    await expect(page).toHaveURL('/settings')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  })

  test('back button returns to previous page', async ({ page }) => {
    await page.goto('/')
    await page.locator('header a[title="Settings"]').click()
    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page).toHaveURL('/')
  })

  test('nav bar visible on settings page', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('link', { name: 'Library' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Discover' })).toBeVisible()
  })

  // ── Export ────────────────────────────────────────────────────────────────

  test('shows export and import sections', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByText('Export')).toBeVisible()
    await expect(page.getByText('Import')).toBeVisible()
  })

  test('export button downloads a valid JSON file', async ({ page, request }) => {
    await createTestGame(request, { title: '[E2E] Export Test' })
    await page.goto('/settings')

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export JSON' }).click(),
    ])

    expect(download.suggestedFilename()).toMatch(/avn-tracker.*\.json/)

    const tmpPath = path.join(os.tmpdir(), download.suggestedFilename())
    await download.saveAs(tmpPath)
    const content = JSON.parse(fs.readFileSync(tmpPath, 'utf-8')) as Array<{ title: string }>
    expect(Array.isArray(content)).toBe(true)
    expect(content.some(g => g.title === '[E2E] Export Test')).toBe(true)
    fs.unlinkSync(tmpPath)
  })

  // ── Import ────────────────────────────────────────────────────────────────

  test('import restores games from JSON export', async ({ page, request }) => {
    const game = await createTestGame(request, { title: '[E2E] Import Test' })
    const exportData = await gql(request, 'mutation { exportLibrary }')
    const json: string = exportData.exportLibrary

    // Wipe E2E games.
    await cleanupE2EGames(request)

    // Write to temp file.
    const tmpPath = path.join(os.tmpdir(), `avn-import-${Date.now()}.json`)
    fs.writeFileSync(tmpPath, json)

    await page.goto('/settings')
    await page.locator('input[type="file"]').setInputFiles(tmpPath)

    // Wait for the success alert and dismiss it.
    page.once('dialog', d => d.accept())
    await page.waitForTimeout(1000)

    fs.unlinkSync(tmpPath)

    await page.goto('/')
    await expect(page.getByText(game.title)).toBeVisible()
  })

  // ── F95Zone credentials ───────────────────────────────────────────────────

  test('F95Zone account section is visible', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByText('F95Zone Account')).toBeVisible()
    await expect(page.getByPlaceholder('F95Zone username')).toBeVisible()
    await expect(page.getByPlaceholder('Password')).toBeVisible()
  })

  test('Save & Connect button is disabled when fields are empty', async ({ page }) => {
    await page.goto('/settings')
    const btn = page.getByRole('button', { name: 'Save & Connect' })
    await expect(btn).toBeDisabled()
  })

  test('Save & Connect button enables when both fields are filled', async ({ page }) => {
    await page.goto('/settings')
    await page.getByPlaceholder('F95Zone username').fill('testuser')
    await page.getByPlaceholder('Password').fill('testpass')
    await expect(page.getByRole('button', { name: 'Save & Connect' })).toBeEnabled()
  })

  test('Save & Connect button stays disabled with only username filled', async ({ page }) => {
    await page.goto('/settings')
    await page.getByPlaceholder('F95Zone username').fill('testuser')
    await expect(page.getByRole('button', { name: 'Save & Connect' })).toBeDisabled()
  })

  test('connection status badge is shown', async ({ page }) => {
    await page.goto('/settings')
    // Badge reads either "Connected" or "Not connected".
    const badge = page.locator('span').filter({ hasText: /^(Connected|Not connected)$/ })
    await expect(badge).toBeVisible()
  })

  // ── F95Zone sync ─────────────────────────────────────────────────────────

  test('F95Zone Sync section is visible', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByText('F95Zone Sync')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sync all' })).toBeVisible()
  })

  test('Sync all button is disabled when not connected to F95Zone', async ({ page }) => {
    await page.goto('/settings')
    // In E2E environment F95Zone credentials are not configured, so button is disabled.
    await expect(page.getByRole('button', { name: 'Sync all' })).toBeDisabled()
  })

  // ── Theme ─────────────────────────────────────────────────────────────────

  test('theme toggle switches between light and dark mode', async ({ page }) => {
    await page.goto('/')

    // Force light mode as baseline.
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    })

    const html = page.locator('html')
    await expect(html).not.toHaveClass(/dark/)

    // Toggle to dark.
    await page.getByTitle('Toggle theme').click()
    await expect(html).toHaveClass(/dark/)

    // Toggle back to light.
    await page.getByTitle('Toggle theme').click()
    await expect(html).not.toHaveClass(/dark/)
  })
})
