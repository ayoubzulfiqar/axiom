import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 120000,
  use: {
    baseURL: 'http://localhost:4174',
    headless: true,
  },
  webServer: {
    command: 'npx vite --port 4174 --host',
    port: 4174,
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
})
