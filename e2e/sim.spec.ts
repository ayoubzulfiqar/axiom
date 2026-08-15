import { test, expect } from '@playwright/test'

test.describe('SIM mode offline flow', () => {
  test('boot -> objective -> SIM run -> roster -> artifact -> history', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)

    await page.click('[data-testid="objective-input"]')
    await page.fill('[data-testid="objective-input"]', 'E2E mission')
    await page.click('[data-testid="objective-submit"]')

    await page.click('[data-testid="sim-toggle"]')
    await page.click('[data-testid="run-button"]')

    await expect(page.locator('[data-testid="roster-row"]').first()).toBeVisible({ timeout: 10000 })

    await expect(page.locator('[data-testid="artifact-modal"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="artifact-body"]')).not.toBeEmpty()
    await expect(page.locator('[data-testid="artifact-modal"] .font-mono')).toHaveText('VERIFIED')

    await page.click('[data-testid="artifact-modal"] .close-button, [aria-label="Close"]')
    await page.click('[data-testid="history-drawer"]')
    await expect(page.locator('[data-testid="history-drawer"]')).toBeVisible()
    await expect(page.locator('[data-testid="history-drawer"] .mission-row').first()).toBeVisible()

    await page.click('[data-testid="history-drawer"] .close-button, [aria-label="Close"]')
    await expect(page.locator('[data-testid="copy-button"]')).toBeVisible()
  })
})
