import { expect, test } from '@playwright/test';

/**
 * Etapas del vínculo.
 *
 * The rule the product depends on: a stage belongs to both people. Nothing
 * here should let one person declare a relationship on their own, and nothing
 * should let a bond skip a step.
 */
test.describe('Etapas del vínculo', () => {
  test('el chat muestra la etapa y lo que sigue', async ({ page }) => {
    // m-daniela viene sembrada en «Amistad intencional».
    await page.goto('/conexiones/m-daniela');

    const card = page.getByRole('region', { name: 'Nuestra etapa' });
    await expect(card.getByText('Amistad intencional')).toBeVisible();
    await expect(card.getByText('Se conocen con intención, sin apuro.')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Proponer «Noviazgo»' })).toBeVisible();
  });

  test('proponer no declara nada: queda esperando a la otra persona', async ({ page }) => {
    await page.goto('/conexiones/m-daniela');
    const card = page.getByRole('region', { name: 'Nuestra etapa' });

    await card.getByRole('button', { name: 'Proponer «Noviazgo»' }).click();
    // Antes de confirmar, la app dice exactamente qué implica.
    await expect(card.getByText('Una etapa la declaran los dos')).toBeVisible();
    await expect(
      card.getByText('los dos dejan de aparecer en Descubrir', { exact: false }),
    ).toBeVisible();

    await card.getByRole('button', { name: 'Proponer «Noviazgo»' }).click();

    await expect(card.getByText('Falta que la otra persona acepte', { exact: false })).toBeVisible();
    // La etapa no se movió.
    await expect(card.getByText('Amistad intencional')).toBeVisible();
  });

  test('nunca ofrece saltarse una etapa', async ({ page }) => {
    // Desde «Conociéndonos» lo único proponible es la etapa siguiente:
    // el salto a noviazgo no existe como botón, no solo como error.
    await page.goto('/conexiones/m-mariel');
    const card = page.getByRole('region', { name: 'Nuestra etapa' });

    await expect(card.getByRole('button', { name: 'Proponer «Amistad intencional»' })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Proponer «Noviazgo»' })).toHaveCount(0);
    await expect(card.getByRole('button', { name: 'Proponer «Comprometidos»' })).toHaveCount(0);
  });

  test('una propuesta recibida se puede aceptar o posponer', async ({ page }) => {
    // m-priscila viene sembrada con una propuesta de la otra persona.
    await page.goto('/conexiones/m-priscila');
    const card = page.getByRole('region', { name: 'Nuestra etapa' });

    await expect(
      card.getByText('propone que pasen a «Amistad intencional»', { exact: false }),
    ).toBeVisible();
    await expect(card.getByRole('button', { name: 'Todavía no' })).toBeVisible();

    await card.getByRole('button', { name: 'Estoy de acuerdo' }).click();
    await expect(card.getByText('Amistad intencional')).toBeVisible();
    await expect(card.getByText('Se conocen con intención, sin apuro.')).toBeVisible();
  });

  test('decir «todavía no» limpia la propuesta sin terminar nada', async ({ page }) => {
    await page.goto('/conexiones/m-priscila');
    const card = page.getByRole('region', { name: 'Nuestra etapa' });

    await card.getByRole('button', { name: 'Todavía no' }).click();

    await expect(card.getByText('Conociéndonos')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Proponer «Amistad intencional»' })).toBeVisible();
    // La conversación sigue disponible: posponer no es romper.
    await expect(page.getByPlaceholder('Escribe un mensaje…')).toBeVisible();
  });

  test('la lista de conexiones señala el vínculo que avanzó', async ({ page }) => {
    await page.goto('/conexiones');
    const main = page.getByRole('main');

    await expect(main.getByText('Amistad intencional')).toBeVisible();
    await expect(main.getByText('Propuso una etapa')).toBeVisible();
  });
});
