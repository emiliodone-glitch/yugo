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

pnpm --filter @yugo/web e2e     # 56 pruebas E2E (Playwright, móvil + escritorio)
maestro test apps/mobile/.maestro   # flujos móviles críticos
k6 run infra/k6/discover.js         # carga sobre Descubrir
```

## Documentación

- `docs/Yugo_Requerimientos_v1.md` — documento de requerimientos (fuente de verdad, códigos RF-XXX-NN).
- `docs/mockups/Yugo_Mockups.html` — mockups de referencia de las tres superficies.
- `docs/ARCHITECTURE.md` — decisiones de arquitectura.
- `docs/DECISIONES.md` — **lo que Yugo decide no construir**, qué cuesta cada
  decisión y qué evidencia la cambiaría.
- `docs/CHANGELOG.md` — registro por hito.
- `docs/TESTING.md` — cómo probar manualmente cada entrega.
- `docs/OPERATIONS.md` — runbook: alertas, incidentes frecuentes, respaldos.
- `docs/STORE_RELEASE.md` — publicación en App Store y Google Play.

## Principios que no se negocian

- **Solo adultos**: fecha de nacimiento ≥ 18 validada en backend; intentos de menores se registran y bloquean.
- **Rango de edad mutuo e innegociable** (RF-DES-11): se aplica en la consulta SQL de Descubrir; ningún nivel de pago lo desactiva.
- **Intención sobre volumen**: 8 intereses diarios gratis, lista curada (30/día; 60 en Oro), sin deslizar infinito.
- **Moderación previa**: todo texto e imagen de usuarios pasa por clasificación automática antes de publicarse o entregarse.
- **Ninguna función de pago desactiva seguridad ni moderación** (RF-PLU-09).
- **El cupo es el que cabe en el salón**: ningún plan permite entrar por encima
  del aforo de un encuentro. La prioridad de Oro es una reserva *dentro* del
  cupo, y se disuelve 48 h antes.
- **Al declarar noviazgo, los dos salen de Descubrir**, en ambas direcciones. Le
  cuesta alcance a Yugo y por eso mismo vale: es la promesa a la que una iglesia
  le presta su nombre.
- **Una etapa la declaran los dos**: uno propone y el otro acepta. La app no
  puede decir que dos personas son novios porque una tocó un botón.
- **Quien acompaña ve la etapa, nunca el chat.** No es una pantalla que
  decidimos no construir: `AccompanimentService` no tiene ningún camino a una
  conversación, y la suite de humo comprueba que un padrino recibe 403 en los
  endpoints de chat.
- **Nunca guardamos ni contactamos a un tercero.** El plan del primer encuentro
  no pide el teléfono de tu contacto de confianza: la app escribe el mensaje y
  tú lo mandas (Ley 172-13).
- **El éxito se mide en vínculos, no en dinero.** El embudo del panel termina en
  matrimonios; las suscripciones se miden en su propio reporte.
- **Se valida el propósito, no solo el contenido.** La moderación lee mensajes;
  las señales de propósito leen el patrón. Coleccionar conexiones sin hablar con
  nadie se detecta — y lo peor que pasa de forma automática es una conversación
  privada. Sancionar sigue siendo de una persona.
- **Ningún puntaje de propósito se muestra a nadie.** Un número visible se
  vuelve un juego de estatus y la gente aprende a moverlo en vez de a
  comportarse. La insignia «Perfil con propósito» se gana con comportamiento
  sostenido y no se compra.
- **Nadie ve la respuesta del otro antes de escribir la suya.** En las
  conversaciones que importan, las dos se revelan a la vez. El dato no sale del
  servidor mientras falte una.
- **No se optimiza tiempo en pantalla.** Sin videollamadas, sin feed infinito,
  sin rachas. En una app de matrimonio, quien más horas acumula es
  desproporcionadamente quien la está usando mal. Lo que sí se busca es que la
  app **valga la pena abrirla**: el devocional y el muro de oración le sirven a
  alguien aunque nunca conozca a nadie aquí.

Cada una de estas ausencias tiene un costo, y ninguno es cero. Están todos
dichos —con qué evidencia cambiaría cada decisión— en
[`docs/DECISIONES.md`](docs/DECISIONES.md).
