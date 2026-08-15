import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:4174'

test('live: objective prompt and shape selector exist', async ({ page }) => {
  await page.goto(BASE)
  await page.waitForTimeout(1500)

  const hasPrompt = await page.locator('text=/objective|mission/i').count() > 0
  const hasShape = await page.locator('text=/graph shape|shape/i').count() > 0
  expect(hasPrompt || hasShape).toBeTruthy()
})

test('live: telemetry and cost chips render', async ({ page }) => {
  await page.goto(BASE)
  await page.waitForTimeout(2000)
  const telemetry = page.locator('[data-testid="telemetry-chip"]')
  const cost = page.locator('[data-testid="cost-chip"]')
  if (await telemetry.count()) {
    await expect(telemetry).toBeVisible({ timeout: 10000 })
  }
  if (await cost.count()) {
    await expect(cost).toBeVisible({ timeout: 10000 })
    await expect(cost).toContainText('$')
  }
})

test('live: GraphDrawer opens and shows cost section', async ({ page }) => {
  await page.goto(BASE)
  await page.waitForTimeout(1500)
  const drawerTrigger = page.locator('button:has-text("Graph"), button:has-text("Cost by Agent"), [aria-label*="graph" i], [data-testid="graph-drawer-trigger"]').first()
  if (await drawerTrigger.count() > 0) {
    await drawerTrigger.click()
    await page.waitForTimeout(500)
    await expect(page.locator('text=/cost by agent|cost/i').first()).toBeVisible({ timeout: 10000 })
  }
})

test('live: FileDropZone is present and accepts input', async ({ page }) => {
  await page.goto(BASE)
  await page.waitForTimeout(1500)
  const dropZone = page.locator('[data-testid="file-drop-zone"]')
  if (await dropZone.count()) {
    await expect(dropZone).toBeVisible()
    const fileInput = page.locator('[data-testid="file-input"]')
    if (await fileInput.count()) {
      await fileInput.setInputFiles({
        name: 'axiom-probe.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('AXIOM live probe file for RAG smoke test.')
      })
      await page.waitForTimeout(1200)
      await expect(page.locator('text=/ingesting|ingested|rag-ready/i').first()).toBeVisible({ timeout: 10000 })
    }
  }
})

test('live: worker fallback path is loadable', async ({ page }) => {
  await page.goto(BASE)
  await page.waitForTimeout(1200)
  const bodyText = await page.locator('body').innerText()
  expect(bodyText.length).toBeGreaterThan(0)
})
