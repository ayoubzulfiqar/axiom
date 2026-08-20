import { test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const OUT = path.join(process.cwd(), 'screenshots')
fs.mkdirSync(OUT, { recursive: true })

// Mirrors the proven sim.spec flow (which asserts artifact-modal appears) so the
// captured shots are reliable. SIM mode is enabled first (Header unobstructed).
async function enableSim(page: any) {
  await page.evaluate(() => localStorage.setItem('axiom.key', 'test-key'))
  await page.reload()
  await page.waitForSelector('[data-testid="run-button"]', { timeout: 15000 })
  await page.waitForSelector('[data-testid="sim-toggle"]', { timeout: 15000 })
  const sim = page.locator('[data-testid="sim-toggle"]')
  const st = await sim.getAttribute('data-state').catch(() => null)
  if (st !== 'checked') await sim.click()
  await page.waitForTimeout(300)
}

test('desktop artifact', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.waitForSelector('[data-testid="run-button"]', { timeout: 15000 })
  await page.waitForTimeout(2800)
  await enableSim(page)
  await page.click('[data-testid="run-button"]')
  await page.waitForTimeout(100)
  await page.click('[data-testid="shape-standard"]')
  await page.fill('[data-testid="objective-input"]', 'Simulate a standard mission: summarize agent orchestration benefits.')
  await page.evaluate(() => (document.querySelector('[data-testid="objective-submit"]') as HTMLButtonElement)?.click())
  // mid-run shot
  await page.waitForTimeout(3500)
  await page.screenshot({ path: path.join(OUT, 'desktop-05-mission-running.png'), fullPage: false })
  console.log('captured desktop-05-mission-running.png')
  await page.waitForSelector('[data-testid="artifact-modal"]', { timeout: 15000 })
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(OUT, 'desktop-06-artifact.png'), fullPage: false })
  console.log('captured desktop-06-artifact.png')
})

test('mobile artifact', async ({ page }) => {
  // The SIM toggle only renders at >=768px (md:flex). Enable SIM at desktop width,
  // then shrink to mobile — simMode persists in-memory across viewport changes.
  await page.setViewportSize({ width: 800, height: 900 })
  await page.goto('/')
  await page.waitForSelector('[data-testid="run-button"]', { timeout: 15000 })
  await page.waitForTimeout(2800)
  await enableSim(page)

  await page.setViewportSize({ width: 390, height: 780 })
  await page.waitForTimeout(400)
  await page.click('[data-testid="run-button"]')
  await page.waitForTimeout(100)
  await page.click('[data-testid="shape-standard"]')
  await page.fill('[data-testid="objective-input"]', 'Simulate a standard mission: summarize agent orchestration benefits.')
  await page.evaluate(() => (document.querySelector('[data-testid="objective-submit"]') as HTMLButtonElement)?.click())
  await page.waitForTimeout(3500)
  await page.screenshot({ path: path.join(OUT, 'mobile-03-mission-running.png'), fullPage: false })
  console.log('captured mobile-03-mission-running.png')
  await page.waitForSelector('[data-testid="artifact-modal"]', { timeout: 15000 })
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(OUT, 'mobile-04-artifact.png'), fullPage: false })
  console.log('captured mobile-04-artifact.png')
})
