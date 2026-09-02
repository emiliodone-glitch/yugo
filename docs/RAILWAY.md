# Desplegar Yugo en Railway

Guía paso a paso. Todo lo que dice aquí está verificado contra el código: los
puertos, las rutas de salud, las variables y el orden importan.

## Qué se despliega

| Servicio | Origen | Puerto | Salud |
| --- | --- | --- | --- |
| `postgres` | Imagen `postgis/postgis:16-3.4` con volumen | 5432 | — |
| `redis` | Plugin Redis de Railway (opcional, recomendado) | 6379 | — |
| `api` | Este repo, `apps/api/Dockerfile` | `PORT` (Railway) | `GET /v1/health` |
| `web` | Este repo, `apps/web/Dockerfile` | 3000 | `GET /` |

**PostGIS no es opcional.** La primera migración ejecuta
`CREATE EXTENSION IF NOT EXISTS postgis` y Descubrir calcula distancias con
funciones de PostGIS en SQL. Si el Postgres no trae la extensión, la API no
arranca. La plantilla estándar de Postgres de Railway **no** la incluye; por eso
el paso 2 despliega la imagen oficial de PostGIS como servicio Docker.

La API aplica las migraciones sola al arrancar (`prisma migrate deploy` antes
de `node dist/main.js`). No hay que correr nada a mano después de cada
despliegue.

## Antes de empezar

