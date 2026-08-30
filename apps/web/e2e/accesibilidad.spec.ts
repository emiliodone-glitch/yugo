import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * RNF-05: contraste AA, tamaños escalables y etiquetas para lectores de
 * pantalla. Se audita cada superficie con axe contra las reglas WCAG 2.1 AA;
 * una regresión de contraste o un control sin nombre accesible rompe la
 * prueba en vez de descubrirse en la tienda.
 */
const SURFACES = [
  { name: 'bienvenida', path: '/' },
  { name: 'entrar', path: '/entrar' },
  { name: 'registro', path: '/registro' },
  { name: 'inicio', path: '/inicio' },
  { name: 'descubrir', path: '/descubrir' },
  { name: 'afinidad', path: '/descubrir/p-mariel' },
  { name: 'conexiones', path: '/conexiones' },
  { name: 'chat', path: '/conexiones/m-mariel' },
  { name: 'comunidad', path: '/comunidad' },
  { name: 'eventos', path: '/eventos' },
  { name: 'detalle de evento', path: '/eventos/ev-vigilia' },
  { name: 'perfil', path: '/perfil' },
  { name: 'preferencias', path: '/perfil/preferencias' },
  { name: 'notificaciones', path: '/perfil/notificaciones' },
  { name: 'privacidad', path: '/perfil/privacidad' },
  { name: 'verificación', path: '/perfil/verificacion' },
  { name: 'paywall', path: '/plus' },
  { name: 'legal', path: '/legal/pacto' },
  { name: 'panel admin', path: '/admin' },
  { name: 'moderación', path: '/admin/moderacion' },
  { name: 'portal de iglesias', path: '/iglesias' },
];

for (const surface of SURFACES) {
  test(`${surface.name} no tiene violaciones WCAG 2.1 AA (RNF-05)`, async ({ page }) => {
    await page.goto(surface.path);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // El mensaje nombra la regla y el nodo para que la corrección sea directa.
    const summary = results.violations.map(
      (violation) =>
        `${violation.id} (${violation.impact}): ${violation.help}\n  ${violation.nodes
          .slice(0, 3)
          .map((node) => node.target.join(' '))
          .join('\n  ')}`,
    );
    expect(summary, summary.join('\n\n')).toEqual([]);
  });
}
