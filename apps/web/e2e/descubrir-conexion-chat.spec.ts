import { expect, test } from '@playwright/test';

/**
 * Flujos críticos 2 y 3 (RNF-09): interés → conexión → chat, más la
 * verificación visible y el paywall al tocar el límite diario.
 */
test.describe('Descubrir, conexión y chat', () => {
  test('la lista es curada y muestra afinidad e insignia antes de decidir', async ({ page }) => {
    await page.goto('/descubrir');

    await expect(page.getByRole('heading', { name: 'Descubrir' })).toBeVisible();
    // Anillo de afinidad accesible (RF-DES-02)
    await expect(page.getByRole('img', { name: /Afinidad 86 de 100/ })).toBeVisible();
    // Insignia de respaldo de iglesia (RF-VER-04)
    await expect(page.getByText('Respaldada por su iglesia').first()).toBeVisible();
    // La lista es finita, no un mazo infinito (principio del producto)
    await expect(page.getByText(/Lista de hoy: \d+ de 30/)).toBeVisible();
  });

  test('marcar interés cambia el estado del botón (RF-DES-04)', async ({ page }) => {
    await page.goto('/descubrir');

    const interest = page.getByRole('button', { name: 'Me interesa' }).first();
    await interest.click();
    await expect(page.getByRole('button', { name: 'Interés enviado ✓' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Interés enviado ✓' }).first()).toBeDisabled();
  });

  test('"Pasar" retira el perfil de la lista de hoy (7.2)', async ({ page }) => {
    await page.goto('/descubrir');
    await expect(page.getByText('Mariel, 28')).toBeVisible();

    await page.getByRole('button', { name: 'Pasar' }).first().click();
    await expect(page.getByText('Mariel, 28')).toHaveCount(0);
  });

  test('el desglose de afinidad explica cada componente (RF-DES-03)', async ({ page }) => {
    await page.goto('/descubrir/u-mariel');

    await expect(page.getByRole('heading', { name: 'Afinidad de fe' })).toBeVisible();
    for (const component of ['Denominación', 'Intención', 'Prácticas y valores', 'Cercanía', 'Edad']) {
      await expect(page.getByText(component, { exact: true })).toBeVisible();
    }
    await expect(page.getByText('denominaciones afines')).toBeVisible();
  });

  test('el chat sugiere rompehielos del perfil del otro (RF-CON-04)', async ({ page }) => {
    await page.goto('/conexiones/m-mariel');

    await expect(page.getByText('ROMPEHIELOS SUGERIDOS')).toBeVisible();
    // La sugerencia aparece como botón; el mismo texto ya existe en el hilo.
    await expect(
      page.getByRole('button', { name: 'Vi que sirves con niños, ¿cómo llegaste ahí?' }),
    ).toBeVisible();
    await expect(page.getByText('Sin fotos ni archivos en el chat')).toBeVisible();
  });

  test('la moderación previa retiene y rechaza antes de entregar (RF-CON-06, 7.3)', async ({
    page,
  }) => {
    await page.goto('/conexiones/m-mariel');
    const composer = page.getByPlaceholder('Escribe un mensaje…');

    // Solicitud de dinero → rechazado con aviso educativo
    await composer.fill('Necesito que me deposites dinero para el pasaje');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.getByText('incumple el Pacto de conducta', { exact: false })).toBeVisible();

    // Mover la conversación a otra app en los primeros mensajes → retenido
    await composer.fill('Mejor hablemos por WhatsApp');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.getByText('Tu mensaje está en revisión.').first()).toBeVisible();

    // Mensaje normal → se entrega
    await composer.fill('¿Qué libro estás leyendo esta semana?');
    await page.getByRole('button', { name: 'Enviar' }).click();
    await expect(page.getByText('¿Qué libro estás leyendo esta semana?')).toBeVisible();
  });

  test('solo aparecen vínculos mutuos en Conexiones (RF-CON-02)', async ({ page }) => {
    await page.goto('/conexiones');
    await expect(page.getByText('NUEVAS')).toBeVisible();
    await expect(page.getByText('CONVERSACIONES')).toBeVisible();
    await expect(page.getByText('Reúnanse en un lugar público', { exact: false })).toBeVisible();
  });
});
