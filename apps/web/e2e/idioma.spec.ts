import { expect, test } from '@playwright/test';

/**
 * Idioma (RNF-06). Lo que protege: todo arranca en español; al elegir
 * English en Perfil, la interfaz entera cambia sin recargar; la elección
 * sobrevive a una recarga; y volver a Español restaura todo.
 */
test.describe('Idioma', () => {
  test('cambia a inglés desde Perfil, se recuerda y vuelve a español', async ({ page }) => {
    await page.goto('/perfil');
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'Verificación' })).toBeVisible();

    await page
      .getByRole('group', { name: 'Idioma / Language' })
      .getByRole('button', { name: 'English' })
      .click();
    await expect(main.getByRole('heading', { name: 'Verification' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Discover', exact: true }).first()).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');

    await page.reload();
    await expect(
      page.getByRole('main').getByRole('heading', { name: 'Verification' }),
    ).toBeVisible();

    await page
      .getByRole('group', { name: 'Idioma / Language' })
      .getByRole('button', { name: 'Español' })
      .click();
    await expect(
      page.getByRole('main').getByRole('heading', { name: 'Verificación' }),
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es-DO');
  });

  test('la bienvenida ofrece el idioma antes de crear la cuenta', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('group', { name: 'Idioma / Language' })
      .getByRole('button', { name: 'English' })
      .click();
    await expect(page.getByText('Meet someone who already prays like you.')).toBeVisible();
    await page
      .getByRole('group', { name: 'Idioma / Language' })
      .getByRole('button', { name: 'Español' })
      .click();
    await expect(page.getByText('Conoce a alguien que ya ora como tú.')).toBeVisible();
  });
});
