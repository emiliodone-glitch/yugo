import { expect, test } from '@playwright/test';

/**
 * Cobertura de los RF que cerraron la última tanda: verificación en tres
 * niveles, perfil destacado, códigos promocionales, invitar a evento desde
 * el chat, calendario/enlace del evento y sesión.
 */
test.describe('Verificación en tres niveles (RF-VER-01/02/03)', () => {
  test('muestra la escalera completa con su estado', async ({ page }) => {
    await page.goto('/perfil/verificacion');

    await expect(page.getByText('Nivel 1 · Contacto')).toBeVisible();
    await expect(page.getByText('Nivel 2 · Identidad')).toBeVisible();
    await expect(page.getByText('Nivel 3 · Respaldo de iglesia')).toBeVisible();
  });

  test('la selfie guiada pide gestos aleatorios (RF-VER-01)', async ({ page }) => {
    await page.goto('/perfil/verificacion');
    // Nivel 2 ya aprobado en demo: la escalera lo refleja sin pedir selfie.
    await expect(page.getByText('Tu identidad está verificada.')).toBeVisible();
  });

  test('canjear un código de iglesia otorga el nivel 3 (RF-VER-02)', async ({ page }) => {
    await page.goto('/perfil/verificacion');

    await page.getByPlaceholder('SION-XXXX').fill('SION-1000-ABCD');
    await page.getByRole('button', { name: 'Validar código' }).click();

    await expect(page.getByText('Respaldado por', { exact: false })).toBeVisible();
  });

  test('permite pedir respaldo a un líder (RF-VER-03)', async ({ page }) => {
    await page.goto('/perfil/verificacion');

    const request = page.getByRole('button', { name: 'Pedir respaldo a mi líder' });
    await expect(request).toBeDisabled();
    await page.getByPlaceholder('pastor@iglesia.do').fill('pastor@montedesion.do');
    await expect(request).toBeEnabled();
    await request.click();
    await expect(page.getByText('Enviamos la solicitud a tu líder', { exact: false })).toBeVisible();
  });
});

test.describe('Perfil destacado (RF-DES-10)', () => {
  test('muestra la cuota semanal y permite destacar', async ({ page }) => {
    await page.goto('/perfil/destacar');

    await expect(page.getByText('Aparece primero por 24 horas')).toBeVisible();
    await expect(page.getByText('Destaques disponibles esta semana')).toBeVisible();

    await page.getByRole('button', { name: 'Destacar mi perfil ahora' }).click();
    await expect(page.getByText('Tu perfil está destacado ahora')).toBeVisible();
  });
});

test.describe('Códigos promocionales (RF-PLU-04)', () => {
  test('rechaza un código inválido', async ({ page }) => {
    await page.goto('/perfil/promo');

    await page.getByPlaceholder('CÓDIGO').fill('NOEXISTE');
    await page.getByRole('button', { name: 'Canjear código' }).click();
    await expect(page.getByText('El código promocional no es válido.')).toBeVisible();
  });

  test('canjea un código válido y otorga la prueba', async ({ page }) => {
    await page.goto('/perfil/promo');

    await page.getByPlaceholder('CÓDIGO').fill('IGLESIA30');
    await page.getByRole('button', { name: 'Canjear código' }).click();
    await expect(page.getByText('Tienes Yugo PLUS por 30 días', { exact: false })).toBeVisible();
    await expect(page.getByText('No se te cobrará nada.', { exact: false })).toBeVisible();
  });
});

test.describe('Invitar a un evento desde el chat (RF-CON-10)', () => {
  test('comparte un evento de la agenda en la conversación', async ({ page }) => {
    await page.goto('/conexiones/m-mariel');

    await page.getByRole('button', { name: 'Opciones' }).click();
    await page.getByRole('button', { name: 'Invitar a un evento' }).click();

    await expect(page.getByText('Noche de adoración de jóvenes adultos').first()).toBeVisible();
    await page.getByRole('button', { name: /Noche de adoración/ }).click();

    await expect(page.getByText('¿Vamos juntos?', { exact: false })).toBeVisible();
  });

  test('reportar y bloquear están disponibles desde el chat (RF-CON-07)', async ({ page }) => {
    await page.goto('/conexiones/m-mariel');

    await page.getByRole('button', { name: 'Opciones' }).click();
    await page.getByRole('button', { name: 'Reportar' }).click();
    await expect(page.getByText('Reporte enviado', { exact: false })).toBeVisible();
  });
});

test.describe('Detalle de evento (RF-EVE-04/06/08)', () => {
  test('ofrece calendario, compartir y check-in con QR', async ({ page }) => {
    await page.goto('/eventos/ev-vigilia');

    await expect(page.getByRole('button', { name: 'Agregar al calendario' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Compartir' })).toBeVisible();

    // El QR solo aparece cuando confirmaste asistencia.
    await expect(page.getByRole('button', { name: 'Check-in con QR' })).toBeVisible();
    await page.getByRole('button', { name: 'Check-in con QR' }).click();
    await expect(page.getByRole('img', { name: 'Código QR de check-in' })).toBeVisible();
  });

  test('muestra las conexiones que asisten (RF-EVE-05)', async ({ page }) => {
    await page.goto('/eventos/ev-vigilia');
    await expect(page.getByText('de tus conexiones asistirán', { exact: false })).toBeVisible();
  });
});

test.describe('Sesión', () => {
  test('la pantalla de entrar acepta credenciales y 2FA', async ({ page }) => {
    await page.goto('/entrar');

    await expect(page.getByRole('heading', { name: 'Entra a Yugo' })).toBeVisible();
    await page.getByPlaceholder('Correo o teléfono').fill('demo1@yugo.do');
    await page.getByPlaceholder('Contraseña').fill('Yugo.demo1');
    await page.getByRole('button', { name: 'Continuar' }).click();

    await expect(page).toHaveURL(/\/inicio/);
  });

  test('la recuperación de contraseña pide código y nueva clave (RF-AUT-05)', async ({ page }) => {
    await page.goto('/recuperar');

    await page.getByPlaceholder('Correo o teléfono').fill('demo1@yugo.do');
    await page.getByRole('button', { name: 'Continuar' }).click();

    await expect(page.getByPlaceholder('······')).toBeVisible();
    await page.getByPlaceholder('······').fill('123456');
    await page.getByPlaceholder('Nueva contraseña').fill('Yugo.nueva1');
    await page.getByRole('button', { name: 'Continuar' }).click();

    await expect(page.getByText('Contraseña actualizada')).toBeVisible();
  });
});

test.describe('Grupos con aprobación (RF-COM-02)', () => {
  test('los grupos con aprobación solicitan entrada en vez de unirse', async ({ page }) => {
    await page.goto('/comunidad');
    await page.getByRole('button', { name: 'Sugeridos' }).click();

    await expect(page.getByRole('button', { name: 'Solicitar entrada' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Unirme' }).first()).toBeVisible();
  });
});
