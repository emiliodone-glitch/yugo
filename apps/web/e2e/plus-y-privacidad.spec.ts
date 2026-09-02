import { expect, test } from '@playwright/test';

/**
 * Flujo crítico 4 (RNF-09): paywall y compra de Plus/Oro, más los controles
 * que ninguna suscripción puede desactivar (RF-PLU-09).
 */
test.describe('Yugo Plus y Oro', () => {
  test('el paywall compara ambos niveles con precios en DOP (RF-PLU-01/06)', async ({ page }) => {
    await page.goto('/plus');

    await expect(page.getByRole('heading', { name: 'Elige tu nivel' })).toBeVisible();
    await expect(page.getByText('Yugo Plus')).toBeVisible();
    await expect(page.getByText('Yugo Oro')).toBeVisible();
    await expect(page.getByText('RD$ 2,990 / año')).toBeVisible();
    await expect(page.getByText('RD$ 6,990 / año')).toBeVisible();
    await expect(page.getByText('Más elegido')).toBeVisible();
    // Comunidad y eventos siguen gratis en cualquier nivel (6.9)
    await expect(page.getByText('Grupos y eventos siguen siendo gratis').first()).toBeVisible();
  });

  test('cambiar a mensual actualiza el precio mostrado', async ({ page }) => {
    await page.goto('/plus');
    await page.getByRole('tab', { name: 'Mensual' }).click();
    await expect(page.getByText('RD$ 399 / mes')).toBeVisible();
    await expect(page.getByText('RD$ 899 / mes')).toBeVisible();
  });

  test('elegir Plus cambia el botón de continuar', async ({ page }) => {
    await page.goto('/plus');
    await expect(page.getByRole('button', { name: 'Continuar con Oro' })).toBeVisible();
    await page.getByText('Intereses ilimitados').click();
    await expect(page.getByRole('button', { name: 'Continuar con Plus' })).toBeVisible();
  });
});

test.describe('Visibilidad y privacidad', () => {
  test('la regla mutua de edad se declara innegociable (RF-DES-11)', async ({ page }) => {
    await page.goto('/perfil/visibilidad');

    await expect(page.getByRole('heading', { name: 'Rango de edad' })).toBeVisible();
    await expect(page.getByText('Obligatorio')).toBeVisible();
    await expect(page.getByText('Esta regla no se puede desactivar')).toBeVisible();
  });

  test('los controles exclusivos de Oro están marcados como tales', async ({ page }) => {
    await page.goto('/perfil/visibilidad');

    const oroChips = page.getByText('Yugo Oro');
    await expect(oroChips.first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Modo invisible' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Modo viaje' })).toBeVisible();
    await expect(page.getByText('Quién vio mi perfil (30 días)')).toBeVisible();
  });

  test('el modo invisible explica su alcance exacto (RF-DES-12)', async ({ page }) => {
    await page.goto('/perfil/visibilidad');
    await expect(
      page.getByText('Tu perfil solo se muestra a las personas a quienes marcas interés', {
        exact: false,
      }),
    ).toBeVisible();
  });

  test('privacidad ofrece los derechos de la Ley 172-13 (RF-SEG-08)', async ({ page }) => {
    await page.goto('/perfil/privacidad');

    await expect(page.getByText('Ley 172-13', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Descargar mis datos' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Eliminar mi cuenta' })).toBeVisible();
    // Consejos de seguridad visibles en la app (RF-SEG-06)
    await expect(page.getByText('Antes de un primer encuentro')).toBeVisible();
    await expect(page.getByText('Cuidado con las estafas')).toBeVisible();
  });

  test('las páginas legales son públicas y versionadas', async ({ page }) => {
    await page.goto('/legal/privacidad');
    await expect(page.getByRole('heading', { name: 'Política de privacidad' })).toBeVisible();
    await expect(page.getByText('Versión 1.0', { exact: false })).toBeVisible();

    await page.goto('/legal/pacto');
    await expect(page.getByRole('heading', { name: 'Pacto de conducta' })).toBeVisible();
  });
});
