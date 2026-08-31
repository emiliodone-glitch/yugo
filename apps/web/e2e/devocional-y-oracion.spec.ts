import { expect, test } from '@playwright/test';

/**
 * Devocional del día y muro de oración.
 *
 * Estas pruebas cuidan sobre todo las **ausencias**, que son las decisiones de
 * producto más fáciles de deshacer sin darse cuenta: no hay rachas que se
 * pierdan, no hay ceros al lado de una petición, y de una petición anónima no
 * llega ni el nombre ni la iglesia.
 */
test.describe('Devocional del día', () => {
  test('se lee entero desde Inicio y lleva a su pantalla', async ({ page }) => {
    await page.goto('/inicio');
    const card = page.getByRole('region', { name: 'Devocional de hoy' });

    await expect(card.getByText('Guarda tu corazón', { exact: true })).toBeVisible();
    await expect(card.getByText('Proverbios 4:23')).toBeVisible();
  });

  test('dice cuánta gente de tu iglesia lo leyó, que es lo que lo hace comunal', async ({
    page,
  }) => {
    await page.goto('/devocional');
    const card = page.getByRole('region', { name: 'Devocional de hoy' });

    await expect(card.getByText('personas de tu iglesia lo leyeron hoy', { exact: false })).toBeVisible();
  });

  test('no habla de rachas ni de días perdidos', async ({ page }) => {
    // Una racha que se pierde convierte una disciplina espiritual en un
    // puntaje y le añade culpa a quien faltó, que es justo quien más falta
    // hace que vuelva.
    await page.goto('/devocional');
    const main = page.getByRole('main');

    await expect(main.getByText(/racha/i)).toHaveCount(0);
    await expect(main.getByText(/días seguidos/i)).toHaveCount(0);
    await expect(main.getByText(/perdiste/i)).toHaveCount(0);
    await expect(main.getByText(/no leíste/i)).toHaveCount(0);
  });

  test('la constancia se cuenta sin reprochar', async ({ page }) => {
    await page.goto('/devocional');
    const card = page.getByRole('region', { name: 'Devocional de hoy' });

    await expect(card.getByText(/Leíste \d+ días de los últimos 30\./)).toBeVisible();
  });

  test('avisa que la reflexión pasa por revisión antes de publicarse', async ({ page }) => {
    await page.goto('/devocional');
    const card = page.getByRole('region', { name: 'Devocional de hoy' });

    await expect(card.getByText('Pasa por revisión antes de publicarse', { exact: false })).toBeVisible();
  });

  test('al dejar una reflexión, queda escrita y sube el conteo de la iglesia', async ({ page }) => {
    await page.goto('/devocional');
    const card = page.getByRole('region', { name: 'Devocional de hoy' });

    await expect(card.getByText('27 personas de tu iglesia lo leyeron hoy.')).toBeVisible();

    await card
      .getByLabel('Si quieres, déjalo escrito')
      .fill('Lo leí dos veces y la segunda entendí otra cosa.');
    await card.getByRole('button', { name: 'Guardar' }).click();

    await expect(card.getByText('Lo leí dos veces y la segunda entendí otra cosa.')).toBeVisible();
    await expect(card.getByText('28 personas de tu iglesia lo leyeron hoy.')).toBeVisible();
    await expect(card.getByText('Leído hoy')).toBeVisible();
  });
});

