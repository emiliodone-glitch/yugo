#!/usr/bin/env node
/**
 * Arranque de la API en producción, en un solo sitio.
 *
 *   1. `prisma migrate deploy`: el esquema al día antes de servir.
 *   2. Con SEED_ON_BOOT=true, siembra si la base está vacía (seed-if-empty).
 *   3. Levanta la API (dist/main.js).
 *
 * Es el `start` del paquete y el CMD del Dockerfile a la vez, a propósito:
 * Railway puede sustituir el CMD de la imagen por un «Custom Start Command»
 * (lo hizo con `pnpm start` al detectar el monorepo), y con la secuencia
 * dentro de `start` da igual cuál de los dos camine: las migraciones y la
 * semilla corren siempre. Sin esto, la API arrancaba contra una base sin
 * tablas y se caía en el primer arranque.
 */
import { spawnSync } from 'node:child_process';

function run(label, command, args) {
  console.log(`[yugo] ${label}`);
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`[yugo] ${label}: falló (código ${result.status ?? 'desconocido'})`);
    process.exit(result.status ?? 1);
  }
}

if (!process.env.DATABASE_URL) {
  console.error(
    '[yugo] Falta DATABASE_URL. En Railway suele significar que el servicio `postgres` no existe ' +
      'o no se llama así, y la referencia ${{postgres.…}} quedó vacía.',
  );
  process.exit(1);
}

run('migraciones', 'npx', ['prisma', 'migrate', 'deploy']);
// SEED_ON_BOOT=true → solo si la base está vacía (primer arranque).
// SEED_ON_BOOT=always → en cada arranque: la semilla es idempotente (upserts)
// y así un piloto recibe los datos de prueba nuevos con cada despliegue. No
// dejarlo así con usuarios reales: reescribe los perfiles de demo.
if (process.env.SEED_ON_BOOT === 'always') {
  run('semilla (siempre)', 'npx', ['tsx', 'prisma/seed.ts']);
} else if (process.env.SEED_ON_BOOT === 'true') {
  run('semilla si la base está vacía', 'npx', ['tsx', 'prisma/seed-if-empty.ts']);
}
console.log('[yugo] arrancando la API');
await import('./dist/main.js');
