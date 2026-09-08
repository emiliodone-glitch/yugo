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

/** Como `run`, pero devuelve la salida para decidir si el fallo es transitorio. */
function runCaptured(label, command, args) {
  console.log(`[yugo] ${label}`);
  const result = spawnSync(command, args, { stdio: ['inherit', 'pipe', 'pipe'], encoding: 'utf8' });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (output) process.stdout.write(output);
  return { status: result.status, output };
}

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function databaseHost() {
  try {
    return new URL(process.env.DATABASE_URL).host;
  } catch {
    return '(DATABASE_URL ilegible)';
  }
}

/**
 * `prisma migrate deploy`, esperando a la base si aún no responde.
 *
 * En Railway la API y Postgres arrancan a la vez, y un Postgres recién
 * creado (o recién redesplegado tras cambiar la imagen o borrar el volumen)
 * tarda más que la API en aceptar conexiones. Sin esta espera, la API moría
 * con P1001 en el primer segundo, Railway la reiniciaba cinco veces y la
 * marcaba «Crashed» aunque la base estuviera lista medio minuto después.
 * Solo se reintenta cuando el error es de conectividad; una contraseña mal
 * (P1000) o una migración rota fallan en el acto, como antes.
 */
function migrateWaitingForDatabase() {
  const deadlineMs = Number(process.env.DB_WAIT_SECONDS ?? 120) * 1000;
  const startedAt = Date.now();
  for (let attempt = 1; ; attempt++) {
    const { status, output } = runCaptured(
      attempt === 1 ? 'migraciones' : `migraciones (intento ${attempt})`,
      'npx',
      ['prisma', 'migrate', 'deploy'],
    );
    if (status === 0) return;
    const transient = /P1001|P1017|ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|timed? ?out/i.test(
      output,
    );
    const elapsed = Date.now() - startedAt;
    if (!transient || elapsed > deadlineMs) {
      if (transient) {
        console.error(
          `[yugo] Postgres no respondió en ${Math.round(deadlineMs / 1000)} s en ${databaseHost()}. ` +
            'Revisa en Railway que el servicio Postgres esté «Online» (si acabas de cambiar su imagen ' +
            'o borrar el volumen, mira sus Deploy Logs: la imagen postgis necesita POSTGRES_USER, ' +
            'POSTGRES_PASSWORD y POSTGRES_DB) y que DATABASE_URL apunte a su dominio privado.',
        );
      }
      console.error(`[yugo] migraciones: falló (código ${status ?? 'desconocido'})`);
      process.exit(status ?? 1);
    }
    console.log(
      `[yugo] la base de datos aún no responde en ${databaseHost()}; reintento en 5 s ` +
        `(${Math.round(elapsed / 1000)} s de ${Math.round(deadlineMs / 1000)} s)`,
    );
    sleep(5000);
  }
}

if (!process.env.DATABASE_URL) {
  console.error(
    '[yugo] Falta DATABASE_URL. En Railway suele significar que el servicio `postgres` no existe ' +
      'o no se llama así, y la referencia ${{postgres.…}} quedó vacía.',
  );
  process.exit(1);
}

// Una referencia ${{Postgres.POSTGRES_PASSWORD}} que no resolvió deja la URL
// como `postgresql://yugo:@host:5432/yugo`: contraseña vacía. Prisma la
// rechaza con P1000 en cada arranque y el mensaje no dice por qué.
try {
  const parsed = new URL(process.env.DATABASE_URL);
  if (parsed.password === '') {
    console.error(
      `[yugo] DATABASE_URL no lleva contraseña (usuario «${parsed.username}» en ${parsed.host}). ` +
        'En Railway, la referencia a la contraseña debe usar el nombre exacto del servicio de base de ' +
        'datos, con mayúsculas y minúsculas iguales (p. ej. ${{Postgres.POSTGRES_PASSWORD}}), o bien ' +
        'pegar la contraseña literal del servicio Postgres.',
    );
    process.exit(1);
  }
} catch {
  // URL ilegible: que lo diga Prisma con su código.
}

migrateWaitingForDatabase();
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
