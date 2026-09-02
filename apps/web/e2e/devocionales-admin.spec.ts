import { expect, test } from '@playwright/test';

/**
 * Autoría de devocionales desde el panel.
 *
 * Existe porque el devocional se construyó sin nadie que lo alimentara. Lo que
 * cuida: que la reserva se vea en grande y avise cuando es corta, que se pueda
 * escribir el siguiente día libre, y que un devocional ya leído no se toque.
 */
test.describe('Devocionales · calendario', () => {
  test('está en el menú del panel, bajo Comunidad', async ({ page }) => {
    await page.goto('/admin');

    await page.getByRole('link', { name: 'Devocionales' }).click();
    await expect(page.getByRole('heading', { name: 'Devocionales · calendario' })).toBeVisible();
  });

  test('la reserva se ve en grande y avisa cuando es corta', async ({ page }) => {
    // La demo trae cuatro días a propósito: es el estado que dispara el aviso.
    await page.goto('/admin/devocionales');

    await expect(page.getByText('Quedan 4 días programados')).toBeVisible();
    await expect(page.getByText('Menos de una semana', { exact: false })).toBeVisible();
    await expect(page.getByText('Cuando llega a cero', { exact: false })).toBeVisible();
  });

  test('el de hoy y los pasados ya no se pueden reescribir', async ({ page }) => {
    // Lo que alguien leyó fue lo que leyó.
    await page.goto('/admin/devocionales');

    await page.getByRole('button', { name: /Guarda tu corazón/ }).click();
    await expect(page.getByText('Ya lo leyeron 312 personas', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  test('escribir el siguiente día libre sube la reserva', async ({ page }) => {
    await page.goto('/admin/devocionales');

    await page.getByRole('button', { name: /^Escribir el del/ }).first().click();
    await page.getByLabel('Referencia bíblica').fill('Miqueas 6:8');
    await page.getByLabel('Título').fill('Qué pide de ti');
    await page
      .getByLabel('Texto')
      .fill('Hacer justicia, amar misericordia y humillarte ante tu Dios. Tres verbos, y ninguno es «sentir».');
    await page.getByLabel('Pregunta para pensarlo').fill('¿Cuál de los tres te cuesta más esta semana?');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText('Guardado.')).toBeVisible();
    await expect(page.getByText('Quedan 5 días programados')).toBeVisible();
  });

  test('no deja guardar un texto demasiado corto para ser un devocional', async ({ page }) => {
    await page.goto('/admin/devocionales');

    await page.getByRole('button', { name: /^Escribir el del/ }).first().click();
    await page.getByLabel('Referencia bíblica').fill('Salmo 1');
    await page.getByLabel('Título').fill('Corto');
    await page.getByLabel('Texto').fill('Muy corto.');
    await page.getByLabel('Pregunta para pensarlo').fill('¿Por qué tan corto?');

    await expect(page.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  test('quitar uno programado que nadie leyó baja la reserva', async ({ page }) => {
    await page.goto('/admin/devocionales');

    // El de mañana no tiene lecturas: se puede quitar. Quitarlo abre un hueco
    // y la reserva pasa a ser solo hoy.
    const tomorrow = page.locator('li', { hasText: 'Mejores son dos' });
    await tomorrow.getByRole('button', { name: 'Quitar' }).click();

    await expect(page.getByText('Queda 1 día programado')).toBeVisible();
  });
});
