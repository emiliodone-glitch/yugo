import { expect, test } from '@playwright/test';

/**
 * Historias.
 *
 * The page is the product's own evidence, so it is public and every story
 * names the congregation behind it. Nothing here can be published on one
 * person's say-so, and the interface says so where people will read it.
 */
test.describe('Historias', () => {
  test('son públicas: no hace falta cuenta para verlas', async ({ page }) => {
    await page.goto('/historias');
    const main = page.getByRole('main');

    await expect(page.getByRole('heading', { name: 'Historias', level: 1 })).toBeVisible();
    await expect(main.getByText('Rebeca y Josué')).toBeVisible();
    await expect(main.getByText('Noemí y Elías')).toBeVisible();
  });

  test('cada historia nombra a la iglesia que la respalda', async ({ page }) => {
    await page.goto('/historias');
    const main = page.getByRole('main');

    await expect(
      main.getByText('Con el testimonio de Iglesia Bíblica Emanuel y Iglesia Monte de Sion'),
    ).toBeVisible();
    await expect(main.getByText('Se casaron el', { exact: false }).first()).toBeVisible();
  });

  test('la página deja clara la regla del consentimiento', async ({ page }) => {
    await page.goto('/historias');
    await expect(
      page.getByRole('main').getByText('Sin el sí de los dos, no se publica nunca.'),
    ).toBeVisible();
  });
});

test.describe('Contar la nuestra', () => {
  test('un vínculo que no llegó al matrimonio no ve la tarjeta', async ({ page }) => {
    // m-daniela está en «Amistad intencional»: no hay historia que contar y
    // decirlo ahí sería ruido.
    await page.goto('/conexiones/m-daniela');
    await expect(page.getByRole('region', { name: 'Contar nuestra historia' })).toHaveCount(0);
  });

  test('al declarar el matrimonio aparece la opción de contarla', async ({ page }) => {
    // m-mariel arranca en «Conociéndonos»; recorremos la escalera completa,
    // que es exactamente lo que la historia certifica.
    await page.goto('/conexiones/m-mariel');
    const stage = page.getByRole('region', { name: 'Nuestra etapa' });

    for (const next of ['Amistad intencional', 'Noviazgo', 'Comprometidos', 'Casados']) {
      // Abrir la confirmación y confirmar: la app avisa de lo que implica
      // antes de que nadie declare nada.
      await stage.getByRole('button', { name: `Proponer «${next}»` }).click();
      await stage.getByRole('button', { name: `Proponer «${next}»` }).click();
      // En producción responde la otra persona; la demo lo dice y lo simula.
      await stage.getByRole('button', { name: 'Demo: responder como la otra persona' }).click();
    }

    await expect(stage.getByText('Se casaron. Es lo que Yugo existe para que pase.')).toBeVisible();
    await expect(
      page.getByRole('region', { name: 'Contar nuestra historia' }),
    ).toBeVisible();
  });
});
