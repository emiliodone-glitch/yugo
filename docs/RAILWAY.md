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

Los dos Dockerfiles se construyen desde la raíz del monorepo; el
`.dockerignore` de la raíz deja fuera `node_modules`, los artefactos y
cualquier `.env`. Aviso honesto: las imágenes no se han construido todavía en
ningún entorno con acceso a Docker Hub, así que **el primer despliegue es la
primera construcción real**. Si falla, el log de build de Railway dice en qué
etapa (`deps`, `build` o `runtime`) y la tabla del final de esta guía cubre lo
más probable.

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
| `DATABASE_URL` | `postgresql://yugo:${{postgres.POSTGRES_PASSWORD}}@${{postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/yugo?schema=public` | Referencias al servicio `postgres` del paso 2; no hay que copiar la contraseña |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` | Referencia al plugin; omitir si no hay Redis |
| `NODE_ENV` | `production` | |
| `SEED_ON_BOOT` | `always` durante el piloto; `true` después | `true`: siembra solo si la base está vacía (primer arranque). `always`: reaplica la semilla en cada despliegue (es idempotente) para que los datos de prueba nuevos lleguen solos. Nunca `always` con usuarios reales: reescribe los perfiles de demo |
| `WEB_URL` | `https://<dominio-de-la-web>` | Solo para los enlaces que la API genera (compartir un evento). Ya **no** afecta a CORS: la API autentica con tokens, no con cookies, y acepta cualquier origen |
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

### Cuentas para validar

| Cuenta | Contraseña | Para qué |
| --- | --- | --- |
| `prueba@yugo.do` | `Yugo.prueba1` | **La cuenta de prueba.** Llega con conexiones en tres etapas, una propuesta de noviazgo esperando respuesta, mensajes sin leer, intereses recibidos, un evento con una conexión, constancia en el devocional, una petición de oración acompañada y notificaciones. Es la que hay que abrir para ver la app viva |
| `demo1@yugo.do` … `demo40@yugo.do` | `Yugo.demo1` | Los 40 perfiles ficticios. Sirven para entrar «como la otra persona» de una conexión (`demo3` y `demo5` conversan con la cuenta de prueba) |
| `admin@yugo.do` | `Yugo.demo1` + código | El panel admin (`/admin`). Pide 2FA: con `OTP_PROVIDER=console`, el código sale en **Deploy Logs** del servicio `api` en una línea `OTP for admin@yugo.do (LOGIN): 123456`. Búscalo con el filtro `OTP for` |

El portal de iglesias (`/iglesias`) se abre con cualquier cuenta: si no está
vinculada a una iglesia, la propia pantalla ofrece registrarla; la solicitud
aparece en `/admin/organizaciones` para aprobarla.

## 5. La web

**+ New → GitHub Repo → el mismo repositorio.** Root Directory vacío;
config-as-code en `apps/web/railway.json`; watch paths `apps/web/**`,
`packages/**`, `pnpm-lock.yaml`.

Variables:

| Variable | Valor | Nota |
| --- | --- | --- |
| `API_URL` | `https://<dominio-de-la-api>` (sin `/v1`) | Se lee **al servir cada página**: cambiarla surte efecto en cuanto el servicio se reinicia, sin reconstruir. Cópiala de servicio api → Settings → Networking |
| `NEXT_PUBLIC_DEMO_MODE` | `false` | Se hornea al construir |

`API_URL` debe ser la URL **literal**. Una referencia como
`https://${{api.RAILWAY_PUBLIC_DOMAIN}}` solo resuelve si el servicio se llama
exactamente `api`; Railway nombra `@yugo/api` a los que crea desde el
monorepo, y con ese nombre la referencia queda vacía y la web apunta a
`https:///v1`. Si prefieres referencias, renombra antes los servicios a `api`
y `web` (Settings → Service name).

`NEXT_PUBLIC_API_URL` sigue funcionando como alternativa horneada al construir,
pero ya no hace falta. No hay que configurar CORS: la API acepta cualquier
origen porque autentica con tokens y no con cookies.

## 5b. Desplegar desde GitHub (opcional, recomendado después de la primera vez)

Una vez creados los servicios a mano (pasos 2 a 5), los despliegues siguientes
pueden salir solos desde GitHub con `.github/workflows/railway.yml`:

1. En Railway: **Project → Settings → Tokens → New token**. Copia el valor.
2. En GitHub: **Settings → Secrets and variables → Actions → New repository
   secret** con el nombre `RAILWAY_TOKEN`.
3. Opcional, en **Variables** del repo: `RAILWAY_API_URL` con la URL pública de
   la API (para que el flujo espere a que esté sana), y `RAILWAY_API_SERVICE` /
   `RAILWAY_WEB_SERVICE` si los servicios no se llaman `api` y `web`.

A partir de ahí, cada push a la rama por defecto que toque la API, la web o
los paquetes despliega; y en **Actions → Railway → Run workflow** se puede
lanzar a mano eligiendo qué servicio, con dos casillas más:

