import { expect, test } from '@playwright/test';

/**
 * Guardados (RF-DES-04), chips de Descubrir con las preferencias reales y la
 * cola sin conexión del chat (RNF-06).
 */
test.describe('Guardar para después', () => {
  test('la lista vacía lo dice y lleva a Descubrir', async ({ page }) => {
    await page.goto('/descubrir/guardados');
    const main = page.getByRole('main');
    await expect(
      main.getByText('Todavía no has guardado ningún perfil', { exact: false }),
    ).toBeVisible();
    await expect(main.getByRole('link', { name: 'Descubrir' })).toBeVisible();
  });

  test('un perfil guardado aparece en la lista y abre su ficha', async ({ page }) => {
    await page.goto('/descubrir');
    await page.getByRole('button', { name: 'Guardar para después' }).first().click();
    await expect(page.getByText('Guardado', { exact: true }).first()).toBeVisible();

    // Navegación dentro de la app: la demo guarda en memoria.
    await page.getByRole('button', { name: 'Filtros' }).click();
    await page.getByRole('link', { name: 'Guardados' }).click();
    await expect(page).toHaveURL(/\/descubrir\/guardados$/);

    const row = page.getByRole('main').locator('a[href^="/descubrir/"]').first();
    await expect(row).toBeVisible();
    await row.click();
    await expect(page).toHaveURL(/\/descubrir\/[^/]+$/);
  });

  test('los chips de filtros reflejan las preferencias de la cuenta', async ({ page }) => {
    await page.goto('/descubrir');
    await page.getByRole('button', { name: 'Filtros' }).click();
    const age = page.getByRole('link', { name: 'Rango de edad 26–38' });
    await expect(age).toHaveAttribute('href', '/perfil/preferencias');
    await expect(page.getByRole('link', { name: '≤ 50 km' })).toBeVisible();
    // La cuenta de la demo ya es Oro: no se le vende Plus.
    await expect(page.getByRole('link', { name: /Filtros avanzados · Plus/ })).toHaveCount(0);
  });
});

test.describe('Chat sin conexión', () => {
  test('un mensaje escrito sin señal queda pendiente y sale al volver', async ({
    page,
    context,
  }) => {
    await page.goto('/conexiones/m-mariel');
    const composer = page.getByPlaceholder('Escribe un mensaje…');
    await expect(composer).toBeVisible();

    await context.setOffline(true);
    await expect(
      page.getByText('Sin conexión. Lo que hagas se guarda', { exact: false }),
    ).toBeVisible();

    const text = 'Nos vemos el domingo en el culto de las 10';
    await composer.fill(text);
    await page.getByRole('button', { name: 'Enviar' }).click();

    const pending = page.getByTestId('pending-message');
    await expect(pending).toHaveCount(1);
    await expect(pending).toContainText(text);
    await expect(pending).toContainText('Sin señal: el mensaje se enviará solo');

    await context.setOffline(false);
    await expect(pending).toHaveCount(0);
    await expect(page.getByText(text).first()).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'pendiente' })).toBeVisible();
    await expect(
      page.getByText('Sin conexión. Lo que hagas se guarda', { exact: false }),
    ).toHaveCount(0);
  });
});
