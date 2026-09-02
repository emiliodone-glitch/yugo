/**
 * Cada pantalla se monta sin lanzar.
 *
 * Es la prueba más barata y la más importante que se puede correr sin un
 * teléfono: una pantalla que lanza al montarse es una app que se cierra al
 * abrirla. Se montan las 32 rutas en modo demo, con los mismos proveedores que
 * en producción (React Query, caché offline, push), y con los parámetros que
 * cada ruta espera. Si una nueva pantalla se añade y no está aquí, la prueba
 * de abajo lo señala.
 */
import { act, render } from '@testing-library/react-native';
import * as fs from 'fs';
import * as path from 'path';
import {
  demoConnections,
  demoDiscover,
  demoEvents,
  demoGroups,
} from '@yugo/shared';
import { Providers } from '../lib/providers';

const setParams = (globalThis as Record<string, unknown>).__setRouteParams as (
  params: Record<string, string>,
) => void;

/** Parámetros de ruta que cada pantalla dinámica necesita para tener datos. */
const PARAMS: Record<string, Record<string, string>> = {
  'chat/[id]': { id: demoConnections[0].matchId },
  'afinidad/[id]': { id: demoDiscover[0].userId },
  'comunidad/[id]': { id: demoGroups[0].id },
  'eventos/[id]': { id: demoEvents[0].id },
  'legal/[kind]': { kind: 'pacto' },
};

/** Todas las rutas bajo app/, para que ninguna se quede fuera sin querer. */
function allRoutes(): string[] {
  const root = path.join(__dirname, '..', 'app');
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.tsx')) {
        out.push(path.relative(root, full).replace(/\.tsx$/, ''));
      }
    }
  };
  walk(root);
  return out.sort();
}

const routes = allRoutes();

describe('cada pantalla se monta sin lanzar (modo demo)', () => {
  it('encontró todas las rutas', () => {
    expect(routes.length).toBeGreaterThanOrEqual(30);
  });

  it.each(routes)('%s', async (route) => {
    setParams(PARAMS[route] ?? {});
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(path.join('..', 'app', route));
    const Screen = mod.default;
    expect(typeof Screen).toBe('function');

    const errors: string[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args.map(String).join(' '));
    };

    let tree: ReturnType<typeof render> | undefined;
    try {
      // `render` ya envuelve en act; anidarlo en otro act rompe la detección
      // de componentes de la librería.
      tree = render(
        <Providers>
          <Screen />
        </Providers>,
      );
      // Deja correr los efectos y las consultas de la demo.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      // Un layout con el navegador simulado no pinta nada por sí mismo; lo
      // que se le exige es no lanzar. Una pantalla sí tiene que pintar algo.
      if (!route.endsWith('_layout')) expect(tree.toJSON()).not.toBeNull();
    } finally {
      console.error = original;
      tree?.unmount();
    }

    // Un error de React al montar (propiedad indefinida, clave duplicada que
    // rompe la lista, hook fuera de lugar) no siempre lanza: a veces solo lo
    // escribe en la consola. Aquí cuenta como fallo.
    const real = errors.filter(
      (e) => !/act\(\.\.\.\)|not wrapped in act|deprecated|Warning: An update to/.test(e),
    );
    expect(real).toEqual([]);
  });
});
