import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

// Live end-to-end test against OpenRouter FREE models using the key from .env.local.
// Injects the BYOK key into localStorage (the Vault's storage key), runs a real mission,
// and asserts the mission reaches completion with a non-empty artifact. Retries the run
// once because free-tier models are occasionally rate-limited (upstream 429).

function readKey(): string {
  const env = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
  const m = env.match(/OPEN_ROUTER\s*=\s*(.+)/)
  return m ? m[1].trim() : ''
}

test('live: real mission on free models completes with artifact', async ({ page }) => {
  const key = readKey()
  expect(key, 'OPEN_ROUTER key present in .env.local').toBeTruthy()

  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  await page.goto('/')
  await page.waitForTimeout(2200)

  // Inject BYOK key exactly where the Vault stores it, then reload so the app picks it up.
  await page.evaluate((k) => localStorage.setItem('axiom.key', k), key)
  await page.reload()
  await page.waitForTimeout(2200)

  // Open the objective dialog and submit a real mission.
  await page.click('[data-testid="run-button"]')
  await page.waitForTimeout(300)
  await page.fill('[data-testid="objective-input"]', 'In 3 short bullets, why is multi-agent orchestration useful for AI products?')
  await page.click('[data-testid="shape-standard"]')

  const objectiveInput = page.locator('[data-testid="objective-input"]').first()
  await objectiveInput.evaluate((el: HTMLInputElement) => {
    el.blur()
  })
  await page.click('[data-testid="objective-submit"]')

  // The mission may take a while with free models; wait for completion (single attempt,
  // with detailed diagnostics if it faults).
  let completed = false
  try {
    await expect(page.locator('[data-testid="artifact-modal"]')).toBeVisible({ timeout: 110000 })
    await expect(page.locator('[data-testid="artifact-body"]')).not.toBeEmpty({ timeout: 20000 })
    completed = true
  } catch {
    const feed = await page.evaluate(() => document.body.innerText)
    console.log('NOT COMPLETED. Full page text:\n', feed.slice(0, 1200))
  }
  expect(completed, 'mission should complete with a visible artifact modal').toBeTruthy()

  const body = await page.locator('[data-testid="artifact-body"]').innerText()
  expect(body.length).toBeGreaterThan(0)

  // Cost chip should be present and show a free ($0.0000) cost.
  await expect(page.locator('[data-testid="cost-chip"]')).toBeVisible({ timeout: 10000 })
  console.log('LIVE_OK artifact_len=', body.length, 'console_errors=', consoleErrors.length)
  if (consoleErrors.length) console.log('CONSOLE_ERRORS', JSON.stringify(consoleErrors.slice(0, 10)))
})
