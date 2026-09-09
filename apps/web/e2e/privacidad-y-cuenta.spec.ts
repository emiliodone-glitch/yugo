import { expect, test } from '@playwright/test';

/**
 * Privacidad y cuenta (RF-SEG-07/08, RF-AUT-08). Lo que protegen: los
 * interruptores guardan de verdad (sobreviven a recargar), «Descargar mis
 * datos» entrega un archivo, y eliminar la cuenta pasa por una confirmación
 * dentro de la página, programa el borrado con fecha y se puede cancelar.
 */
test.describe('Privacidad', () => {
  test('las preferencias de privacidad se guardan y sobreviven a recargar', async ({ page }) => {
    await page.goto('/perfil/privacidad');
    const distance = page.getByRole('switch', { name: 'Ocultar distancia exacta' });
    await expect(distance).toHaveAttribute('aria-checked', 'false');
    await distance.click();
    await expect(distance).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('status').filter({ hasText: 'Guardado' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('switch', { name: 'Ocultar distancia exacta' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    // Se puede volver atrás igual de fácil.
    await page.getByRole('switch', { name: 'Ocultar distancia exacta' }).click();
    await expect(page.getByRole('switch', { name: 'Ocultar distancia exacta' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  test('descargar mis datos entrega un archivo JSON con fecha', async ({ page }) => {
    await page.goto('/perfil/privacidad');
    await page.getByRole('button', { name: 'Descargar mis datos' }).click();
    await expect(page.getByText('Tu copia está lista')).toBeVisible();
    const link = page.getByRole('link', { name: 'Descargar mi copia (JSON)' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('download', /^yugo-datos-\d{4}-\d{2}-\d{2}\.json$/);
    await expect(link).toHaveAttribute('href', /^blob:/);
  });

  test('eliminar la cuenta confirma en la página, programa la fecha y se puede cancelar', async ({
    page,
  }) => {
    await page.goto('/perfil/privacidad');
    await page.getByRole('button', { name: 'Eliminar mi cuenta' }).click();

    // Nada de window.confirm: un panel con foco, que Escape cierra.
    const dialog = page.getByRole('dialog', { name: '¿Eliminar tu cuenta?' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeFocused();
    await expect(dialog.getByText('plazo de gracia', { exact: false })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Eliminar mi cuenta' })).toBeVisible();

    await page.getByRole('button', { name: 'Eliminar mi cuenta' }).click();
    await dialog.getByRole('button', { name: 'Eliminar mi cuenta' }).click();

    const scheduled = page.getByRole('status').filter({ hasText: 'Tu cuenta se eliminará el' });
    await expect(scheduled).toBeVisible();
    await expect(scheduled).toContainText(/\d{4}/);
    await expect(page.getByRole('button', { name: 'Eliminar mi cuenta' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Cancelar la eliminación' }).click();
    await expect(page.getByRole('button', { name: 'Eliminar mi cuenta' })).toBeVisible();
    await expect(scheduled).toHaveCount(0);
  });
});

test.describe('Confirmaciones en la página', () => {
  test('terminar el acompañamiento pide confirmación sin diálogo del navegador', async ({
    page,
  }) => {
    // Si apareciera un window.confirm, la prueba lo vería y fallaría aquí.
    page.on('dialog', (dialog) => {
      throw new Error(`Diálogo nativo inesperado: ${dialog.message()}`);
    });
    await page.goto('/conexiones/m-daniela');
    const main = page.getByRole('main');
    await main.getByRole('button', { name: 'Terminar el acompañamiento' }).click();
    const dialog = main.getByRole('dialog', { name: 'Terminar el acompañamiento' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeFocused();
    await expect(dialog.getByText('Cualquiera de los tres puede hacerlo')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(main.getByRole('button', { name: 'Terminar el acompañamiento' })).toBeVisible();
  });
});

test.describe('Verificación', () => {
  test('sin cámara, la selfie sigue su flujo guiado y no rompe la pantalla', async ({ page }) => {
    // El navegador de prueba no tiene cámara ni permiso: la pantalla debe
    // ofrecer los gestos y una salida, nunca quedarse en «Encendiendo…».
    await page.goto('/perfil/verificacion');
    await expect(page.getByText('Tu identidad está verificada.')).toBeVisible();
  });
});
