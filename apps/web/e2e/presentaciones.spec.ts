import { expect, test } from '@playwright/test';

/**
 * Presentación por padrino con doble consentimiento (RF-ACO-05). Lo que
 * protegen: quien recibe la presentación ve al padrino, su nota y la iglesia
 * de la otra persona, nunca su nombre; el «sí» doble abre la conversación; el
 * padrino tiene su formulario y ve el resultado sin saber quién dijo que no.
 */
test.describe('Presentación por padrino', () => {
  test('quien la recibe ve la nota y la iglesia, no a la persona; el sí doble abre el chat', async ({
    page,
  }) => {
    await page.goto('/conexiones');
    const card = page.getByRole('region', { name: 'Alguien quiere presentarte a una persona' });
    await expect(card).toBeVisible();
    await expect(card.getByText('Pastor Luis quiere presentarte a alguien')).toBeVisible();
    await expect(
      card.getByText('Se congrega en Iglesia Bíblica Emanuel', { exact: false }),
    ).toBeVisible();
    await expect(
      card.getByText('Si dices que no, nadie sabrá que fuiste tú', { exact: false }),
    ).toBeVisible();
    // Ningún nombre ni foto de la otra persona antes del sí.
    await expect(card.getByRole('img')).toHaveCount(0);

    await card.getByRole('button', { name: 'Sí, me gustaría' }).click();
    await expect(page).toHaveURL(/\/conexiones\/m-mariel/);
  });

  test('el padrino propone y ve el resultado de lo que propuso', async ({ page }) => {
    await page.goto('/perfil/acompanar');
    await expect(page.getByRole('heading', { name: 'Presentar a dos personas' })).toBeVisible();
    await expect(page.getByText('Se saludaron')).toBeVisible();
    await expect(page.getByText('Esperando respuesta')).toBeVisible();

    const send = page.getByRole('button', { name: 'Proponer presentación' });
    await expect(send).toBeDisabled();
    await page.getByLabel('Correo o teléfono de la primera persona').fill('ana@ejemplo.do');
    await page.getByLabel('Correo o teléfono de la segunda persona').fill('luis@ejemplo.do');
    await page
      .getByLabel('Por qué crees que deberían conocerse')
      .fill('Los dos sirven en jóvenes y los dos aman la música de adoración.');
    await expect(send).toBeEnabled();
    await send.click();
    await expect(page.getByRole('status')).toContainText('Presentación enviada');
    await expect(page.getByText('ana y luis')).toBeVisible();
  });
});
