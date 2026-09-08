import { expect, test } from '@playwright/test';
import { demoEvents } from '@yugo/shared';

/**
 * Explorar sin cuenta: lo que se puede ver antes de registrarse, y lo que no.
 * Se comprueba que hay contenido real de la comunidad (devocional, eventos,
 * historias, grupos), que la salida a entrar o crear perfil está siempre a la
 * vista, y que ningún dato de una persona concreta aparece por aquí.
 */
test.describe('Explorar sin cuenta', () => {
  test('desde la bienvenida se llega a explorar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Explorar sin cuenta/ }).click();
    await expect(page).toHaveURL(/\/explorar$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Así es Yugo por dentro');
  });

  test('muestra devocional, eventos, historias y comunidad, con salida a entrar o crear perfil', async ({ page }) => {
    await page.goto('/explorar');
    await expect(page.getByRole('heading', { name: 'Guarda tu corazón' })).toBeVisible();
    await expect(page.getByRole('link', { name: demoEvents[0].title })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Leer historias' })).toBeVisible();
    await expect(page.getByText('Una comunidad que existe')).toBeVisible();
    // Las dos salidas, arriba y abajo.
    await expect(page.getByRole('link', { name: 'Entrar' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Crear mi perfil' }).first()).toBeVisible();
  });

  test('la tarjeta de Descubrir es un ejemplo, no una persona', async ({ page }) => {
    await page.goto('/explorar');
    await expect(page.getByText('Ejemplo ilustrativo · no es una persona real')).toBeVisible();
    // Ningún nombre de los perfiles de demo se filtra a la página pública.
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('Mariel, 28');
    expect(body).not.toContain('Priscila');
  });

  test('la página pública de un evento existe y lleva a crear perfil', async ({ page }) => {
    await page.goto(`/e/${demoEvents[0].id}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(demoEvents[0].title);
    await expect(page.getByText('Para apuntarte y ver quién de tus conexiones irá')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Crear mi perfil' }).first()).toHaveAttribute('href', '/registro');
  });

  test('un evento que no existe lo dice, sin romperse', async ({ page }) => {
    await page.goto('/e/no-existe');
    await expect(page.getByText('Este evento ya no está disponible.')).toBeVisible();
  });
});