test.describe('Muro de oración', () => {
  test('una petición anónima no trae el nombre ni la iglesia de quien la escribió', async ({
    page,
  }) => {
    // Es la invariante que hace que existan las peticiones que más falta
    // hacen: nadie escribe una deuda o una vergüenza si hay que firmarla.
    await page.goto('/oracion');
    const wall = page.getByRole('region', { name: 'Muro de oración' });

    const anonymous = wall.getByText('Empiezo la universidad a los 34', { exact: false });
    await expect(anonymous).toBeVisible();

    const card = wall.locator('li', { hasText: 'Empiezo la universidad a los 34' });
    await expect(card.getByText('Alguien de la comunidad')).toBeVisible();
    await expect(card.getByText(/Iglesia/)).toHaveCount(0);
  });

  test('la petición que nadie ha acompañado va por encima de las que ya tienen gente', async ({
    page,
  }) => {
    // Ordenado por fecha, la petición del tímido se queda en cero, que es peor
    // que no haberla escrito.
    await page.goto('/oracion');
    const wall = page.getByRole('region', { name: 'Muro de oración' });
    const items = wall.locator('li');

    const sinAcompanar = await items
      .filter({ hasText: 'Sé el primero en acompañar' })
      .first()
      .textContent();
    expect(sinAcompanar).toContain('universidad a los 34');

    // Está antes que una con once personas orando.
    const texts = await items.allTextContents();
    const indexSola = texts.findIndex((t) => t.includes('universidad a los 34'));
    const indexMama = texts.findIndex((t) => t.includes('la operan el jueves'));
    expect(indexSola).toBeLessThan(indexMama);
  });

  test('nunca imprime un cero al lado de una petición', async ({ page }) => {
    // «0 personas orando» es una humillación impresa, y quien la lee es la
    // persona que peor la está pasando.
    await page.goto('/oracion');
    const wall = page.getByRole('region', { name: 'Muro de oración' });

    await expect(wall.getByText(/^0 personas/)).toHaveCount(0);
    await expect(wall.getByText('Sé el primero en acompañar').first()).toBeVisible();
  });

  test('una petición contestada encabeza el muro y muestra qué pasó', async ({ page }) => {
    // Sin respuestas visibles el muro queda como una lista de desgracias.
    await page.goto('/oracion');
    const wall = page.getByRole('region', { name: 'Muro de oración' });

    const first = wall.locator('li').first();
    await expect(first.getByText('Contestada')).toBeVisible();
    await expect(first.getByText('Salió el trabajo', { exact: false })).toBeVisible();
  });

  test('«estoy orando» cambia el conteo y se puede deshacer', async ({ page }) => {
    await page.goto('/oracion');
    const wall = page.getByRole('region', { name: 'Muro de oración' });
    const card = wall.locator('li', { hasText: 'universidad a los 34' });

    await expect(card.getByText('Sé el primero en acompañar')).toBeVisible();
    await card.getByRole('button', { name: 'Estoy orando' }).click();
    await expect(card.getByText('1 persona está orando')).toBeVisible();

    // Decir que uno ora cuando ya no lo hace es peor que no haberlo dicho.
    await card.getByRole('button', { name: 'Estás orando' }).click();
    await expect(card.getByText('Sé el primero en acompañar')).toBeVisible();
  });

  test('al pedir oración, la casilla de anonimato explica qué significa', async ({ page }) => {
    await page.goto('/oracion');
    const wall = page.getByRole('region', { name: 'Muro de oración' });

    await wall.getByRole('button', { name: 'Pedir oración' }).click();

    await expect(wall.getByText('Nadie verá quién la escribió, ni tu congregación', { exact: false })).toBeVisible();
  });

  test('una petición nueva aparece en el muro', async ({ page }) => {
    await page.goto('/oracion');
    const wall = page.getByRole('region', { name: 'Muro de oración' });

    await wall.getByRole('button', { name: 'Pedir oración' }).click();
    await wall.getByLabel('¿Por qué quieres que oren?').fill('Por mi abuela, que está delicada.');
    await wall.getByRole('button', { name: 'Publicar' }).click();

    await expect(wall.getByText('Por mi abuela, que está delicada.')).toBeVisible();
  });

  test('una petición que la moderación retiene no se publica', async ({ page }) => {
    // Pedir oración es el vehículo perfecto para una estafa, porque pedir
    // ayuda es exactamente lo que se espera aquí.
    await page.goto('/oracion');
    const wall = page.getByRole('region', { name: 'Muro de oración' });

    await wall.getByRole('button', { name: 'Pedir oración' }).click();
    await wall
      .getByLabel('¿Por qué quieres que oren?')
      .fill('Necesito dinero para la operación, deposita aquí.');
    await wall.getByRole('button', { name: 'Publicar' }).click();

    await expect(wall.getByText('Quedó en revisión', { exact: false })).toBeVisible();
    await expect(wall.getByText('deposita aquí', { exact: false })).toHaveCount(1); // solo en el campo
  });

  test('no promete que orar mucho mejore tus resultados en la app', async ({ page }) => {
    // El muro no es un mecanismo de puntos: participar aquí no compra nada.
    await page.goto('/oracion');
    const main = page.getByRole('main');

    await expect(main.getByText(/punt(o|aje)s?/i)).toHaveCount(0);
    await expect(main.getByText(/nivel \d/i)).toHaveCount(0);
  });
});

test.describe('Inicio da una razón para volver mañana', () => {
  test('trae el devocional y un vistazo al muro, no solo la lista del día', async ({ page }) => {
    await page.goto('/inicio');

    await expect(page.getByRole('region', { name: 'Devocional de hoy' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Muro de oración' })).toBeVisible();
  });

  test('el vistazo del muro trae la que nadie ha acompañado', async ({ page }) => {
    await page.goto('/inicio');
    const peek = page.getByRole('region', { name: 'Muro de oración' });

    await expect(peek.getByText('Sé el primero en acompañar')).toBeVisible();
  });
});
