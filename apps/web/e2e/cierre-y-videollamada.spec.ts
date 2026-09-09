import { expect, test } from '@playwright/test';

/**
 * Cierre digno (RF-CON-11) y videollamada dentro de la app (RF-CON-12).
 * Lo que protegen: cerrar una conexión ya no es un «¿seguro?» sino elegir
 * una palabra amable; proponer una videollamada queda listada y se puede
 * entrar solo cuando está abierta.
 */
test.describe('Cierre digno', () => {
  test('ofrece plantillas amables y la opción de escribir la propia', async ({ page }) => {
    await page.goto('/conexiones/m-mariel');
    await page.getByRole('button', { name: 'Opciones' }).click();
    await page.getByRole('button', { name: 'Cerrar esta conexión' }).click();

    const dialog = page.getByRole('dialog', { name: 'Cerrar esta conexión' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('radio')).toHaveCount(4);
    await expect(dialog.getByText('Siento que no es por aquí', { exact: false })).toBeVisible();

    await dialog.getByText('Escribir el mío').click();
    const confirm = dialog.getByRole('button', { name: 'Cerrar con este mensaje' });
    await expect(confirm).toBeDisabled();
    await dialog
      .getByPlaceholder('Con tus palabras, breve y con respeto…')
      .fill('Gracias por todo, te deseo lo mejor.');
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(page).toHaveURL(/\/conexiones\?cerrada=/);
  });
});

test.describe('Videollamada', () => {
  test('propone una hora y la lista con su estado', async ({ page }) => {
    await page.goto('/conexiones/m-mariel');
    await page.getByRole('button', { name: 'Opciones' }).click();
    await page.getByRole('button', { name: 'Videollamada' }).click();

    const dialog = page.getByRole('dialog', { name: 'Videollamada' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('No hay videollamadas propuestas.')).toBeVisible();
    await dialog.getByRole('button', { name: 'Proponer hora' }).click();
    await expect(dialog.getByRole('status')).toContainText('Videollamada propuesta');
    await expect(dialog.getByRole('listitem')).toHaveCount(1);
    await expect(dialog.getByRole('button', { name: 'Entrar' })).toBeDisabled();
  });
});
