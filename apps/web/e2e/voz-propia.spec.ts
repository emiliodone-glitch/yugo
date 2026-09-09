import { expect, test } from '@playwright/test';

/**
 * Perfil con voz propia (RF-PER-09/12): tres respuestas en las palabras de la
 * persona y un audio de testimonio moderado. Lo que protegen estas pruebas:
 * que la pantalla existe y se puede responder, que las respuestas salen en
 * la ficha de afinidad de otra persona, y que el catálogo se administra
 * desde el panel.
 */
test.describe('Tu voz', () => {
  test('permite responder una pregunta nueva y guardarla', async ({ page }) => {
    await page.goto('/perfil/voz');

    await expect(page.getByRole('heading', { name: 'Tu voz', exact: true })).toBeVisible();
    await expect(page.getByText('Tres preguntas, en tus palabras')).toBeVisible();
    // La demo ya trae una respuesta; el contador lo dice.
    await expect(page.getByText('1 de 3 respondidas')).toBeVisible();

    await page.getByRole('button', { name: 'Cómo sirvo en mi iglesia…' }).click();
    const box = page.getByPlaceholder('Escribe tu respuesta…').last();
    await box.fill('Sonido los domingos y jóvenes los viernes.');
    await page.getByRole('button', { name: 'Guardar respuesta' }).last().click();

    await expect(page.getByRole('status')).toContainText('Respuesta guardada');
    await expect(page.getByText('2 de 3 respondidas')).toBeVisible();
  });

  test('explica que el audio pasa por una persona antes de publicarse', async ({ page }) => {
    await page.goto('/perfil/voz');
    await expect(page.getByText('Tu testimonio en tu voz')).toBeVisible();
    await expect(page.getByText('Lo escucha una persona del equipo', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Grabar' })).toBeVisible();
  });

  test('las respuestas salen en la ficha de afinidad de la otra persona', async ({ page }) => {
    await page.goto('/descubrir/u-mariel');
    await expect(page.getByText('En sus palabras')).toBeVisible();
    await expect(page.getByText('Un versículo que me sostuvo y por qué…')).toBeVisible();
    await expect(page.getByText('Rut 1:16. Cuando mi papá enfermó', { exact: false })).toBeVisible();
  });

  test('el perfil enlaza a «Tus respuestas y tu voz»', async ({ page }) => {
    await page.goto('/perfil/editar');
    await page.getByRole('link', { name: /Tus respuestas y tu voz/ }).click();
    await expect(page).toHaveURL(/\/perfil\/voz/);
  });

  test('el panel administra el catálogo de preguntas', async ({ page }) => {
    await page.goto('/admin/configuracion');
    await expect(page.getByText('Preguntas de perfil («Tu voz»)')).toBeVisible();
    const first = page.getByLabel('Pregunta 1', { exact: true });
    await expect(first).toHaveValue('Un versículo que me sostuvo y por qué…');
    await page.getByRole('button', { name: '+ Añadir pregunta' }).click();
    const added = page.getByLabel(/^Pregunta \d+$/).last();
    await added.fill('Lo que aprendí sirviendo este año…');
    await page.getByRole('button', { name: 'Guardar catálogo' }).click();
    await expect(page.getByRole('status')).toContainText('Catálogo guardado');
  });
});
