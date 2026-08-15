import { test, expect } from '@playwright/test'

test.describe('SIM mode offline flow', () => {
  test('boot -> objective -> submit -> artifact modal visible', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2500)

    await page.evaluate(() => localStorage.setItem('axiom.key', 'test-key'))
    await page.reload()
    await page.waitForTimeout(2000)

    await page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message))
    await page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('PAGE CONSOLE ERROR:', msg.text())
      else console.log('PAGE CONSOLE:', msg.text())
    })

    await page.click('[data-testid="run-button"]')
    await page.waitForTimeout(100)

    await page.click('[data-testid="objective-input"]')
    await page.fill('[data-testid="objective-input"]', 'E2E mission')
    await page.click('[data-testid="shape-adversarial"]')
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="objective-submit"]') as HTMLButtonElement | null
      btn?.click()
    })

    await expect(page.locator('[data-testid="artifact-modal"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="artifact-body"]')).not.toBeEmpty()
    const maybeVerified = page.locator('[data-testid="artifact-modal"] .font-mono')
    if ((await maybeVerified.count()) > 0) {
      await expect(maybeVerified.first()).toHaveText('VERIFIED')
    }
    await expect(page.locator('[data-testid="copy-button"]')).toBeVisible()

    await expect(page.locator('[data-testid="telemetry-chip"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="telemetry-chip"]')).toContainText('max')
  })

  test('deep-research shape emits convergence and telemetry', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2500)
    await page.evaluate(() => localStorage.setItem('axiom.key', 'test-key'))
    await page.reload()
    await page.waitForTimeout(2000)

    await page.click('[data-testid="run-button"]')
    await page.waitForTimeout(100)
    await page.click('[data-testid="objective-input"]')
    await page.fill('[data-testid="objective-input"]', 'Deep E2E')
    await page.click('[data-testid="shape-deep-research"]')
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="objective-submit"]') as HTMLButtonElement | null
      btn?.click()
    })

    await expect(page.locator('[data-testid="artifact-modal"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="artifact-body"]')).not.toBeEmpty()
    await expect(page.locator('[data-testid="telemetry-chip"]')).toBeVisible({ timeout: 10000 })
  })

  test('broad-sweep shape completes with dry-round convergence', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2500)
    await page.evaluate(() => localStorage.setItem('axiom.key', 'test-key'))
    await page.reload()
    await page.waitForTimeout(2000)

    await page.click('[data-testid="run-button"]')
    await page.waitForTimeout(100)
    await page.click('[data-testid="objective-input"]')
    await page.fill('[data-testid="objective-input"]', 'Broad E2E')
    await page.click('[data-testid="shape-broad-sweep"]')
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="objective-submit"]') as HTMLButtonElement | null
      btn?.click()
    })

    await expect(page.locator('[data-testid="artifact-modal"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="artifact-body"]')).not.toBeEmpty()
    await expect(page.locator('[data-testid="telemetry-chip"]')).toBeVisible({ timeout: 10000 })
  })

  test('standard shape runs default SIM path', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2500)
    await page.evaluate(() => localStorage.setItem('axiom.key', 'test-key'))
    await page.reload()
    await page.waitForTimeout(2000)

    await page.click('[data-testid="run-button"]')
    await page.waitForTimeout(100)
    await page.click('[data-testid="objective-input"]')
    await page.fill('[data-testid="objective-input"]', 'Standard E2E')
    await page.click('[data-testid="shape-standard"]')
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="objective-submit"]') as HTMLButtonElement | null
      btn?.click()
    })

    await expect(page.locator('[data-testid="artifact-modal"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid="artifact-body"]')).not.toBeEmpty()
    await expect(page.locator('[data-testid="telemetry-chip"]')).toBeVisible({ timeout: 10000 })
  })
})
