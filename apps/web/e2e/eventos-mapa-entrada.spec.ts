import { expect, test } from '@playwright/test';

/**
 * Eventos (RF-EVE-02/04/06/08). Lo que protegen: los filtros filtran de
 * verdad y se recuerdan, la lista vacía lo dice, el mapa es un mapa, la
 * entrada personal existe y la puerta puede validarla.
 */
test.describe('Filtros de la agenda', () => {
  test('filtran la lista, se recuerdan al recargar y la lista vacía ofrece salida', async ({
    page,
  }) => {
    await page.goto('/eventos');
    const main = page.getByRole('main');
    await expect(main.getByText('Noche de adoración de jóvenes adultos')).toBeVisible();

    await page.getByRole('button', { name: 'Filtros' }).click();
    await expect(main.getByText('Filtrar eventos')).toBeVisible();

    // «Mi ciudad»: solo lo que ocurre en la ciudad de la persona.
    await main.getByRole('button', { name: 'Mi ciudad' }).click();
    await expect(main.getByText('Concierto de adoración: Un solo corazón')).toBeVisible();
    await expect(main.getByText('Congreso de solteros con propósito')).toHaveCount(0);

    // Se recuerda durante la visita.
    await page.reload();
    await expect(main.getByText('Concierto de adoración: Un solo corazón')).toBeVisible();
    await expect(main.getByText('Congreso de solteros con propósito')).toHaveCount(0);

    // «Mi iglesia» no convoca nada en la demo: lista vacía honesta, con salida.
    await page.getByRole('button', { name: 'Filtros' }).click();
    await main.getByRole('button', { name: 'Mi iglesia' }).click();
    await expect(main.getByText('Ningún evento coincide con estos filtros.')).toBeVisible();
    await main.getByRole('button', { name: 'Quitar filtros' }).first().click();
    await expect(main.getByText('Noche de adoración de jóvenes adultos')).toBeVisible();
    await expect(main.getByText('Congreso de solteros con propósito')).toBeVisible();
  });

  test('el tipo de evento también filtra', async ({ page }) => {
    await page.goto('/eventos');
    const main = page.getByRole('main');
    await page.getByRole('button', { name: 'Filtros' }).click();
    await main.getByRole('button', { name: 'Retiro', exact: true }).click();
    await expect(main.getByText('Retiro de jóvenes en Jarabacoa')).toBeVisible();
    await expect(main.getByText('Noche de adoración de jóvenes adultos')).toHaveCount(0);
  });
});

test.describe('Asistencia desde la lista', () => {
  test('«Ya no iré» quita la asistencia y «Me interesa» se marca', async ({ page }) => {
    await page.goto('/eventos');
    const vigil = page.locator('#event-ev-vigilia');
    await expect(vigil.getByText('Asistiré ✓')).toBeVisible();
    await vigil.getByRole('button', { name: 'Ya no iré' }).click();
    await expect(vigil.getByRole('button', { name: 'Asistiré' })).toBeVisible();

    const interested = vigil.getByRole('button', { name: 'Me interesa' });
    await interested.click();
    await expect(interested).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('Mapa', () => {
  test('la agenda pinta un mapa real con los eventos', async ({ page }) => {
    await page.goto('/eventos');
    await expect(page.locator('.leaflet-container').first()).toBeVisible();
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(5);
    // Tocar un pin lleva a su tarjeta.
    await page
      .locator('.leaflet-marker-icon[title="Desayuno solidario en Villa Altagracia"]')
      .click();
    await expect(page.locator('#event-ev-desayuno')).toHaveClass(/ring-olive/);
  });

  test('el detalle ubica el encuentro y ofrece cómo llegar', async ({ page }) => {
    await page.goto('/eventos/ev-vigilia');
    const main = page.getByRole('main');
    await expect(main.getByText('Dónde', { exact: true })).toBeVisible();
    await expect(page.locator('.leaflet-container').first()).toBeVisible();
    const directions = main.getByRole('link', { name: 'Cómo llegar' });
    await expect(directions).toHaveAttribute(
      'href',
      /google\.com\/maps\/dir\/\?api=1&destination=18\.4885%2C-69\.8571/,
    );
    await expect(directions).toHaveAttribute('target', '_blank');
  });
});

test.describe('Entrada personal', () => {
  test('quien asiste tiene su entrada con QR y código', async ({ page }) => {
    await page.goto('/eventos/ev-vigilia');
    await page.getByRole('link', { name: 'Ver mi entrada' }).click();
    await expect(page).toHaveURL(/\/eventos\/ev-vigilia\/entrada$/);
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'Tu entrada' })).toBeVisible();
    await expect(main.getByRole('img', { name: 'Tu entrada' })).toBeVisible();
    await expect(main.getByText('YUGO-DEMO-1')).toBeVisible();
    await expect(main.getByText('Noche de adoración de jóvenes adultos')).toBeVisible();
    await expect(
      main.getByText('Muestra este código en la puerta', { exact: false }),
    ).toBeVisible();
  });

  test('sin asistencia marcada, la entrada invita a marcarla y aparece', async ({ page }) => {
    await page.goto('/eventos/ev-concierto/entrada');
    const main = page.getByRole('main');
    await expect(main.getByText('Marca «Asistiré» para tener tu entrada.')).toBeVisible();
    await main.getByRole('button', { name: 'Asistiré' }).click();
    await expect(main.getByText('YUGO-DEMO-1')).toBeVisible();
    await expect(main.getByText('Concierto de adoración: Un solo corazón')).toBeVisible();
  });
});

test.describe('Portal: registrar entradas', () => {
  test('la lista de eventos enlaza a registrar entradas', async ({ page }) => {
    await page.goto('/iglesias/eventos');
    await expect(page.getByRole('link', { name: 'Registrar entradas' }).first()).toBeVisible();
  });

  test('valida un código, detecta el repetido y rechaza el ajeno', async ({ page }) => {
    await page.goto('/iglesias/eventos/ev-vigilia/entrada');
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'Registrar entradas' })).toBeVisible();
    await expect(main.getByText('0 entradas registradas en esta sesión')).toBeVisible();

    const input = main.getByLabel('Código de la entrada');
    await input.fill('yugo-demo-1');
    await expect(input).toHaveValue('YUGO-DEMO-1');
    await input.press('Enter');
    // La única pantalla del portal con un nombre: el de quien está en la puerta.
    await expect(main.getByRole('status')).toContainText('Entrada de Mariel registrada');
    await expect(main.getByText('1 entrada registrada en esta sesión')).toBeVisible();
    await expect(input).toHaveValue('');

    await input.fill('YUGO-DEMO-2');
    await input.press('Enter');
    await expect(main.getByRole('status')).toContainText('Esa entrada ya se registró');
    await expect(main.getByText('1 entrada registrada en esta sesión')).toBeVisible();

    await input.fill('ABCD-1234');
    await input.press('Enter');
    await expect(main.getByRole('status')).toContainText('Ese código no corresponde a este evento');
  });
});
