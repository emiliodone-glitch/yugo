import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/**
 * Sandboxes and CI images often ship a Chromium whose build number does not
 * match the one this Playwright version expects. When such a binary is
 * present, point at it instead of failing with "browser not installed";
 * on a normal machine `playwright install` provides it and this is a no-op.
 */
const systemChromium = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
const launchOptions = existsSync(systemChromium) ? { executablePath: systemChromium } : {};

/**
 * E2E for the web app, admin panel and church portal (RNF-09).
 * Runs against the built app in demo mode so the critical journeys are
 * exercised without infrastructure; point PLAYWRIGHT_BASE_URL at a staging
 * deployment to run the same specs against the live API.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3210';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    locale: 'es-DO',
    timezoneId: 'America/Santo_Domingo',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Both projects run on Chromium so CI needs a single browser download.
    // "mobile-web" reproduces the phone layout of the mockups.
    {
      name: 'mobile-web',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        launchOptions,
      },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, launchOptions },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'pnpm exec next start -p 3210',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
