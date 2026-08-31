import { expect, test } from '@playwright/test';

/**
 * Encuentros convocados por una congregación.
 *
 * The rule under test is the one money used to break: capacity is the number
 * of chairs in the room, and no plan makes the room bigger. A full encuentro
 * offers a waitlist, not a way past the limit.
 */
test.describe('Encuentros convocados', () => {
  test('un encuentro de solteros se identifica como tal', async ({ page }) => {
    await page.goto('/eventos/ev-congreso');
    const main = page.getByRole('main');

    await expect(main.getByText('Encuentro de solteros')).toBeVisible();
    await expect(main.getByText('Convoca Centro Cristiano Vida Nueva')).toBeVisible();
  });

  test('un encuentro lleno lo dice y ofrece lista de espera, no una salida pagando', async ({
    page,
  }) => {
    await page.goto('/eventos/ev-congreso');
    const main = page.getByRole('main');

    await expect(main.getByText('Sin cupo')).toBeVisible();
    await expect(main.getByText('14 en lista de espera')).toBeVisible();
    await expect(
      main.getByRole('button', { name: 'Anotarme en la lista de espera' }),
    ).toBeVisible();
    // Lo que no debe aparecer: ninguna oferta de saltarse el cupo.
    await expect(main.getByText('Hazte Oro', { exact: false })).toHaveCount(0);
  });

  test('el cupo se explica sin rodeos', async ({ page }) => {
    await page.goto('/eventos/ev-congreso');
    await expect(
      page.getByRole('main').getByText('El cupo es el que cabe en el salón'),
    ).toBeVisible();
  });

  test('anotarse en la lista de espera explica qué pasa después', async ({ page }) => {
    await page.goto('/eventos/ev-congreso');
    const main = page.getByRole('main');

    await main.getByRole('button', { name: 'Anotarme en la lista de espera' }).click();
    await expect(main.getByText('Si alguien cancela', { exact: false })).toBeVisible();
  });

  test('un evento sin cupo no habla de plazas', async ({ page }) => {
    await page.goto('/eventos/ev-vigilia');
    const main = page.getByRole('main');

    await expect(main.getByText('Sin cupo')).toHaveCount(0);
    await expect(main.getByText('lista de espera', { exact: false })).toHaveCount(0);
  });
});

test.describe('Ministerio de solteros', () => {
  test('la congregación ve totales de lo que convoca', async ({ page }) => {
    await page.goto('/iglesias/solteros');
    const main = page.getByRole('main');

    await expect(main.getByText('Solteros respaldados')).toBeVisible();
    await expect(main.getByText('Encuentros realizados')).toBeVisible();
    await expect(main.getByText('Asistencia real')).toBeVisible();
    await expect(main.getByText('Congreso de solteros con propósito')).toBeVisible();
  });

  test('la lista de espera se presenta como la señal que es', async ({ page }) => {
    await page.goto('/iglesias/solteros');
    await expect(
      page.getByRole('main').getByText('hace falta un salón más grande', { exact: false }),
    ).toBeVisible();
  });

  test('el panel dice qué no muestra', async ({ page }) => {
    await page.goto('/iglesias/solteros');
    const main = page.getByRole('main');

    await expect(
      main.getByText('Nunca muestra quién asiste', { exact: false }),
    ).toBeVisible();
  });
});
