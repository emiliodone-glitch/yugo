import { expect, test } from '@playwright/test';

/**
 * Razones de afinidad visibles (RF-DES-02) y comunidad que alimenta
 * Descubrir. Lo que protegen: la tarjeta trae razones que se pueden
 * comprobar, nunca un porcentaje; lo que ya hicieron juntos en Yugo aparece
 * como razón y como sección propia en la ficha.
 */
test.describe('Razones de afinidad', () => {
  test('la tarjeta de Descubrir lista dos o tres razones, sin porcentaje', async ({ page }) => {
    await page.goto('/descubrir');
    const reasons = page.getByRole('list', { name: 'Por qué esta persona' }).first();
    await expect(reasons).toBeVisible();
    await expect(reasons.getByRole('listitem')).toHaveCount(3);
    await expect(reasons).toContainText('Oraron por la misma petición este mes.');
    await expect(reasons).not.toContainText('%');
  });

  test('la ficha explica el porqué y lo que ya comparten en Yugo', async ({ page }) => {
    await page.goto('/descubrir/u-mariel');
    await expect(page.getByText('Por qué esta persona')).toBeVisible();
    await expect(page.getByText('Ambos buscan una relación con propósito de matrimonio.')).toBeVisible();
    await expect(page.getByText('Lo que ya comparten en Yugo')).toBeVisible();
    await expect(page.getByText('Grupo «Jóvenes adultos SD»')).toBeVisible();
    await expect(page.getByText('Oraron por la misma petición', { exact: true })).toBeVisible();
  });
});
