import { expect, test } from '@playwright/test';

/**
 * Cola de retenidos del panel.
 *
 * Lo que cuida: que lo retenido llegue con su texto delante (una cola sin
 * contenido no se puede resolver), que aprobar cierre el ciclo hasta el muro
 * de oración, y que quien modera vea de quién es una petición anónima sin que
 * la etiqueta le deje olvidar lo grave que sería filtrarla.
 */
test.describe('Retenidos por la moderación automática', () => {
  test('la pestaña abre en retenidos y trae el texto de cada cosa', async ({ page }) => {
    await page.goto('/admin/moderacion');
    const queue = page.getByRole('region', { name: 'Retenidos por la moderación automática' });

    await expect(queue).toBeVisible();
    await expect(queue.getByText('3 personas esperan una respuesta.')).toBeVisible();
    // El texto está, no solo un contador.
    await expect(queue.getByText('Mejor seguimos por telegram', { exact: false })).toBeVisible();
    await expect(queue.getByText('escríbanme al whatsapp', { exact: false })).toBeVisible();
  });

  test('una petición anónima dice quién la escribió y que es anónima para la comunidad', async ({
    page,
  }) => {
    // Quien modera es personal del equipo y necesita saberlo para decidir. La
    // etiqueta existe para que no olvide que fuera de aquí no tiene nombre.
    await page.goto('/admin/moderacion');
    const card = page.locator('li', { hasText: 'escríbanme al whatsapp' });

    await expect(card.getByText('Ramón')).toBeVisible();
    await expect(card.getByText('anónima para la comunidad', { exact: false })).toBeVisible();
  });

  test('cada tarjeta dice qué tipo de contenido es', async ({ page }) => {
    await page.goto('/admin/moderacion');

    await expect(page.locator('li', { hasText: 'telegram' }).locator('.chip', { hasText: /^Mensaje/ })).toBeVisible();
    await expect(page.locator('li', { hasText: 'telegram' }).getByText('Riesgo estimado 71%', { exact: false })).toBeVisible();
    await expect(page.locator('li', { hasText: 'perdonar a mi hermano' }).locator('.chip', { hasText: /^Reflexión$/ })).toBeVisible();
    await expect(page.locator('li', { hasText: 'whatsapp' }).locator('.chip', { hasText: /^Petición de oración$/ })).toBeVisible();
  });

  test('rechazar retira la tarjeta y dice que se avisó a la persona', async ({ page }) => {
    await page.goto('/admin/moderacion');
    const card = page.locator('li', { hasText: 'telegram' });

    await card.getByRole('button', { name: 'No publicar' }).click();

    await expect(page.getByText('No publicado. Se avisó a la persona.')).toBeVisible();
  });

  test('aprobar deja un recibo y baja el contador de quienes esperan', async ({ page }) => {
    // El ciclo completo —aprobar y verla aparecer en el muro— se comprueba en
    // la suite de humo contra la API real; el estado de la demo vive en
    // memoria y no sobrevive a un cambio de página.
    await page.goto('/admin/moderacion');
    const card = page.locator('li', { hasText: 'escríbanme al whatsapp' });

    await expect(page.getByText('3 personas esperan una respuesta.')).toBeVisible();
    await card.getByRole('button', { name: 'Publicar', exact: true }).click();

    await expect(page.getByText('Publicado. Se avisó a la persona.')).toBeVisible();
    await expect(page.getByText('2 personas esperan una respuesta.')).toBeVisible();
    await expect(page.getByText('escríbanme al whatsapp', { exact: false })).toHaveCount(0);
  });

  test('explica que las dos respuestas avisan a la persona', async ({ page }) => {
    await page.goto('/admin/moderacion');

    await expect(
      page.getByText('las dos respuestas importan igual', { exact: false }),
    ).toBeVisible();
  });

  test('cuando no queda nada, lo dice en positivo sin borrar los recibos', async ({ page }) => {
    await page.goto('/admin/moderacion');
    for (const label of ['telegram', 'whatsapp', 'perdonar a mi hermano']) {
      const card = page.locator('li', { hasText: label });
      await card.getByRole('button', { name: 'Publicar', exact: true }).click();
    }

    await expect(page.getByText('No hay nada retenido', { exact: false })).toBeVisible();
    // Los tres recibos siguen ahí: quien modera sabe qué hizo.
    await expect(page.getByText('Publicado. Se avisó a la persona.')).toHaveCount(3);
    await expect(page.getByText('esperan una respuesta', { exact: false })).toHaveCount(0);
  });
});
