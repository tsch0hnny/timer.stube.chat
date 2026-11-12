import { defineConfig, devices } from '@playwright/test'

// E2E runs against the real nginx container (same image as production), not a dev server:
//   npm run e2e            builds the image, starts it on :8090 and runs the suite
//   E2E_BASE_URL=https://test-timer.stube.chat npx playwright test   against staging
export default defineConfig({
  testDir: 'test/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0, // a flaky timer test is a failing timer test
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8090',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'webkit-iphone13pro', use: { ...devices['iPhone 13 Pro'] } },
    { name: 'chromium-pixel7', use: { ...devices['Pixel 7'] } },
  ],
})