- **Sembrar** (`seed`): corre `prisma/seed.ts` desde GitHub, una sola vez.
  Como el runner está fuera de Railway, Postgres tiene que ser alcanzable:
  servicio `postgres` → Settings → Networking → **TCP Proxy**. La URL pública
  resultante (`postgresql://yugo:<pass>@<host>.proxy.rlwy.net:<puerto>/yugo`)
  va en el secreto `SEED_DATABASE_URL`. El proxy se puede apagar después.
- **Suite de humo** (`smoke`): las 130 comprobaciones contra la API
  desplegada, con la base recién sembrada. Usa `RAILWAY_API_URL` y el mismo
  secreto. Repetirla enseguida falla por el limitador de inicio de sesión
  (10 por hora), que es correcto: no lo debilites.

Con los servicios creados como **Empty Service** (sin conectar el repo de
GitHub en Railway), este flujo es el único que despliega y no hay
despliegues dobles.

El flujo `deploy.yml` que ya existía apunta a un proveedor genérico por
webhook (`STAGING_DEPLOY_HOOK`, `PRODUCTION_DEPLOY_HOOK`). Si Railway es el
destino, ese flujo va a fallar en su paso de despliegue por falta de esos
secretos: desactívalo en **Actions → Deploy → ⋯ → Disable workflow**, o
bórralo.

## 6. Comprobar que todo funciona

Desde tu máquina, contra la API desplegada:

```bash
cd apps/api
SMOKE_BASE_URL=https://<api>/v1 pnpm test:smoke
```

La suite de humo recorre registro, Descubrir, conexión, chat, etapas,
acompañamiento, devocional, muro de oración y la cola de moderación (130
comprobaciones). Necesita la base sembrada y acceso a la base para dos
comprobaciones (lee `DATABASE_URL`); si no la expones públicamente, córrela
con `railway run --service api`.

En el navegador, primero abre `https://<web>/estado`: esa página prueba desde
tu navegador que la web llega a la API y, si no, dice qué variable tocar
(`API_URL` ausente o mal construida, o API caída). Cuando
diga «La API responde», entra con `prueba@yugo.do` / `Yugo.prueba1` y verifica
que Descubrir trae perfiles. Si trae la demo en vez de datos reales,
`NEXT_PUBLIC_DEMO_MODE` quedó en `true` en el build.

## 7. La app móvil apunta a la API

En `apps/mobile`, el APK se construye con `EXPO_PUBLIC_API_URL` apuntando a la
API de Railway. Ver `docs/STORE_RELEASE.md`, sección «APK con EAS».

## Cuando algo falla

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| La API reinicia en bucle y los logs dicen `postgis` | El Postgres no tiene PostGIS | Usar la imagen `postgis/postgis:16-3.4` (paso 2) |
| `P1001 Can't reach database` repetido hasta «Crashed» | El servicio Postgres no está en línea: acaba de redesplegarse (imagen nueva, volumen borrado) y tarda, o no arrancó (la imagen `postgis` exige `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_DB`; sin ellas se apaga con «superuser password is not specified») | La API espera hasta 2 minutos a la base antes de rendirse (`DB_WAIT_SECONDS`). Si aun así cae, abre el servicio Postgres → Deployments → Deploy Logs y corrige lo que diga; luego Redeploy en la API |
| `P1001` con un host que no es `*.railway.internal` | `DATABASE_URL` apunta al host público o a otro sitio | Usar el dominio privado del servicio Postgres (`${{Postgres.RAILWAY_PRIVATE_DOMAIN}}`, con el nombre exacto del servicio) |
| `P1013 … empty host in database URL` al arrancar | La referencia `${{postgres.RAILWAY_PRIVATE_DOMAIN}}` quedó vacía: no existe un servicio llamado exactamente `postgres` | Crear el servicio PostGIS (paso 2) o renombrarlo a `postgres`; la API redespliega sola |
| La API arranca sin correr migraciones ni semilla | Railway puso un «Custom Start Command» (`pnpm start`) al detectar el monorepo | Da igual: `start` y el CMD ejecutan `start.mjs`, que migra, siembra si procede y arranca. Si quieres limpiarlo: Settings → Deploy → Custom Start Command vacío |
| La web muestra datos de demo | `NEXT_PUBLIC_DEMO_MODE=true` en el build | Ponerla en `false` y redesplegar la web |
| La web muestra «Dirección configurada: https:///v1» o `localhost` | La web no sabe dónde está la API: `API_URL` no existe, o se puso una referencia `${{api.…}}` que quedó vacía porque el servicio no se llama `api` | Servicio web → Variables → `API_URL` con la URL literal de la API (`https://…up.railway.app`, sin `/v1`). Sin reconstruir: la web la lee al reiniciarse |
| Al entrar sale «No se pudo conectar con el servidor» | `API_URL` ausente o mal, o la API caída | Abrir `https://<web>/estado`: hace la prueba desde el navegador y separa los casos con el paso a seguir en cada uno |
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
