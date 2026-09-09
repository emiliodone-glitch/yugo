import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

/**
 * E2E contra la API real (RNF-09).
 *
 * Las pruebas de `e2e/` corren en modo demo y no tocan un servidor. Estas sí:
 * la web construida con NEXT_PUBLIC_DEMO_MODE=false, hablando con una API
 * viva con la semilla cargada (`pnpm db:seed`). Es lo que atrapa lo que la
 * demo no puede: un 500 real, un contrato roto entre cliente y servidor, una
 * migración que falta.
 *
 * Variables:
 * - PLAYWRIGHT_BASE_URL  la web viva (por defecto http://localhost:3211)
 * - E2E_LIVE_EMAIL / E2E_LIVE_PASSWORD  una cuenta con perfil (por defecto la
 *   de prueba de la semilla)
 * - E2E_LIVE_CHURCH_EMAIL / E2E_LIVE_CHURCH_PASSWORD  una cuenta del portal
 */
const systemChromium = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
const launchOptions = existsSync(systemChromium) ? { executablePath: systemChromium } : {};

export default defineConfig({
  testDir: './e2e-live',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3211',
    locale: 'es-DO',
    timezoneId: 'America/Santo_Domingo',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'live-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, launchOptions },
    },
  ],
});
