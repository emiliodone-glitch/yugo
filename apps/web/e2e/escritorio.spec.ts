import { expect, test } from '@playwright/test';

/**
 * La web en escritorio es una web, no un teléfono estirado: las pantallas de
 * acceso llevan un panel con lo que hay dentro, Conexiones muestra lista y
 * conversación lado a lado, y /estado dice si la web llega a la API. En el
 * teléfono nada de eso aparece: se conserva el flujo de la app.
 */
test.describe('Escritorio', () => {
  test('entrar muestra el panel de bienvenida solo en pantalla ancha', async ({
    page,
  }, testInfo) => {
    await page.goto('/entrar');
    await expect(page.getByRole('heading', { name: 'Entra a Yugo' })).toBeVisible();
    const inside = page.getByLabel('Lo que hay dentro');
    if (testInfo.project.name === 'desktop') {
      await expect(inside).toBeVisible();
      await expect(inside.getByText('Guarda tu corazón', { exact: true })).toBeVisible();
    } else {
      await expect(inside).toBeHidden();
    }
  });

  test('conexiones: lista y chat lado a lado en escritorio, una pantalla a la vez en el teléfono', async ({
    page,
  }, testInfo) => {
    await page.goto('/conexiones/m-daniela');
    await expect(page.getByPlaceholder('Escribe un mensaje…')).toBeVisible();
    const listTitle = page.getByRole('heading', { name: 'Conexiones', level: 1 });
    if (testInfo.project.name === 'desktop') {
      await expect(listTitle).toBeVisible();
      // La fila abierta queda marcada.
      await expect(page.locator('a[aria-current="page"]')).toHaveCount(1);
    } else {
      await expect(listTitle).toBeHidden();
    }
  });

  test('conexiones sin conversación elegida invita a elegir una (solo escritorio)', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'En el teléfono el índice es la lista.');
    await page.goto('/conexiones');
    await expect(page.getByRole('heading', { name: 'Conexiones', level: 1 })).toBeVisible();
    await expect(page.getByText('Elige una conversación')).toBeVisible();
  });

  test('/estado dice qué URL de API tiene la web y el resultado de la prueba', async ({ page }) => {
    await page.goto('/estado');
    await expect(page.getByRole('heading', { name: '¿La web llega a la API?' })).toBeVisible();
    await expect(page.getByText('API configurada')).toBeVisible();
    await expect(page.getByText(/\/v1$/)).toBeVisible();
    // La prueba en vivo termina en uno de los tres estados; nunca se queda cargando.
    const probe = page.getByRole('status');
    await expect(probe).not.toContainText('Cargando', { timeout: 15_000 });
    await expect(page.getByRole('link', { name: /Volver a entrar/ })).toBeVisible();
  });
});
