import { expect, test, type Page } from '@playwright/test';

/**
 * Recorrido contra la API real. No comprueba textos de fixtures: comprueba
 * que la web entra con una cuenta de verdad, que cada pantalla principal
 * carga datos del servidor sin error visible y que el portal de iglesias
 * responde a su cuenta. Si algo de esto falla, la demo puede estar perfecta
 * y el producto roto.
 */
const MEMBER = {
  email: process.env.E2E_LIVE_EMAIL ?? 'prueba@yugo.do',
  password: process.env.E2E_LIVE_PASSWORD ?? 'Yugo.prueba1',
};
const CHURCH = {
  email: process.env.E2E_LIVE_CHURCH_EMAIL ?? 'iglesia@yugo.do',
  password: process.env.E2E_LIVE_CHURCH_PASSWORD ?? 'Yugo.iglesia1',
};

async function login(page: Page, account: { email: string; password: string }) {
  await page.goto('/entrar');
  await page.getByPlaceholder('Correo o teléfono').fill(account.email);
  await page.getByPlaceholder('Contraseña').fill(account.password);
  await page.getByRole('button', { name: /continuar|entrar/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/entrar'), { timeout: 30_000 });
}

/** Ningún error de red o de servidor debe llegar a la pantalla. */
function watchForErrors(page: Page) {
  const failures: string[] = [];
  page.on('response', (response) => {
    if (response.status() >= 500) failures.push(`${response.status()} ${response.url()}`);
  });
  return failures;
}

test.describe('Contra la API real', () => {
  test('la API responde y la web sabe dónde está', async ({ page }) => {
    await page.goto('/estado');
    await expect(page.getByRole('main')).toContainText(/API|servidor/i);
    await expect(page.getByRole('main')).not.toContainText(/https:\/\/\/v1|localhost:4000/);
  });

  test('una persona entra y recorre sus pantallas con datos del servidor', async ({ page }) => {
    const failures = watchForErrors(page);
    await login(page, MEMBER);

    await page.goto('/inicio');
    await expect(page.getByRole('main')).not.toContainText(/Algo salió mal|No se pudo conectar/);

    for (const path of ['/descubrir', '/conexiones', '/eventos', '/comunidad', '/perfil']) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const main = page.getByRole('main');
      await expect(main).toBeVisible();
      await expect(main).not.toContainText(/Algo salió mal|No se pudo conectar|Tu sesión expiró/);
    }

    // El perfil es el de la cuenta, no una ficha de demostración.
    await page.goto('/perfil');
    await expect(page.getByRole('main')).not.toContainText('Emilio, 34');

    expect(failures, `respuestas 5xx: ${failures.join(', ')}`).toEqual([]);
  });

  test('una conversación real abre y acepta un mensaje', async ({ page }) => {
    await login(page, MEMBER);
    await page.goto('/conexiones');
    await page.waitForLoadState('networkidle');
    const first = page.getByRole('main').locator('a[href^="/conexiones/"]').first();
    if ((await first.count()) === 0) {
      test.skip(true, 'La cuenta de prueba no tiene conexiones sembradas.');
      return;
    }
    await first.click();
    await page.waitForURL(/\/conexiones\/.+/);
    const box = page.getByPlaceholder(/escribe|mensaje/i).first();
    await expect(box).toBeVisible();
    const text = `Prueba automática ${Date.now()}`;
    await box.fill(text);
    await box.press('Enter');
    await expect(page.getByText(text)).toBeVisible({ timeout: 15_000 });
  });

  test('el portal de iglesias entra con su cuenta y muestra totales', async ({ page }) => {
    const failures = watchForErrors(page);
    await login(page, CHURCH);
    await page.goto('/iglesias');
    await page.waitForLoadState('networkidle');
    const main = page.getByRole('main');
    await expect(main).toBeVisible();
    await expect(main).not.toContainText(/Algo salió mal|No se pudo conectar/);
    await page.goto('/iglesias/consejeria');
    await expect(page.getByRole('main')).toContainText(/Consejería|consejería/);
    expect(failures, `respuestas 5xx: ${failures.join(', ')}`).toEqual([]);
  });
});
