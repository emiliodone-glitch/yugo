/* eslint-disable no-console */
/**
 * Siembra solo si la base está vacía.
 *
 * Existe para el primer arranque en producción: el contenedor de la API lo
 * corre cuando `SEED_ON_BOOT=true`, después de las migraciones y antes de
 * servir. Así no hace falta exponer Postgres ni correr nada desde otra
 * máquina para tener el catálogo que la app necesita (denominaciones, áreas
 * de servicio, documentos legales, ajustes) y los datos de demo.
 *
 * La guarda es el catálogo de denominaciones: si ya hay una sola fila, la
 * base tiene vida y no se toca nada, aunque la variable siga puesta. La
 * semilla completa es idempotente (todo son upserts), pero re-correrla en
 * cada despliegue pisaría cambios hechos a los perfiles de demo, y una base
 * con usuarios reales no debe recibirla nunca.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const denominations = await prisma.denomination.count();
  await prisma.$disconnect();
  if (denominations > 0) {
    console.log(`Base con datos (${denominations} denominaciones): no se siembra.`);
    return;
  }
  console.log('Base vacía: sembrando catálogo y datos de demo…');
  // seed.ts corre su main() al importarse y sale con código 1 si falla.
  await import('./seed');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
