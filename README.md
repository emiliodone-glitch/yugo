# Yugo — Unidos en la misma fe

Plataforma de citas con propósito, comunidad y eventos para personas cristianas de distintas
denominaciones, con foco inicial en República Dominicana.

Cuatro superficies sobre un único backend:

| Superficie | Carpeta | Stack |
| --- | --- | --- |
| App móvil | `apps/mobile` | Expo (React Native), TypeScript, Expo Router |
| Web de usuario | `apps/web` | Next.js 14 (App Router), Tailwind, React Query |
| Panel administrativo | `apps/web` → rutas `/admin` | Next.js (mismo repo web) |
| Portal de iglesias | `apps/web` → rutas `/iglesias` | Next.js (mismo repo web) |
| API | `apps/api` | NestJS 10, Prisma, PostgreSQL 16 + PostGIS, Redis, BullMQ, Socket.IO |

Paquetes compartidos:

- `packages/shared` — tipos de dominio, validadores (zod), constantes, i18n (es-DO), fixtures demo.
- `packages/ui-tokens` — tokens de diseño (colores, tipografía, espaciados) de la identidad visual.

## Requisitos

- Node.js ≥ 20, pnpm ≥ 9, Docker.

## Puesta en marcha

```bash
pnpm install
cp .env.example .env

# Infraestructura local: PostgreSQL+PostGIS, Redis, MinIO, Mailpit
docker compose -f infra/docker-compose.yml up -d

# Base de datos
pnpm --filter @yugo/api db:migrate     # aplica migraciones (o db:push en dev)
pnpm --filter @yugo/api db:seed        # denominaciones, iglesias, 40 perfiles, 10 eventos…

# Desarrollo
pnpm --filter @yugo/api dev            # API en http://localhost:4000
pnpm --filter @yugo/web dev            # Web en http://localhost:3000
pnpm --filter @yugo/mobile start       # Expo
```

La web arranca en **modo demo** (`NEXT_PUBLIC_DEMO_MODE=true`): toda la interfaz funciona con
datos de ejemplo aunque la API esté apagada, ideal para revisar la UI de los mockups.

- Web de usuario: `http://localhost:3000`
- Panel admin: `http://localhost:3000/admin`
- Portal de iglesias: `http://localhost:3000/iglesias`
- Mailpit (correos locales): `http://localhost:8025`
- Consola MinIO: `http://localhost:9001`

## Comandos

```bash
pnpm build        # build de todos los workspaces
pnpm lint         # eslint
pnpm typecheck    # tsc --noEmit
pnpm test         # pruebas unitarias (Vitest/Jest)
```

## Documentación

- `docs/Yugo_Requerimientos_v1.md` — documento de requerimientos (fuente de verdad, códigos RF-XXX-NN).
- `docs/mockups/Yugo_Mockups.html` — mockups de referencia de las tres superficies.
- `docs/ARCHITECTURE.md` — decisiones de arquitectura.
- `docs/CHANGELOG.md` — registro por hito.
- `docs/TESTING.md` — cómo probar manualmente cada entrega.

## Principios que no se negocian

- **Solo adultos**: fecha de nacimiento ≥ 18 validada en backend; intentos de menores se registran y bloquean.
- **Rango de edad mutuo e innegociable** (RF-DES-11): se aplica en la consulta SQL de Descubrir; ningún nivel de pago lo desactiva.
- **Intención sobre volumen**: 8 intereses diarios gratis, lista curada (30/día; 60 en Oro), sin deslizar infinito.
- **Moderación previa**: todo texto e imagen de usuarios pasa por clasificación automática antes de publicarse o entregarse.
- **Ninguna función de pago desactiva seguridad ni moderación** (RF-PLU-09).
