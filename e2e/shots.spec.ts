import { test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const OUT = path.join(process.cwd(), 'screenshots')
fs.mkdirSync(OUT, { recursive: true })

async function shot(name: string, page: any, fn: () => Promise<void>) {
  await fn()
  await page.waitForTimeout(900)
  await page.screenshot({ path: path.join(OUT, name), fullPage: false })
  console.log('captured', name)
}

async function enableSim(page: any) {
  const sim = page.locator('[data-testid="sim-toggle"]')
  await sim.waitFor({ state: 'visible', timeout: 15000 })
  const st = await sim.getAttribute('data-state').catch(() => null)
  if (st !== 'checked') await sim.click()
  await page.waitForTimeout(200)
}

async function runSimMission(page: any, objective: string, shape: string) {
  await page.click('[data-testid="run-button"]')
  await page.waitForTimeout(400)
  await page.fill('[data-testid="objective-input"]', objective)
  await page.click(`[data-testid="shape-${shape}"]`)
  await page.evaluate(() => (document.querySelector('[data-testid="objective-submit"]') as HTMLButtonElement)?.click())
}

// DESKTOP gallery
test('desktop shots', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.waitForSelector('[data-testid="run-button"]', { timeout: 15000 })
  await page.waitForTimeout(2800)
  await shot('desktop-01-boot.png', page, async () => {})
  await shot('desktop-02-mesh-idle.png', page, async () => {})

  // open dialog for a clean "objective" shot
  await page.click('[data-testid="run-button"]')
  await page.waitForTimeout(400)
  await page.fill('[data-testid="objective-input"]', 'Summarize why multi-agent orchestration matters for AI products.')
  await page.click('[data-testid="shape-deep-research"]')
  await page.waitForTimeout(300)
  await shot('desktop-04-objective-filled.png', page, async () => {})
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  // enable SIM, run, capture running + artifact
  await enableSim(page)
  await runSimMission(page, 'Draft a launch plan for an AI orchestration platform.', 'standard')
  await page.waitForTimeout(4500)
  await shot('desktop-05-mission-running.png', page, async () => {})
  try {
    await page.waitForSelector('[data-testid="artifact-modal"]', { timeout: 30000 })
    await shot('desktop-06-artifact.png', page, async () => {})
  } catch {
    console.log('desktop: no artifact within window')
  }
})

// MOBILE gallery
test('mobile shots', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 })
  await page.goto('/')
  await page.waitForSelector('[data-testid="run-button"]', { timeout: 15000 })
  await page.waitForTimeout(2800)
  await shot('mobile-01-mesh-idle.png', page, async () => {})

  await page.click('[data-testid="run-button"]')
  await page.waitForTimeout(400)
  await shot('mobile-02-objective-dialog.png', page, async () => {})
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  await enableSim(page)
  await runSimMission(page, 'Summarize why agent orchestration matters.', 'standard')
  await page.waitForTimeout(4500)
  await shot('mobile-03-mission-running.png', page, async () => {})
  try {
    await page.waitForSelector('[data-testid="artifact-modal"]', { timeout: 30000 })
    await shot('mobile-04-artifact.png', page, async () => {})
  } catch {
    console.log('mobile: no artifact within window')
  }
})
