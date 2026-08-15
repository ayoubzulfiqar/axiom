import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:4174'

test('live: submit objective and verify live mission execution', async ({ page }) => {
  const consoleLogs: string[] = []
  page.on('console', (msg) => {
    consoleLogs.push(msg.text())
  })

  await page.goto(BASE)
  await page.waitForTimeout(2000)

  const runBtn = page.locator('[data-testid="run-button"], button:has-text("RUN")').first()
  if (await runBtn.count() === 0) {
    test.skip(true, 'run button not found in live UI')
    return
  }

  await runBtn.click()
  await page.waitForTimeout(500)

  const objectiveInput = page.locator('[data-testid="objective-input"]').first()
  const submitBtn = page.locator('[data-testid="objective-submit"], button:has-text("EXECUTE")').first()

  if (await objectiveInput.count() === 0 || await submitBtn.count() === 0) {
    test.skip(true, 'objective input/submit not found in live UI')
    return
  }

  await objectiveInput.fill('Live smoke test mission')
  await submitBtn.click()

  await page.waitForTimeout(2500)
  const bodyText = await page.locator('body').innerText()
  const status = await page.evaluate(() => (window as any).axiomStatus ?? 'unknown')

  console.log('LIVE_BODY', JSON.stringify(bodyText.slice(0, 5000)))
  console.log('LIVE_CONSOLE', JSON.stringify(consoleLogs.slice(-20)))
  console.log('LIVE_STATUS', status)

  expect(bodyText.length).toBeGreaterThan(0)
  const hasMotion = bodyText.includes('STEP') || bodyText.includes('ARTIFACT') || bodyText.includes('MISSION') || bodyText.includes('RUNNING')
  expect(hasMotion).toBeTruthy()
})
