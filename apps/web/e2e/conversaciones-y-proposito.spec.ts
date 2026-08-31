import { expect, test } from '@playwright/test';

/**
 * Conversaciones que importan, y la insignia de propósito.
 *
 * Lo que la interfaz tiene que dejar claro: nadie ve la respuesta del otro
 * antes de escribir la suya, y la insignia se gana, no se compra.
 */
test.describe('Conversaciones que importan', () => {
  test('en «conociéndonos» se explica qué falta, no se esconde la sección', async ({ page }) => {
    await page.goto('/conexiones/m-mariel');
    const card = page.getByRole('region', { name: 'Conversaciones que importan' });

    await expect(card.getByText('Se abren cuando declaren «Amistad intencional».')).toBeVisible();
  });

  test('en amistad intencional ya hay preguntas, con su porqué', async ({ page }) => {
    // m-daniela viene sembrada en «Amistad intencional».
    await page.goto('/conexiones/m-daniela');
    const card = page.getByRole('region', { name: 'Conversaciones que importan' });

    await expect(card.getByText('Por qué esta pregunta', { exact: false })).toBeVisible();
    await expect(card.getByText('conversadas', { exact: false })).toBeVisible();
  });

  test('dice la regla que la hace útil', async ({ page }) => {
    await page.goto('/conexiones/m-daniela');
    const card = page.getByRole('region', { name: 'Conversaciones que importan' });

    await expect(
      card.getByText('Nadie ve la respuesta del otro antes de escribir la suya', { exact: false }),
    ).toBeVisible();
  });

  test('una respuesta pendiente de la otra persona no se filtra', async ({ page }) => {
    // «fe-practica» viene con la respuesta de la otra persona y sin la mía:
    // no puede aparecer en ninguna parte de la página.
    await page.goto('/conexiones/m-daniela');
    const card = page.getByRole('region', { name: 'Conversaciones que importan' });

    await expect(card.getByText('Ya contestó', { exact: false })).toBeVisible();
    await expect(page.getByText('se me nota en el día', { exact: false })).toHaveCount(0);
  });

  test('al contestar, se revelan las dos juntas', async ({ page }) => {
    await page.goto('/conexiones/m-daniela');
    const card = page.getByRole('region', { name: 'Conversaciones que importan' });

    await card.getByLabel('Tu respuesta').fill('Leo temprano, aunque no siempre me da.');
    await card.getByRole('button', { name: 'Guardar mi respuesta' }).click();

    await expect(card.getByText('Tú', { exact: true })).toBeVisible();
    await expect(card.getByText('La otra persona', { exact: true })).toBeVisible();
    // Ahora sí aparece la del otro, porque ya existen las dos.
    await expect(card.getByText('se me nota en el día', { exact: false })).toBeVisible();
  });

  test('no promete un puntaje de compatibilidad', async ({ page }) => {
    // Dos personas que no coinciden no están mal emparejadas: están informadas.
    await page.goto('/conexiones/m-daniela');
    const card = page.getByRole('region', { name: 'Conversaciones que importan' });

    await expect(card.getByText(/compatibilidad/i)).toHaveCount(0);
    await expect(card.getByText(/\d+\s*%/)).toHaveCount(0);
  });
});

test.describe('Perfil con propósito', () => {
  test('la insignia dice que se gana, no que se compra', async ({ page }) => {
    await page.goto('/descubrir');
    const main = page.getByRole('main');

    // Está en la tarjeta y su explicación no menciona ningún plan de pago.
    const badge = main.getByText('Perfil con propósito').first();
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute('title', /No se compra/);
  });

  test('no aparece ningún puntaje de propósito en la interfaz', async ({ page }) => {
    // Un número visible se convierte en un juego de estatus y la gente
    // aprende a moverlo en vez de a comportarse.
    await page.goto('/descubrir');
    const main = page.getByRole('main');

    await expect(main.getByText(/propósito.*\d+\s*\/\s*100/i)).toHaveCount(0);
    await expect(main.getByText(/puntaje de propósito/i)).toHaveCount(0);
  });
});
