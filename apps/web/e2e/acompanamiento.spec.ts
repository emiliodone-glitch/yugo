import { expect, test } from '@playwright/test';

/**
 * Acompañamiento.
 *
 * The promise this feature lives or dies by is that the couple accompanying a
 * bond never reads its conversation. The API enforces it; these tests check
 * the interface says so, in both screens, where people will actually read it.
 */
test.describe('Acompañamiento', () => {
  test('el chat dice quién los acompaña y qué no ve', async ({ page }) => {
    // m-daniela viene sembrada con un matrimonio acompañando.
    await page.goto('/conexiones/m-daniela');
    const card = page.getByRole('region', { name: 'Acompañamiento' });

    await expect(card.getByText('Los acompaña Pedro y Marta.')).toBeVisible();
    await expect(card.getByText('Iglesia Bíblica Emanuel', { exact: false })).toBeVisible();
    await expect(card.getByText('nunca ve sus conversaciones', { exact: false })).toBeVisible();
  });

  test('un vínculo que todavía no avanzó explica por qué no puede invitar', async ({ page }) => {
    // m-mariel está en «Conociéndonos»: no se esconde la opción, se explica.
    await page.goto('/conexiones/m-mariel');
    const card = page.getByRole('region', { name: 'Acompañamiento' });

    await expect(card.getByText('cuando declaren «Amistad intencional»', { exact: false })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Invitar a un matrimonio' })).toHaveCount(0);
  });

  test('invitar con un código deja la invitación esperando a los demás', async ({ page }) => {
    // m-sarah ya avanzó y no tiene padrinos todavía.
    await page.goto('/conexiones/m-sarah');
    const stageCard = page.getByRole('region', { name: 'Nuestra etapa' });
    await stageCard.getByRole('button', { name: 'Estoy de acuerdo' }).click();

    const card = page.getByRole('region', { name: 'Acompañamiento' });
    await card.getByRole('button', { name: 'Invitar a un matrimonio' }).click();
    await card.getByLabel('Código de los padrinos').fill('PADRINOS-7C4A19');
    await card.getByRole('button', { name: 'Invitar' }).click();

    // Invitar no basta: la etapa la declaran los dos y esto también.
    await expect(card.getByText('Falta que', { exact: false })).toBeVisible();
  });

  test('un código que no existe se dice sin rodeos', async ({ page }) => {
    await page.goto('/conexiones/m-sarah');
    await page
      .getByRole('region', { name: 'Nuestra etapa' })
      .getByRole('button', { name: 'Estoy de acuerdo' })
      .click();

    const card = page.getByRole('region', { name: 'Acompañamiento' });
    await card.getByRole('button', { name: 'Invitar a un matrimonio' }).click();
    await card.getByLabel('Código de los padrinos').fill('PADRINOS-INVENTADO');
    await card.getByRole('button', { name: 'Invitar' }).click();

    await expect(card.getByText('Ese código no existe', { exact: false })).toBeVisible();
  });

  test('la pantalla del matrimonio muestra la etapa y ninguna conversación', async ({ page }) => {
    await page.goto('/perfil/acompanar');
    const main = page.getByRole('main');

    await expect(main.getByText('Rebeca y Josué')).toBeVisible();
    await expect(main.getByText('Noviazgo', { exact: true })).toBeVisible();
    await expect(main.getByText('nunca ve sus conversaciones', { exact: false })).toBeVisible();

    // Lo que no debe existir en ninguna parte de esta pantalla.
    await expect(main.getByText('mensaje', { exact: false })).toHaveCount(0);
    await expect(main.getByRole('link', { name: /conversaci/i })).toHaveCount(0);
  });

  test('el matrimonio ve su código para compartirlo', async ({ page }) => {
    await page.goto('/perfil/acompanar');
    const main = page.getByRole('main');

    await expect(main.getByText('PADRINOS-7C4A19')).toBeVisible();
    await expect(main.getByText('Comparte este código', { exact: false })).toBeVisible();
  });

  test('una invitación pendiente se puede aceptar o posponer', async ({ page }) => {
    await page.goto('/perfil/acompanar');
    const main = page.getByRole('main');

    await expect(main.getByText('Noemí y Elías')).toBeVisible();
    await expect(main.getByRole('button', { name: 'Aceptar' })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Ahora no' })).toBeVisible();
  });
});
