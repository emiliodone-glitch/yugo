import { expect, test } from '@playwright/test';

/**
 * Ruta de pareja después del sí (RF-REL-05). Lo que protege: antes del
 * noviazgo la ruta está cerrada y lo dice; al declarar noviazgo aparecen los
 * pasos, sin porcentaje; un paso se marca con fecha y se ve quién; la
 * consejería queda esperando a la otra persona antes de que la iglesia la
 * vea; y el portal solo lista las peticiones firmadas por los dos.
 */
test.describe('Ruta de pareja', () => {
  test('cerrada antes del noviazgo, abierta después, con pasos y sin porcentaje', async ({
    page,
  }) => {
    // m-daniela viene sembrada en «Amistad intencional».
    await page.goto('/conexiones/m-daniela');
    const route = page.getByRole('region', { name: 'Su ruta' });
    await expect(route).toBeVisible();
    await expect(
      route
        .getByText('Se abren cuando declaren «Noviazgo».')
        .or(route.getByText('Se abre cuando declaren «Noviazgo».')),
    ).toBeVisible();

    const stage = page.getByRole('region', { name: 'Nuestra etapa' });
    await stage.getByRole('button', { name: 'Proponer «Noviazgo»' }).click();
    await stage.getByRole('button', { name: 'Proponer «Noviazgo»' }).click();
    await stage.getByRole('button', { name: 'Demo: responder como la otra persona' }).click();
    await expect(stage.getByText('Noviazgo', { exact: true })).toBeVisible();

    await expect(route.getByText('Conocer a las dos familias')).toBeVisible();
    await expect(route.getByText('Hablar con su pastor o líder')).toBeVisible();
    await expect(route).not.toContainText('%');

    // Marcar un paso con fecha: queda quién y cuándo, y se puede desmarcar.
    const row = route.getByRole('listitem').filter({ hasText: 'Hablar con su pastor o líder' });
    await row.getByRole('button', { name: 'Ya lo hicimos' }).click();
    await row.getByRole('button', { name: 'Guardar' }).click();
    await expect(row.getByText(/Lo marcaste el/)).toBeVisible();
    await row.getByRole('button', { name: 'Desmarcar' }).click();
    await expect(row.getByText(/Por qué:/)).toBeVisible();

    // Recursos: generales para todos y los de su tradición.
    await route.getByRole('button', { name: 'Para prepararse' }).click();
    await expect(route.getByText('Para toda pareja')).toBeVisible();
    await expect(route.getByText('Inventario PREPARE/ENRICH')).toBeVisible();

    // Consejería: uno pide, la iglesia todavía no la ve.
    await route.getByRole('button', { name: 'Pedir consejería' }).click();
    await route
      .getByLabel('Cuéntenle algo a la iglesia')
      .fill('Queremos empezar antes de fijar la fecha.');
    await route.getByRole('button', { name: 'Pedir consejería' }).click();
    await expect(route.getByText(/Falta que la otra persona confirme/)).toBeVisible();
    await route.getByRole('button', { name: 'Demo: responder como la otra persona' }).click();
    await expect(route.getByText(/ya recibió la petición/)).toBeVisible();
  });

  test('el portal lista solo peticiones firmadas por los dos y responde con un mensaje', async ({
    page,
  }) => {
    await page.goto('/iglesias/consejeria');
    const main = page.getByRole('main');
    await expect(main).toContainText('la iglesia nunca ve su conversación');

    const row = main.getByRole('listitem', { name: 'Abigail y Caleb' });
    await expect(row).toBeVisible();
    await expect(row.getByText('Esperando respuesta', { exact: true })).toBeVisible();
    await row.getByLabel('Mensaje para la pareja').fill('Los esperamos el sábado a las 4 pm.');
    await row.getByRole('button', { name: 'Aceptar y responder' }).click();
    await expect(main.getByRole('listitem', { name: 'Abigail y Caleb' })).toContainText('Aceptada');
  });
});
