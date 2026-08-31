import { expect, test } from '@playwright/test';

/**
 * Evento como presentación, y plan del primer encuentro.
 *
 * Two promises the interface has to make visible, because they are the reason
 * either feature can be trusted: coinciding at an event is a real, checkable
 * fact that turns a suggestion into an introduction; and a safety plan is
 * yours alone, with no third party's phone number anywhere near it.
 */
test.describe('Coincidir en un evento', () => {
  test('el motivo de la sugerencia es el evento, y lleva a él', async ({ page }) => {
    await page.goto('/descubrir');
    const main = page.getByRole('main');

    const reason = main.getByRole('link', {
      name: /Los dos van a «Vigilia de jóvenes adultos»/,
    });
    await expect(reason).toBeVisible();
    await expect(reason).toHaveAttribute('href', '/eventos/ev-vigilia');
  });

  test('coincidir gana a compartir denominación', async ({ page }) => {
    // Una etiqueta compartida no es un plan; estar en la misma sala sí.
    await page.goto('/descubrir');
    const main = page.getByRole('main');

    await expect(main.getByText('Los dos van a', { exact: false }).first()).toBeVisible();
  });
});

test.describe('Plan del primer encuentro', () => {
  test('dice que es privado antes de pedir nada', async ({ page }) => {
    await page.goto('/conexiones/m-mariel');
    const card = page.getByRole('region', { name: 'Plan del primer encuentro' });

    await expect(card.getByText('la otra persona no lo ve', { exact: false })).toBeVisible();
  });

  test('nunca pide el teléfono del contacto de confianza', async ({ page }) => {
    await page.goto('/conexiones/m-mariel');
    const card = page.getByRole('region', { name: 'Plan del primer encuentro' });
    await card.getByRole('button', { name: 'Plan del primer encuentro' }).click();

    await expect(card.getByLabel('¿A quién le vas a avisar?')).toBeVisible();
    await expect(
      card.getByText('Nunca pedimos ni guardamos su teléfono', { exact: false }),
    ).toBeVisible();
    // Lo que no debe existir en ninguna parte del formulario.
    await expect(card.getByLabel(/tel[eé]fono/i)).toHaveCount(0);
    await expect(card.locator('input[type="tel"]')).toHaveCount(0);
  });

  test('guardar el plan produce el mensaje que la persona manda', async ({ page }) => {
    await page.goto('/conexiones/m-mariel');
    const card = page.getByRole('region', { name: 'Plan del primer encuentro' });
    await card.getByRole('button', { name: 'Plan del primer encuentro' }).click();

    await card.getByLabel('¿Dónde se van a ver?').fill('Café Mamá Chila, Naco');
    await card.getByLabel('¿Cuándo?').fill('2026-09-06T19:00');
    await card.getByLabel('¿A quién le vas a avisar?').fill('mi hermana Rosa');
    await card.getByRole('button', { name: 'Guardar el plan' }).click();

    // El mensaje lo escribe la app; lo manda la persona.
    await expect(card.getByText('Café Mamá Chila, Naco').first()).toBeVisible();
    await expect(card.getByText('Te aviso cuando llegue a casa.')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Enviar el mensaje' })).toBeVisible();
    await expect(card.getByText('Todavía no le has avisado a nadie.')).toBeVisible();
  });

  test('el plan recuerda un lugar público', async ({ page }) => {
    await page.goto('/conexiones/m-mariel');
    const card = page.getByRole('region', { name: 'Plan del primer encuentro' });
    await card.getByRole('button', { name: 'Plan del primer encuentro' }).click();

    await expect(card.getByText('Un lugar público, con gente alrededor.')).toBeVisible();
  });
});
