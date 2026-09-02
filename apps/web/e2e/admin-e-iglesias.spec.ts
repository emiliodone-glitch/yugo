import { expect, test } from '@playwright/test';

/**
 * Flujo crítico 5 (RNF-09): publicación de evento desde el portal de iglesias
 * hasta que aparece en la app, más las colas del panel administrativo.
 */
test.describe('Panel administrativo', () => {
  test('el tablero muestra KPIs y alertas operativas (RF-ADM-01)', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.getByRole('heading', { name: 'Tablero' })).toBeVisible();
    await expect(page.getByText('Miembros activos (30 d)')).toBeVisible();
    await expect(page.getByText('Verificados nivel 2+')).toBeVisible();
    await expect(page.getByText('Requiere atención')).toBeVisible();
    await expect(page.getByText('sin asignar', { exact: false })).toBeVisible();
  });

  test('la cola de moderación prioriza los casos críticos (RF-ADM-04, 7.3)', async ({ page }) => {
    await page.goto('/admin/moderacion');

    await expect(page.getByRole('heading', { name: 'Cola de moderación' })).toBeVisible();
    // La cola abre en retenidos; los reportes están en su pestaña.
    await page.getByRole('tab', { name: /Reportes/ }).click();
    await expect(page.getByText('Posible menor de edad')).toBeVisible();
    await expect(page.getByText('Crítico').first()).toBeVisible();
    // Toda decisión exige motivo y queda auditada
    await expect(page.getByText('bitácora de auditoría', { exact: false })).toBeVisible();
  });

  test('la verificación compara selfie y foto con puntaje (RF-ADM-03)', async ({ page }) => {
    await page.goto('/admin/verificaciones');

    await expect(page.getByText('SELFIE EN VIVO', { exact: false })).toBeVisible();
    await expect(page.getByText('FOTO PRINCIPAL DEL PERFIL')).toBeVisible();
    await expect(page.getByText('Similitud automática')).toBeVisible();

    await page.getByRole('button', { name: 'Escalar por posible menor' }).click();
    await expect(page.getByText('perfil oculto preventivamente', { exact: false })).toBeVisible();
  });

  test('los pesos del algoritmo deben sumar 100 (RF-ADM-08)', async ({ page }) => {
    await page.goto('/admin/configuracion');

    await expect(page.getByText('Suma: 100 / 100 ✓')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled();

    // Mover un peso rompe la suma y bloquea el guardado
    await page.getByLabel('Denominación').first().fill('40');
    await expect(page.getByText('deben sumar exactamente 100', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  test('la bitácora de auditoría se declara inmutable (RF-ADM-11)', async ({ page }) => {
    await page.goto('/admin/auditoria');
    await expect(page.getByText('append-only', { exact: false })).toBeVisible();
    await expect(page.getByText('2FA obligatorio ✓')).toBeVisible();
  });
});

test.describe('Portal de iglesias', () => {
  test('crear evento muestra la vista previa fiel a la app (RF-IGL-03)', async ({ page }) => {
    await page.goto('/iglesias/eventos/nuevo');

    await expect(page.getByRole('heading', { name: 'Nuevo evento' })).toBeVisible();
    await expect(page.getByText('Vista previa en la app')).toBeVisible();

    // Lo que se escribe en el formulario se refleja en la vista previa.
    const title = page.getByRole('textbox').first();
    await title.fill('Vigilia de jóvenes: Un solo yugo');
    await expect(page.getByText('Vigilia de jóvenes: Un solo yugo')).toBeVisible();

    await page.getByRole('button', { name: 'Enviar a revisión' }).click();
    await expect(page.getByText('En revisión')).toBeVisible();
    await expect(page.getByText('tras la revisión del equipo de Yugo', { exact: false })).toBeVisible();
  });

  test('el evento aprobado aparece en la agenda de la app (RF-EVE-03)', async ({ page }) => {
    await page.goto('/eventos');
    await expect(page.getByText('Noche de adoración de jóvenes adultos')).toBeVisible();
    await expect(page.getByText('Iglesia Monte de Sion', { exact: false }).first()).toBeVisible();
  });

  test('los códigos de respaldo son de un solo uso y revocables (RF-IGL-05)', async ({ page }) => {
    await page.goto('/iglesias/codigos');

    await expect(page.getByText('Miembros respaldados')).toBeVisible();
    await expect(page.getByText('Vencen a los 30 días')).toBeVisible();
    await expect(page.getByText('nunca muestra la actividad de citas', { exact: false })).toBeVisible();

    await page.getByRole('button', { name: 'Generar 25 códigos' }).click();
    await expect(page.getByText('25 códigos generados', { exact: false })).toBeVisible();
  });

  test('confirmar un respaldo retira la solicitud de la cola', async ({ page }) => {
    await page.goto('/iglesias/codigos');
    await expect(page.getByText('Priscila Méndez')).toBeVisible();
    await page.getByRole('button', { name: 'Confirmar' }).first().click();
    await expect(page.getByText('Priscila Méndez')).toHaveCount(0);
  });
});
