import { expect, test } from '@playwright/test';

/**
 * Comunidad (RF-COM-02/05). Lo que protegen: aceptar o rechazar una
 * solicitud de entrada surte efecto, proponer un grupo lo deja «en revisión»
 * entre los míos, y las reacciones del muro se guardan y se pueden quitar.
 */
test.describe('Solicitudes de entrada', () => {
  test('aceptar una solicitud la resuelve y lo confirma', async ({ page }) => {
    await page.goto('/comunidad/g-ja-sde');
    await page.getByRole('tab', { name: /Miembros/ }).click();
    const main = page.getByRole('main');
    await expect(main.getByText('Raúl Féliz')).toBeVisible();
    await main.getByRole('button', { name: 'Aceptar' }).click();
    await expect(main.getByRole('status').filter({ hasText: 'Solicitud aceptada' })).toBeVisible();
    await expect(main.getByText('Raúl Féliz')).toHaveCount(0);
  });

  test('rechazar una solicitud la quita de la cola', async ({ page }) => {
    await page.goto('/comunidad/g-ja-sde');
    await page.getByRole('tab', { name: /Miembros/ }).click();
    const main = page.getByRole('main');
    await main.getByRole('button', { name: 'Rechazar' }).click();
    await expect(main.getByRole('status').filter({ hasText: 'Solicitud rechazada' })).toBeVisible();
    await expect(main.getByText('Raúl Féliz')).toHaveCount(0);
  });
});

test.describe('Proponer un grupo', () => {
  test('el grupo propuesto aparece en «Mis grupos» en revisión', async ({ page }) => {
    await page.goto('/comunidad');
    await page.getByRole('button', { name: 'Proponer un grupo' }).click();

    const form = page.getByRole('form', { name: 'Proponer un grupo' });
    await expect(form).toBeVisible();
    const send = form.getByRole('button', { name: 'Enviar' });
    await expect(send).toBeDisabled();
    await form.getByLabel('Nombre del grupo').fill('Corredores de fe');
    await form
      .getByLabel('De qué va y para quién es')
      .fill('Salimos a correr los sábados temprano y oramos juntos al terminar.');
    await form.getByLabel('Categoría').selectOption('deportes');
    await expect(send).toBeEnabled();
    await send.click();

    await expect(page.getByRole('status').filter({ hasText: 'quedó en revisión' })).toBeVisible();
    const card = page.getByRole('main').locator('a', { hasText: 'Corredores de fe' });
    await expect(card).toBeVisible();
    await expect(card.getByText('En revisión')).toBeVisible();
  });
});

test.describe('Reacciones del muro', () => {
  test('«Amén» suma al tocar y se quita al volver a tocar', async ({ page }) => {
    await page.goto('/comunidad/g-ja-sde');
    const amen = page
      .getByRole('main')
      .getByRole('button', { name: /^Amén · \d+$/ })
      .first();
    await expect(amen).toBeVisible();
    const before = Number((await amen.textContent())?.match(/\d+$/)?.[0]);
    await amen.click();
    await expect(amen).toHaveAttribute('aria-pressed', 'true');
    await expect(amen).toHaveText(new RegExp(`Amén · ${before + 1}$`));
    await amen.click();
    await expect(amen).toHaveAttribute('aria-pressed', 'false');
    await expect(amen).toHaveText(new RegExp(`Amén · ${before}$`));
  });
});
