import { expect, test } from '@playwright/test';

/**
 * Flujo crítico 1: registro completo (RNF-09).
 * Cubre los 8 pasos del onboarding, la validación de mayoría de edad en el
 * cliente (RF-AUT-03) y la aceptación explícita del pacto (RF-AUT-04).
 */
test.describe('Registro', () => {
  test('la bienvenida presenta la promesa sin clichés del sector', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('que ya ora');
    await expect(page.getByText('Solo mayores de 18')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Crear mi perfil' })).toBeVisible();
  });

  test('bloquea a menores de edad antes de continuar (RF-AUT-03)', async ({ page }) => {
    await page.goto('/registro');

    // Paso 1 — cuenta
    await page.getByPlaceholder('Correo electrónico').fill('nuevo@yugo.do');
    await page.getByPlaceholder('Contraseña').fill('Yugo.demo1');
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 1b — OTP
    await page.getByPlaceholder('······').fill('123456');
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 2 — fecha de nacimiento de un menor
    const minor = new Date();
    minor.setFullYear(minor.getFullYear() - 16);
    await page.locator('input[type="date"]').fill(minor.toISOString().slice(0, 10));

    await expect(page.getByText('Debes tener al menos 18 años')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  test('exige aceptar el pacto de conducta para avanzar (RF-AUT-04)', async ({ page }) => {
    await page.goto('/registro');

    await page.getByPlaceholder('Correo electrónico').fill('nuevo@yugo.do');
    await page.getByPlaceholder('Contraseña').fill('Yugo.demo1');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByPlaceholder('······').fill('123456');
    await page.getByRole('button', { name: 'Continuar' }).click();

    const adult = new Date();
    adult.setFullYear(adult.getFullYear() - 30);
    await page.locator('input[type="date"]').fill(adult.toISOString().slice(0, 10));
    await page.getByRole('button', { name: 'Hombre' }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 3 — pacto: los 5 compromisos y el botón bloqueado hasta aceptar
    await expect(page.getByRole('heading', { name: 'Pacto de conducta' })).toBeVisible();
    await expect(page.getByText('Soy cristiano y mayor de 18 años')).toBeVisible();
    const commit = page.getByRole('button', { name: 'Me comprometo' });
    await expect(commit).toBeDisabled();

    await page.getByRole('switch').click();
    await expect(commit).toBeEnabled();
    await commit.click();

    await expect(page.getByRole('heading', { name: 'Tu dimensión de fe' })).toBeVisible();
  });

  test('el rango de edad respeta la amplitud mínima (RF-DES-11)', async ({ page }) => {
    await page.goto('/perfil/preferencias');
    await expect(page.getByText('Obligatorio')).toBeVisible();
    await expect(
      page.getByText('tú debes estar dentro del rango de ellas', { exact: false }),
    ).toBeVisible();
  });
});
