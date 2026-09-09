import { expect, test } from '@playwright/test';

/**
 * Segunda mirada (RF-DES-13). Lo que protege: cuando alguien vuelve a
 * Descubrir tras un paso vencido, la tarjeta lo dice y dice qué cambió; el
 * resto de tarjetas no llevan la etiqueta. Nunca aparece como reproche ni
 * como cuenta atrás.
 */
test.describe('Segunda mirada', () => {
  test('la tarjeta que vuelve lo dice y explica qué cambió', async ({ page }) => {
    await page.goto('/descubrir');
    const chips = page.getByText('Segunda mirada', { exact: true });
    await expect(chips).toHaveCount(1);
    const card = page.getByRole('article').filter({ hasText: 'Daniela' }).first();
    await expect(card.getByText('Segunda mirada', { exact: true })).toBeVisible();
    await expect(card).toContainText('fotos nuevas');
    await expect(card).not.toContainText(/racha|perdiste|te quedan/i);
  });
});