- Cuenta en [railway.com](https://railway.com) y la CLI instalada:
  `npm i -g @railway/cli` y `railway login`.
- El repositorio en GitHub, con la rama que se va a desplegar.
- Un dominio o los subdominios `*.up.railway.app` que Railway genera.

## 1. Crear el proyecto

```bash
railway init            # nombre: yugo
```

O desde la web: **New Project → Empty project**.

## 2. Base de datos con PostGIS

En el proyecto: **+ New → Docker Image** → `postgis/postgis:16-3.4`.

Variables del servicio:

| Variable | Valor |
| --- | --- |
| `POSTGRES_USER` | `yugo` |
| `POSTGRES_PASSWORD` | una contraseña larga y generada |
| `POSTGRES_DB` | `yugo` |
| `PGDATA` | `/var/lib/postgresql/data/pgdata` |

**Volumen:** Settings → Volumes → montar en `/var/lib/postgresql/data`. Sin
volumen, los datos se pierden en cada despliegue.

No hace falta exponerlo públicamente: la API llega por la red privada de
Railway con el host `postgres.railway.internal`.

## 3. Redis (opcional)

**+ New → Database → Redis.** La API funciona sin Redis —degrada a memoria del
proceso— pero con más de una réplica o para los contadores diarios compartidos
hace falta. Railway expone `REDIS_URL` como variable de referencia.

## 4. La API

**+ New → GitHub Repo → este repositorio.** En Settings del servicio:

- **Root Directory:** dejar vacío (la raíz del monorepo). El Dockerfile necesita
  `pnpm-lock.yaml` y los paquetes compartidos.
- **Config-as-code:** `apps/api/railway.json` (Railway lo detecta si se indica
  la ruta en Settings → Config-as-code). Fija el Dockerfile, el healthcheck y
  la política de reinicio.
- **Watch paths** (para que no redespliegue por cambios de la web):
  `apps/api/**`, `packages/**`, `pnpm-lock.yaml`.

Variables:

| Variable | Valor | Nota |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://yugo:<pass>@postgres.railway.internal:5432/yugo?schema=public` | Host privado del paso 2 |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` | Referencia al plugin; omitir si no hay Redis |
| `NODE_ENV` | `production` | |
| `WEB_URL` | `https://<dominio-de-la-web>` | **CORS.** Sin esto el navegador rechaza las llamadas de la web |
| `JWT_ACCESS_SECRET` | 48+ caracteres aleatorios | `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | otros 48+ caracteres, distintos | Rotar el de refresco invalida sesiones |
| `JWT_ACCESS_TTL` | `900s` | |
| `JWT_REFRESH_TTL` | `30d` | |
| `APP_TIMEZONE` | `America/Santo_Domingo` | Límites diarios y devocional |
| `OTP_PROVIDER` | `console` hasta tener SMS/correo | Con `console` los códigos salen en los logs; **no sirve para usuarios reales** |
| `ANTHROPIC_API_KEY` | la clave | Sin ella, la moderación de texto usa un simulador local |
| `MODERATION_TEXT_MODEL` | `claude-haiku-4-5-20251001` | |
| `IMAGE_MODERATION_PROVIDER` | `stub` o `external` | |
| `FACE_MATCH_URL`, `FACE_MATCH_API_KEY` | vacías hasta contratar el proveedor | Vacías → toda selfie va a revisión humana |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | del bucket (R2 o S3) | Fotos y selfies |
| `PAYMENT_PROVIDER` | `stub` hasta integrar Azul/Stripe | |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | del proveedor de correo | |
| `EXPO_ACCESS_TOKEN` | token de Expo | Notificaciones push |

No pongas `PORT`: Railway lo inyecta y la API lo lee.

**Dominio:** Settings → Networking → Generate Domain (o el tuyo). Anota la URL:
la web y la app la necesitan.

**Primer arranque:** en los logs debe verse `Applying migration` … y luego
`Yugo API listening`. Comprueba:

```bash
curl https://<api>/v1/health
# {"status":"ok","checks":{"database":"ok","cache":"ok"},...}
```

### Sembrar datos (solo la primera vez, y solo si quieres la demo)

La semilla crea el catálogo (denominaciones, áreas de servicio, documentos
legales, ajustes) que la app **sí necesita**, y además 40 perfiles ficticios,
eventos e iglesias de ejemplo. Para producción real, siembra y luego borra lo
ficticio, o adapta `prisma/seed.ts` para que solo cargue el catálogo.

```bash
railway run --service api sh -c "cd apps/api && npx tsx prisma/seed.ts"
```

Las cuentas sembradas usan la contraseña `Yugo.demo1` y el admin exige 2FA por
correo. Con `OTP_PROVIDER=console` el código aparece en los logs del servicio.

## 5. La web

**+ New → GitHub Repo → el mismo repositorio.** Root Directory vacío;
config-as-code en `apps/web/railway.json`; watch paths `apps/web/**`,
`packages/**`, `pnpm-lock.yaml`.

Variables (se usan **al construir**, así que un cambio exige redesplegar):

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://<dominio-de-la-api>` (sin `/v1`) |
| `NEXT_PUBLIC_DEMO_MODE` | `false` |

Railway pasa las variables del servicio como `ARG` al Dockerfile, que ya los
declara. Genera el dominio de la web y **vuelve a la API para poner `WEB_URL`**
con esa URL exacta (con `https://`, sin barra final). Sin ese paso, el
navegador bloquea las peticiones por CORS y la web parece "no cargar nada".

## 6. Comprobar que todo funciona

Desde tu máquina, contra la API desplegada:

```bash
cd apps/api
API_BASE_URL=https://<api>/v1 pnpm test:smoke
```

La suite de humo recorre registro, Descubrir, conexión, chat, etapas,
acompañamiento, devocional, muro de oración y la cola de moderación (130
comprobaciones). Necesita la base sembrada y acceso a la base para dos
comprobaciones (lee `DATABASE_URL`); si no la expones públicamente, córrela
con `railway run --service api`.

En el navegador: abre la web, entra con `demo1@yugo.do` / `Yugo.demo1`, y
verifica que Descubrir trae perfiles. Si trae la demo en vez de datos reales,
`NEXT_PUBLIC_DEMO_MODE` quedó en `true` en el build.

## 7. La app móvil apunta a la API

En `apps/mobile`, el APK se construye con `EXPO_PUBLIC_API_URL` apuntando a la
API de Railway. Ver `docs/STORE_RELEASE.md`, sección «APK con EAS».

## Cuando algo falla

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| La API reinicia en bucle y los logs dicen `postgis` | El Postgres no tiene PostGIS | Usar la imagen `postgis/postgis:16-3.4` (paso 2) |
| `P1001 Can't reach database` | `DATABASE_URL` con host público o contraseña mal | Usar `postgres.railway.internal` y la contraseña del servicio |
| La web carga pero todo está vacío y la consola dice CORS | `WEB_URL` en la API no coincide con el dominio de la web | Poner la URL exacta con `https://` y sin barra final |
| La web muestra datos de demo | `NEXT_PUBLIC_DEMO_MODE=true` en el build | Ponerla en `false` y redesplegar la web |
| Nadie puede entrar como admin | 2FA por correo con `OTP_PROVIDER=console` | Leer el código en los logs de la API, o configurar SMTP |
| Las fotos no suben | Variables `S3_*` vacías | Configurar R2/S3 (RF-PER-02) |

## Lo que Railway no resuelve

- **Alguien tiene que escribir el devocional cada día** (`/admin/devocionales`).
  El tablero avisa cuando quedan menos de siete.
- **Alguien tiene que vaciar la cola de retenidos** (`/admin/moderacion`), al
  menos dos veces al día.
- `OTP_PROVIDER=console` no sirve para usuarios reales: nadie va a leer los
  logs para entrar. Configura correo (SMTP o Resend) antes del piloto.
- Los pagos están en `stub`. La integración con Azul es trabajo pendiente.
