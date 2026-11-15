import { defineConfig } from '@playwright/test'
const python =
  process.platform === 'win32'
    ? '../horion-backend/venv/Scripts/python.exe'
    : '../horion-backend/venv/bin/python'
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    baseURL: 'http://127.0.0.1:3011',
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: `"${python}" ../horion-backend/scripts/e2e_server.py`,
      url: 'http://127.0.0.1:8011/api/health/',
      timeout: 90000,
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -- --port 3011 --strictPort',
      url: 'http://127.0.0.1:3011',
      timeout: 30000,
      env: { HORION_API_TARGET: 'http://127.0.0.1:8011' },
      reuseExistingServer: false,
    },
  ],
})
