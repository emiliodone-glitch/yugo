# Yugo — Unidos en la misma fe

## Ficha

| | |
| --- | --- |
| Repositorio | `emiliodone-glitch/yugo` (público) |
| Rama de trabajo | `claude/yugo-user-interface-xeq4er` (la rama `main` no existe en el remoto; todo está en esta rama) |
| Sesión original | «Yugo» — https://claude.ai/code/session_01GNC3mYMPYmoou6A3U9N9kp |
| Período | 2026-08-30 → 2026-09-09 (75 commits: 30 en agosto, 45 en septiembre) |
| Estado final | Completado: v0.13.0. Cuatro bloques de paridad web ↔ app (feeds y tarjetas, cola sin conexión y estados vacíos, mapas web y entrada con QR, confirmaciones en pantalla). API 251 pruebas, shared 145, móvil 59, E2E web 393; 5 trabajos de CI en verde. Selfie con gestos y escáner del portal verificados solo por rutas de respaldo. |
| Artefacto | «Lanzamiento de Yugo»: https://claude.ai/code/artifact/47ad9364-6ed9-46a5-a4d9-c72b0cd60ce6 |

## Contexto del producto

Plataforma de citas con propósito, comunidad y eventos para personas
cristianas de distintas denominaciones, con foco inicial en República
Dominicana. Cuatro superficies sobre un único backend:

| Superficie | Carpeta | Stack |
| --- | --- | --- |
| App móvil | `apps/mobile` | Expo (React Native), TypeScript, Expo Router |
| Web de usuario | `apps/web` | Next.js 14 (App Router), Tailwind, React Query |
| Panel administrativo | `apps/web` → `/admin` | Next.js |
| Portal de iglesias | `apps/web` → `/iglesias` | Next.js |
| API | `apps/api` | NestJS 10, Prisma, PostgreSQL 16 + PostGIS, Redis, BullMQ, Socket.IO |

Paquetes: `packages/shared` (tipos, zod, i18n es-DO, fixtures) y
`packages/ui-tokens`. pnpm + Turbo. Infra local con Docker (PostGIS, Redis,
MinIO, Mailpit). Despliegue en Railway, APK desde GitHub Actions, gitleaks en
CI y pre-commit.

**Documentos de referencia dentro del repo**:

- `docs/Yugo_Requerimientos_v1.md` — fuente de verdad (códigos RF-XXX-NN).
- `docs/mockups/Yugo_Mockups.html` — mockups de las tres superficies.
- `docs/CHANGELOG.md` — registro por hito, v0.1.0 a v0.13.0, con los RF
  cubiertos y cómo verificar cada entrega.
- `docs/DECISIONES.md` — lo que Yugo decide no construir, qué cuesta y qué
  evidencia lo cambiaría (sin deslizar infinito, sin rachas, etc.).
- `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/OPERATIONS.md`,
  `docs/RAILWAY.md`, `docs/STORE_RELEASE.md`.

**Principios que no se negocian**: solo adultos; rango de edad mutuo aplicado
en SQL; 8 intereses diarios gratis y lista curada de 30/día (60 en Oro);
moderación previa de texto e imagen; ningún pago desactiva seguridad; el cupo
es el del salón; al declarar noviazgo ambos salen de Descubrir; una etapa la
declaran los dos; quien acompaña ve la etapa, nunca el chat; nunca se guarda
ni contacta a un tercero; el éxito se mide en vínculos; ningún puntaje de
propósito se muestra; no se optimiza tiempo en pantalla.

**Hitos** (detalle en `docs/CHANGELOG.md` y en la cronología):

- v0.1.0 MVP inicial (30 ago) · v0.2.0 de maqueta a producto usable · v0.3.0 el
  propósito dentro del producto (devocional, muro de oración) · v0.4.0 propósito
  verificable y conversaciones que importan · v0.5.0 dos defectos y revisión
  con capturas · v0.6.0 listo para Railway y app validada antes del APK ·
  v0.7.0 explorar sin cuenta, panel y portal reales · v0.8.0 escritorio de
  verdad y diagnóstico de conexión · v0.9.0 pantallas que dicen la verdad ·
  v0.10.0 panel admin y portal de iglesias con datos reales · v0.11.0 ronda de
  experiencia (registro corto, fotos, notificaciones, QR real, Stripe) ·
  v0.12.0 voz propia, razones de afinidad, cierre digno, videollamada, padrino,
  ruta de pareja · v0.13.0 paridad web ↔ app.

## Cronología completa de cambios (75 commits, del más antiguo al más reciente)

### 2026-08-30 12:45 · `5c4c609`
**chore: monorepo foundations — pnpm+turbo, docker compose, design tokens, shared domain (Hito 1)**

- infra/docker-compose.yml: postgres+postgis, redis, minio, mailpit
- packages/ui-tokens: brand palette, typography, spacing (sección 11)
- packages/shared: domain types, zod validators (RF-AUT-03, RF-DES-11),
  affinity engine with tests (RF-DES-02/03, 7.1), catalogs, i18n es-DO,
  demo fixtures, limits (RF-DES-05, RF-PLU-*)
- CI workflow (lint + typecheck + test + build)

### 2026-08-30 13:09 · `24f0a90`
**feat(api): NestJS backend — auth, profile, discover/affinity, chat, community, events, verification, church portal, admin, subscriptions**

- Prisma schema completo (sección 9) + migración inicial con PostGIS + seeds
  (denominaciones RD, matriz de afinidad, 3 iglesias, 40 perfiles, 10 eventos,
  pacto v1.0, ajustes por defecto)
- RF-AUT-01..08: OTP, validación de mayoría de edad con registro de intentos,
  pacto versionado, tokens acceso/refresco, pausa y eliminación con gracia 14d,
  2FA para roles administrativos
- RF-PER-01..11: perfil, completeness, preferencias, vista previa, fotos con
  URL firmada y moderación de imagen
- RF-VER-01..05: selfie con gestos, códigos de iglesia de un solo uso (30d),
  solicitud a líder, revocación con motivo
- RF-DES-01..15: lista diaria cacheada, AffinityService con pesos de Setting,
  filtro mutuo de edad EN SQL (RF-DES-11), modo invisible (RF-DES-12),
  deshacer Pasar, modo viaje, quién vio mi perfil, límites en Redis con
  reinicio 00:00 America/Santo_Domingo
- RF-CON-01..10: conexiones, chat Socket.IO, moderación previa con Anthropic
  (stub en dev), rompehielos por plantillas, sanciones automáticas 7.3
- RF-COM-01..09, RF-EVE-01..08, RF-IGL-01..06, RF-ADM-01..12, RF-PLU-01..10
- 27 pruebas unitarias verdes (afinidad, límites, moderación, rompehielos,
  completeness, ranking)

### 2026-08-30 13:24 · `902ad6c`
**feat(web): Next.js — app de usuario, panel admin y portal de iglesias fieles a los mockups**

App de usuario (Hito 13 + UI de los hitos 2-12):
- Bienvenida, onboarding de 8 pasos con Pacto de conducta (RF-AUT-03/04)
- Inicio con resumen del día y evento destacado
- Descubrir: lista vertical curada, anillo de afinidad, insignia de respaldo,
  Pasar/Me interesa/Guardar (RF-DES-01..05)
- Desglose de afinidad con el arco del yugo (RF-DES-03)
- Conexiones + chat con rompehielos, estados de moderación y consejos de
  seguridad (RF-CON-02..07, RF-SEG-06)
- Comunidad: grupos, petición de oración con 'Estoy orando', actividades
- Eventos: mapa estilizado + lista con asistencia y conexiones que asisten
- Mi perfil con escalera de verificación; paywall Plus/Oro (RF-PLU-06);
  Visibilidad y búsqueda con regla mutua de edad y controles Oro (RF-DES-11/12/14/15)

Panel admin (RF-ADM-01..12): tablero KPIs, cola de moderación unificada,
verificación lado a lado, configuración del algoritmo (pesos suman 100,
matriz editable), miembros, organizaciones, eventos, grupos, suscripciones
con doble aprobación, reportes y bitácora.

Portal de iglesias (RF-IGL-01..06): crear evento con vista previa y flujo de
revisión, códigos de respaldo, grupo oficial, métricas y usuarios.

Modo demo con fixtures compartidos; tokens de diseño y Fraunces/DM Sans.

### 2026-08-30 14:13 · `7bdb679`
**feat(mobile): app Expo con pantallas de los mockups + tooling de calidad**

- Expo Router con tabs Inicio/Descubrir/Conexiones/Comunidad/Eventos
- Bienvenida, onboarding de 8 pasos con Pacto de conducta (RF-AUT-04),
  Descubrir con anillo de afinidad e insignia de respaldo, desglose de
  afinidad con arco del yugo, chat con rompehielos y estados de moderación,
  comunidad con 'Estoy orando', eventos con mapa y asistencia, perfil con
  escalera de verificación, paywall Plus/Oro y Visibilidad (RF-DES-11/12/14/15)
- Fraunces y DM Sans con expo-font; tokens desde @yugo/ui-tokens
- ESLint raíz + Husky pre-commit; 0 warnings en todo el monorepo

### 2026-08-30 14:17 · `a09e090`
**docs: CHANGELOG por hito, guía de pruebas manuales y decisiones de arquitectura**

### 2026-08-30 14:30 · `0a51969`
**feat(api): Hito 14 (privacidad/Ley 172-13), Google/Apple Sign-In y colas BullMQ**

Hito 14 — Seguridad, privacidad y cumplimiento (RF-SEG-06..08, RNF-04/07):
- Módulo privacy: exportación de datos personales, rectificación y purga real
  a los 14 días conservando solo lo que la ley permite (RF-AUT-08, RF-SEG-08)
- Rangos de distancia como control opt-in (RF-SEG-07) con spec
- Contenido legal versionado (pacto, términos, privacidad, consejos de
  seguridad) y guard que fuerza re-aceptación al cambiar de versión (RF-SEG-01)
- Rate limiting global por usuario/IP con límites estrictos en registro, OTP,
  login y recuperación de contraseña

RF-AUT-02 — Google y Apple Sign-In verificando la firma del id_token contra el
JWKS del proveedor, emisor, audiencia y expiración. La mayoría de edad se sigue
validando en backend porque los proveedores no entregan fecha de nacimiento.

Colas BullMQ (moderación de imagen, push, correo) con ejecución inline cuando
no hay Redis; plantillas de correo transaccional en es-DO con spec (RF-NOT-03);
endpoints de salud y métricas operativas (RNF-08).

### 2026-08-30 14:34 · `5c1e147`
**feat(web): pantallas restantes del mapa de pantallas (sección 10.1)**

- Te interesa a… con el corte gratuito/Plus (RF-DES-09) y Guardados (RF-DES-04)
- Detalle de grupo con muro moderado, actividades y miembros (RF-COM-04..07)
- Detalle de evento con asistencia, conexiones que asisten y check-in QR
  renderizado en SVG (RF-EVE-04/05/06)
- Centro de notificaciones con preferencias por categoría y horario
  silencioso (RF-NOT-01/02)
- Privacidad y seguridad: rangos de distancia, consejos de seguridad,
  descarga de datos y eliminación de cuenta (RF-SEG-06/07/08)
- Páginas legales públicas versionadas (términos, privacidad, pacto)
- Enlaces cruzados desde perfil, comunidad, eventos, conexiones y descubrir

### 2026-08-30 14:39 · `520cf79`
**test: Hito 15 — E2E Playwright, Maestro, k6 y logs estructurados**

- 56 pruebas E2E (móvil + escritorio) sobre los flujos críticos de RNF-09:
  registro con pacto y bloqueo de menores, descubrir → interés → conexión →
  chat con moderación previa, paywall Plus/Oro, visibilidad y regla mutua de
  edad, derechos Ley 172-13, panel admin (colas, verificación, pesos que
  deben sumar 100) y portal de iglesias (evento con vista previa, códigos)
- Playwright resuelve el Chromium del sistema cuando la build no coincide
- Maestro: registro con pacto y descubrir → chat moderado en móvil
- k6: carga de Descubrir (p95 < 400 ms, RNF-02) y de chat con el costo de la
  moderación previa (objetivo < 300 ms, 7.3)
- Interceptor de logs estructurados en JSON con correlación y latencia, sin
  registrar cuerpos que puedan contener datos personales (RNF-08)
- CI ampliado: cobertura, E2E con reporte y verificación de migraciones+seed
  contra PostGIS real

### 2026-08-30 14:44 · `6266849`
**chore: despliegue con aprobación manual, runbook de operación y guía de tiendas**

- Dockerfiles multi-etapa para API y web (usuario sin privilegios, healthcheck)
- Workflow de despliegue: imágenes a GHCR, migraciones antes del tráfico,
  staging automático con smoke test y E2E, producción con aprobación manual
  del entorno protegido (RNF-10)
- docs/OPERATIONS.md: umbrales de alerta conectados a /health/metrics,
  incidentes frecuentes (clasificador caído, Descubrir vacío, Redis caído),
  tareas programadas, respaldos y escalada
- docs/STORE_RELEASE.md: requisitos de App Store y Google Play para apps de
  citas mapeados a dónde está cada uno implementado, notas para el revisor y
  pasos de publicación (RNF-07)
- CHANGELOG, TESTING y README actualizados

### 2026-08-30 15:32 · `7ff49fb`
**feat: cliente de API tipado, cableado real de la web y RF pendientes**

Cierra la brecha estructural del Hito 1: el transporte HTTP y el cliente
tipado que faltaban, y con ellos el cableado de todas las pantallas web.

Cliente compartido (packages/shared/src/api)
- http.ts: bearer token, refresh transparente compartido entre 401 en
  paralelo (una sola renovacion), errores de dominio tipados (ApiError con
  needsCovenant / needsUpgrade / isRateLimited).
- client.ts: un metodo por endpoint agrupado por modulo (auth, profiles,
  photos, catalog, discover, interests, connections, community, events,
  verification, subscriptions, notifications, privacy, church, admin).
- TokenStorage como adaptador: localStorage en web, SecureStore en movil.

RF cerrados en la API
- RF-PER-09 respuestas de conversacion moderadas que alimentan completitud
  e rompehielos (profiles/answers.service.ts).
- RF-DES-10 perfil destacado 24 h con cuota semanal contada desde AuditLog
  (discover/boost.service.ts).
- RF-CON-09 / RF-CON-10 reportar desde el chat e invitar a un evento.
- RF-COM-02 grupos con aprobacion previa (migracion 0003).
- RF-PLU-04 codigos promocionales.
- RF-EVE-08 calendario, compartir y check-in con QR.
- RF-ADM-10 contenidos administrables (banners, rompehielos, consejos)
  movidos a common para que chat e inicio los lean.
- RF-ADM-12 reportes exportables: crecimiento, retencion por cohorte,
  embudo, provincia y denominacion, con CSV que Excel es-DO abre directo.

Web
- lib/api.ts, lib/hooks.ts y lib/providers.tsx: cada pantalla tiene un solo
  camino de codigo que resuelve contra fixtures (demo) o contra la API.
- Pantallas nuevas: /entrar, /recuperar, /perfil/verificacion (escalera de
  tres niveles con selfie guiada, codigo de iglesia y respaldo de lider),
  /perfil/destacar y /perfil/promo.

Pruebas: 43 unitarias de API, 26 compartidas, 84 E2E de Playwright.

### 2026-08-30 15:54 · `f3c0477`
**feat(movil): paridad completa de pantallas y cableado a la API**

La app movil ahora cubre el mismo mapa de pantallas que la web y consume
la API real con el cliente tipado compartido.

Nuevo paquete @yugo/app-core
- Los hooks de pantalla y el estado demo dejan de vivir en la web y pasan
  a un paquete compartido: web y movil resuelven cada pantalla con el
  mismo codigo, contra los fixtures o contra la API.
- runtime.ts inyecta el cliente y el modo demo desde cada app; provider.ts
  expone el QueryClient para que ambas usen una sola instancia de
  react-query.
- Los mensajes en espanol de los codigos de error del API se movieron a
  @yugo/shared (i18n/api-errors) y los usan las dos aplicaciones.

Movil
- lib/api.ts: tokens en el llavero del dispositivo (expo-secure-store),
  refresh transparente y cierre de sesion global.
- Pantallas nuevas: entrar, recuperar, perfil/verificacion (escalera de
  tres niveles con selfie guiada, codigo de iglesia y respaldo de lider),
  perfil/destacar, perfil/promo, perfil/notificaciones,
  perfil/preferencias, perfil/privacidad, descubrir/guardados,
  descubrir/te-interesa, comunidad/[id], eventos/[id] y legal/[kind].
- Pantallas existentes cableadas a los hooks: inicio, descubrir,
  conexiones, comunidad, eventos, chat (con reportar, bloquear, deshacer
  conexion e invitar a un evento), afinidad, perfil, visibilidad y plus.
- El registro crea la cuenta contra la API: la cuenta se registra cuando
  ya se conoce la fecha de nacimiento (RF-AUT-03), luego el codigo OTP,
  el pacto con su version (RF-AUT-04) y el perfil al terminar. El mismo
  cambio se aplico a la web.
- Kit nativo ampliado: ScreenHeader, Field, Toggle, Segment, Notice,
  ScoreBar, YugoLink, QrCode y ListRow.
- Flujos Maestro actualizados y uno nuevo para el perfil y la
  verificacion.

Verificacion: lint, typecheck y pruebas del monorepo en verde;
43 unitarias de API, 26 compartidas y 84 E2E de Playwright.

### 2026-08-30 17:47 · `71f5e65`
**feat(notificaciones): horario silencioso real y trazabilidad de los 105 RF**

El horario silencioso estaba documentado en un comentario pero nunca se
habia implementado: las preferencias eran locales a la pantalla y el push
salia a cualquier hora. Ahora existe de verdad.

RF-NOT-02
- Modelo NotificationQuietHours (migracion 0004) con la ventana en horas
  enteras de America/Santo_Domingo.
- quietHoursDelayMs resuelve la ventana que cruza la medianoche
  (22:00 -> 07:00), que no se puede expresar como start <= hora < end.
- Una notificacion levantada dentro de la ventana siempre se guarda; lo
  que espera es el push, que se encola con retraso hasta que la ventana
  cierra en vez de perderse. QueueService acepta delayMs para eso.
- Endpoints GET/PUT /notifications/quiet-hours, metodo en el cliente
  tipado y hooks compartidos; web y movil editan la ventana y silencian
  cada categoria por separado contra la API.
- 8 pruebas unitarias fijan instantes en UTC y verifican la lectura
  local, el cruce de medianoche, el minuto exacto de cierre, la ventana
  no envolvente, la ventana vacia y el interruptor apagado.
- 2 pruebas E2E sobre el centro de notificaciones y sus preferencias.

Trazabilidad
- NOTIFICATION_CATEGORIES se movio a @yugo/shared: las dos aplicaciones
  repetian la lista.
- RF-EVE-07 y RF-SEG-04 estaban implementados pero sin su codigo en el
  fuente; quedan anotados. Los 105 RF del documento de requerimientos
  aparecen ahora en el codigo.

Documentacion: CHANGELOG con el cierre del cliente tipado, la paridad
movil y el horario silencioso; TESTING con el recorrido de la ventana y
el modo demo de movil; ARCHITECTURE con @yugo/app-core.

Verificacion: lint, typecheck, build y pruebas en verde — 51 unitarias de
API, 26 compartidas y 88 E2E de Playwright.

### 2026-08-30 18:23 · `ec157c0`
**fix: cerrar RNF-01, RNF-05 y RNF-06**

Los tres unicos requisitos no funcionales que no tenian respaldo en el
codigo. Los RF ya estaban completos; estos no.

RNF-05 accesibilidad
- Audite las 21 superficies con axe contra WCAG 2.1 AA: 10 fallaban, todas
  por contraste. No era una regresion: nunca se habia medido.
- Las correcciones van en la paleta, no parcheando pantalla por pantalla:
  olive #7A8450 -> #6B7445 (blanco encima pasa de 4.0 a 4.99) y muted
  #6C7280 -> #63697A (sobre linen2 pasa de 4.12 a 4.69). Movil hereda las
  dos porque comparten @yugo/ui-tokens.
- El enlace al perfil desde Inicio no tenia nombre accesible.
- El lateral del portal de iglesias usaba un crema de 4.30 y aclaraba el
  fondo del elemento activo, que baja el contraste del texto blanco en vez
  de subirlo; ahora lo oscurece (6.38).
- Las notificaciones leidas se atenuaban al 70 %: ninguna opacidad conserva
  AA sobre blanco, asi que ahora se marca lo NO leido con un borde de
  acento en lugar de apagar lo leido. Mejor lectura para todos.
- 42 pruebas nuevas (movil y escritorio) fijan la regla: una regresion de
  contraste rompe la suite en vez de descubrirse en la tienda.

RNF-06 i18n
- El espanol era el unico idioma posible: un objeto `es` exportado directo.
  Ahora hay registro de locales, `Dictionary` derivado del diccionario de
  referencia con las literales de `as const` ensanchadas, y resolveLocale()
  para la lista de idiomas del navegador o del dispositivo.
- Anadir ingles es escribir un archivo tipado como Dictionary: el
  compilador exige cada clave, incluidas las funciones de interpolacion y
  sus firmas. Ninguna de las 70 pantallas cambia.
- 5 pruebas, una de ellas prueba en tiempo de compilacion que un
  diccionario traducido encaja.

RNF-01 respaldos
- La retencion de 30 dias estaba escrita como politica pero no existia el
  script. infra/scripts/backup-postgres.sh vuelca, verifica con
  `pg_restore --list` ANTES de rotar (si el respaldo de hoy salio mal
  conserva el historico en vez de borrarlo) y opcionalmente copia fuera
  del servidor.

Verificacion: lint, typecheck, build y pruebas en verde — 51 unitarias de
API, 31 compartidas y 130 E2E de Playwright.

### 2026-08-30 23:17 · `ed61f22`
**fix: cuatro fallos de arranque y uno de producto, hallados al correr contra Postgres real**

Instale PostgreSQL 16 + PostGIS desde apt (Docker Hub sigue bloqueado en este
entorno), aplique las cuatro migraciones, sembre y levante la API. Nada la
habia ejecutado nunca contra una base real: las unitarias cubren el dominio
aislado y Playwright la interfaz en modo demo, pero entre ambas no habia nadie.

Tres de estos fallos impedian arrancar en produccion.

Arranque
- El entrypoint compilado no existia. prisma/seed.ts estaba en el `include`
  del tsconfig, asi que el rootDir comun subia a la raiz y el build emitia
  dist/src/main.js, mientras el script `start` y el CMD del Dockerfile apuntan
  a dist/main.js: el contenedor arrancaba y moria. El seed corre con tsx, nunca
  compilado, asi que sale del build y se tipa en tsconfig.typecheck.json.
- tsbuildinfo quedaba fuera de dist: borrar dist sin borrarlo dejaba builds
  vacios en silencio. Ahora vive dentro y deleteOutDir lo limpia.
- Un ValidationPipe global pedia class-validator, paquete que el proyecto no
  usa porque la validacion es de zod por controlador. Retirado.
- make_interval(days => $n) recibia bigint de Prisma donde Postgres espera int:
  /discover respondia 500. Corregido con ::int en las tres consultas crudas.

Producto
- La lista diaria de Descubrir se cachea hasta la medianoche local (asi debe
  ser: no hay feed infinito) pero no se encogia. Quien ya habia recibido tu
  interes seguia en pantalla y volver a marcarlo devolvia already_interested.
  La exclusion se aplica ahora tambien al servir: la lista mantiene su
  composicion del dia y decrece conforme la persona la trabaja.

Trazabilidad legal
- El intento de registro de un menor se rechazaba en el esquema zod con 400,
  antes de llegar al servicio que lo escribe en AuditLog. Se bloqueaba pero no
  dejaba rastro, que es justo lo que RF-AUT-03 exige. El esquema de la API ya
  no valida la edad (los clientes si, para avisar antes de enviar) y el
  servidor es la unica autoridad: audita y responde 403.

Para que no vuelvan
- apps/api/test/api-smoke.ts levanta la API y le habla por HTTP: 21
  comprobaciones sobre salud, mayoria de edad, regla mutua de edad en ambos
  sentidos, lista del dia, horario silencioso, conexion reciproca y moderacion
  previa del chat.
- CI aplica migraciones, comprueba que no haya deriva de esquema, compila la
  API, la arranca y corre esa suite.

Verificacion: migraciones aplicadas sin deriva, semillas corridas, 21/21 de
humo contra la API viva, 51 unitarias de API, 31 compartidas, 130 E2E, lint,
typecheck y build en verde.

### 2026-08-30 23:21 · `0bd0010`
**fix(seguridad): los adaptadores sin proveedor fallan cerrado**

Revisando que queda en manos de terceros aparecio un patron peligroso: dos
adaptadores aprobaban cuando no habia proveedor configurado, en vez de
esperar a una persona.

RF-VER-01 comparacion facial
- El comparador estaba fijado al stub, sin forma de conectar un proveedor
  real: en produccion la verificacion de identidad se resolvia con un
  puntaje inventado. Hoy no auto-aprobaba solo porque el stub devolvia 0.91
  y el umbral es 0.93 — un margen de 0.02 entre un numero de desarrollo y
  aprobar identidades de verdad.
- Ahora se elige por FACE_MATCH_URL, el stub devuelve 0.5 y un fallo del
  proveedor deja la similitud desconocida en lugar de asumir un pase.
- La regla se extrajo a shouldAutoApprove() con 5 pruebas que la fijan.

RF-SEG-02 moderacion de imagenes
- Sin proveedor el stub aprobaba todas las fotos, tambien en produccion, lo
  que contradice la moderacion previa de todo el contenido. El stub queda
  para desarrollo y una produccion sin configurar retiene cada foto para
  revision humana.

La moderacion de texto ya fallaba cerrado y se dejo igual.

Verificacion: 56 unitarias de API, 31 compartidas, 21/21 de humo contra la
API viva, lint, typecheck y build en verde.

### 2026-08-31 04:54 · `2a07745`
**feat(fotos): subida, recorte y visualizacion reales en web y movil**

El backend de fotos estaba completo desde el principio (URL firmadas,
moderacion previa por cola, /discover ya devolvia photoUrl) pero ningun
cliente subia ni mostraba una imagen: 22 siluetas y cero <img>. Construi
fiel a los mockups, que dibujaban siluetas, pero una app de citas sin
fotos no la puede evaluar un usuario real.

Compartido
- Hooks useMyPhotos, useUploadPhoto y useDeletePhoto en @yugo/app-core.
  La subida pide la URL firmada, hace PUT de los bytes directo al
  almacenamiento y recien entonces registra la foto: los bytes nunca
  pasan por la API.

Web
- Avatar y PhotoPlaceholder muestran la foto cuando existe y caen a la
  inicial o al degradado cuando no.
- /perfil/fotos: subir, ver el estado de moderacion de cada una (en
  revision, publicada, no aprobada) y quitar. El recorte cuadrado ocurre
  en el navegador con canvas antes de subir, porque todas las superficies
  muestran la foto en cuadrado o circulo: sin recortar, la persona nunca
  veria el encuadre que ven los demas.
- Fotos conectadas en Descubrir, Inicio, Conexiones, chat, Guardados y
  Te interesa.

Movil
- expo-image-picker con camara y galeria, recorte nativo 1:1 y
  redimension con expo-image-manipulator antes de subir.
- Permisos declarados en app.json con textos en espanol.
- Misma pantalla /perfil/fotos y las mismas superficies conectadas.

API
- La lista de conexiones no llenaba otherUser.photoUrl aunque el tipo lo
  declaraba; ahora firma la URL de la foto principal aprobada.

Verificacion: 130 E2E, lint, typecheck y build en verde. En modo demo los
fixtures no traen foto, asi que la silueta se conserva y las pruebas
existentes no cambian.

### 2026-08-31 04:58 · `0ee8e8c`
**feat(chat): tiempo real, indicador de escritura y acuses**

El ChatGateway de Socket.IO existia en la API desde el principio y nunca
se conecto nadie: los mensajes solo aparecian al recargar. Esta es la
mitad que faltaba.

Compartido (@yugo/app-core/realtime)
- Una sola conexion por app, salas por conversacion y los tres eventos que
  el gateway habla: message:new, messages:read y typing.
- Los llamantes concurrentes comparten el intento en vuelo, asi que abrir
  dos conversaciones no abre dos sockets.
- Al reconectar se vuelve a unir a la sala: las salas viven del lado del
  servidor de una conexion, y sin esto la persona dejaria de recibir
  mensajes en silencio.
- La persistencia y la moderacion siguen en HTTP. El socket solo transporta
  lo ya decidido, de modo que una caida degrada al comportamiento anterior
  (se ve en la siguiente carga) en vez de perder o filtrar un mensaje.

useConversationRealtime
- Refresca la lista sin sondeo, expone si la otra persona escribe y cuando
  leyo lo que enviamos.
- El indicador de escritura se apaga solo a los 6 s: el evento de "dejo de
  escribir" se puede perder y si no se quedaria encendido para siempre.
- El aviso de escritura va limitado a uno por segundo.

Web y movil
- Indicador "escribiendo…" sobre el compositor y acuse Entregado/Leido
  bajo el ultimo mensaje propio entregado, no en cada burbuja.
- La sesion que se cierra desconecta el socket.

En modo demo no se conecta nada y las pantallas siguen funcionando desde
los fixtures. 130 E2E, lint, typecheck y build en verde.

### 2026-08-31 05:00 · `6074d14`
**feat(push): las notificaciones llegan al telefono y abren su pantalla**

El endpoint registerPushToken existia y la API sabia repartir por Expo,
pero la app nunca pedia un token: toda la infraestructura de
notificaciones (colas, preferencias por categoria, horario silencioso) no
alcanzaba ningun telefono.

Movil
- Pide permiso, crea el canal en Android y registra el token de Expo. Falla
  en silencio a proposito: un simulador no tiene token y quien niega el
  permiso debe seguir usando la app, que conserva su centro de
  notificaciones dentro.
- Un toque abre la pantalla que corresponde y nunca cae en vacio.

API
- La categoria viaja siempre en el payload, de modo que el toque tiene
  destino aunque quien notifica no haya pasado un id.
- La notificacion de conexion nueva ahora lleva su conversacion: tocarla
  abre el chat en vez del listado.

Compartido
- destinationFor() vive en @yugo/shared: es logica pura de dominio (que
  notificacion lleva a donde) y ahi si hay corredor de pruebas. 6 casos
  cubren la precedencia del id sobre la categoria, el piso del centro de
  notificaciones y los payload con valores que no son texto, que llegan
  como JSON del servidor y no deben producir una ruta rota.

El horario silencioso ya se respeta en el servidor, asi que no hizo falta
nada en el cliente. 37 pruebas compartidas, typecheck y build en verde.

### 2026-08-31 05:08 · `5ea79b5`
**feat(afinidad): el porque en la tarjeta, rompehielos del cruce real y filtro de respaldo**

Yugo se diferencia por la afinidad explicada y el respaldo de iglesia.
Ambas estaban subexplotadas.

El porque, en la tarjeta (RF-DES-02)
- affinityReason() en @yugo/shared convierte el desglose en una frase corta
  y concreta, visible sin abrir nada. Es lo que justifica una lista de seis
  personas frente al scroll infinito de la competencia.
- Deliberadamente conservador: nombra solo terreno real. Cuando dos
  personas no comparten nada especifico dice el puntaje en vez de
  inventar una conexion. 7 pruebas fijan la precedencia (misma iglesia
  gana a misma denominacion), el limite de dos ideas y el piso.
- Los fixtures lo derivan con el mismo generador, asi que el demo no puede
  desviarse de lo que leen los miembros.

Rompehielos desde el cruce (RF-CON-04)
- Antes salian solo del perfil ajeno, lo que se lee como entrevista. Ahora
  lo compartido va primero: una pregunta sobre algo que los dos hacen abre
  una conversacion entre iguales. 4 pruebas mas, incluida la de que sin
  terreno comun nadie se queda sin rompehielos.

Solo respaldados (RF-VER-02)
- Filtro gratuito a proposito: el respaldo es la senal de confianza del
  producto y cobrar por filtrarla empujaria a la gente hacia perfiles
  menos verificados.

La lista vacia deja de ser un callejon
- Antes decia "ya viste la lista de hoy" y nada mas. Ahora ofrece
  comunidad, eventos, ampliar la busqueda y quitar el filtro.

Metricas de iglesia (RF-IGL-06)
- Respaldos nuevos, codigos entregados y canjeados, tasa de canje y de
  check-in: la congregacion ve si su programa funciona.
- La pantalla dice explicitamente que no vera y por que. El limite es el
  punto del endpoint, no una nota al pie: el respaldo descansa sobre esa
  separacion.

Verificacion: 134 E2E, 60 unitarias de API, 44 compartidas, lint,
typecheck y build en verde.

### 2026-08-31 05:14 · `b644c58`
**feat(ux): prueba de valor en el registro, modo sin conexion y accesibilidad dinamica**

Ultima tanda de las mejoras acordadas: la friccion que cuesta usuarios.

Prueba de valor temprana
- GET /catalog/reach dice cuanta gente ya esta aqui para alguien de esa
  denominacion, y el registro lo muestra en el paso de fe. Ocho pasos de
  formulario antes de ver una senal de que vale la pena es mucho pedir.
- Deliberadamente grueso: un conteo, nunca una lista, redondeado a la
  decena y sin numero por debajo de un piso, para que no sirva para
  sondear quien hay en un pueblo pequeno.

Movil sin senal
- La cache de consultas se persiste 24 h: un arranque en frio sin datos
  muestra la ultima lista en vez de pantallas vacias. Solo lecturas;
  reproducir una mutacion vieja al reconectar es como las apps mandan
  cosas dos veces.
- NetInfo conectado a onlineManager: sin eso React Native no le reporta la
  conectividad a React Query y las consultas salen contra una radio muerta
  en vez de esperar.
- Aviso explicito mientras no hay conexion: ser claro es mejor que una
  pantalla que deja de actualizarse en silencio.

Accesibilidad dinamica (RNF-05)
- El tamano de letra del sistema se respeta hasta 1.6x y las superficies
  densas crecen con el en vez de recortar el texto. Mas alla la pantalla
  deja de ser usable y conviene el zoom del sistema, que amplia todo.
- prefers-reduced-motion en la web, con duracion casi cero en vez de none
  para que los manejadores de transitionend sigan disparando.

Verificacion: 136 E2E, 60 unitarias de API, 44 compartidas, lint,
typecheck y build en verde.

### 2026-08-31 14:27 · `0ceafd4`
**test: la suite de humo cubre las cinco fases nuevas y el tiempo real**

Las mejoras de la v0.2.0 se habian verificado con typecheck, build y E2E en
modo demo — es decir, contra fixtures. Nada las habia ejercido contra una
base real. Ahora si, y suma 13 comprobaciones (21 -> 34).

Nuevo en la suite
- RF-DES-02: el motivo de la sugerencia lo calcula el servidor y viaja en
  cada tarjeta.
- RF-VER-02: el filtro de respaldo no deja pasar a quien no lo tiene y
  nunca amplia la lista.
- /catalog/reach es publico, redondea a la decena y no filtra identidades.
- RF-PER-02: la firma de subida rechaza lo que no es una imagen.
- RF-CON-03: el gateway de tiempo real de punta a punta — autentica con el
  JWT, se une a la sala y un mensaje enviado por HTTP llega por el socket.

Ese ultimo bloque es el que mas hacia falta: el gateway existia desde el
principio sin que nada se conectara, asi que podia romperse sin que
ninguna prueba se enterara.

Tambien verifique a mano, con una foto aprobada insertada en la base, que
la lista de conexiones devuelve la URL firmada que anadi en la fase de
fotos; sin una foto real esa ruta no se distingue de estar rota.

Verificacion: 34/34 de humo contra Postgres real, 136 E2E, 60 unitarias de
API, 44 compartidas, lint, typecheck y build en verde.

### 2026-08-31 15:09 · `ff9188d`
**Etapas del vínculo y un embudo que termina en relaciones**

Una conexión que solo puede estar ACTIVE o ENDED no expresa lo que el
producto promete. Las etapas —conociéndonos, amistad intencional,
noviazgo, comprometidos— son de los dos: uno propone, el otro acepta, y
ninguna avanza sola.

La consecuencia que sostiene todo lo demás: al declarar noviazgo ambos
salen de Descubrir, en las dos direcciones. Ninguna app de citas lo hace
porque va contra su métrica; aquí es lo que hace que el respaldo de una
iglesia signifique algo. Le cuesta alcance a Yugo, y por eso vale.

Modelo y reglas
- RelationshipStage, Match.stage/proposedStage y RelationshipStageChange
  (historial append-only), con migración 0005 aplicada sin deriva.
- validateStageProposal en @yugo/shared: una etapa a la vez, sin saltos
  ni retrocesos. La misma función valida en la API y en modo demo, así
  que la demo no puede mostrar un paso que el producto rechazaría.
- RelationshipService: proponer, aceptar, posponer. Proponer la misma
  etapa que la otra persona ya propuso se trata como aceptación, no como
  empate. Llegar a noviazgo queda auditado (RELATIONSHIP_EXCLUSIVE).
- Descubrir excluye a quien declaró noviazgo del listado de los demás
  (SQL) y deja de darle candidatos a él mismo (settled: true).

Interfaz
- Tarjeta «Nuestra etapa» en el chat, web y móvil, con el aviso explícito
  de lo que implica declarar noviazgo antes de confirmarlo.
- La lista de conexiones señala el vínculo que avanzó y la propuesta que
  espera respuesta.

Medir lo correcto (RF-ADM-12)
El embudo terminaba en «Suscritos a Plus» y «Suscritos a Oro»: el sistema
definía su éxito como ingresos. Ahora termina en vínculos que avanzaron y
en noviazgos. Las suscripciones siguen medidas, en su propio reporte, sin
ser la meta. La pantalla de reportes deja de ser estática y lee del API.

Verificación
- 8 pruebas de etapas en shared (52 en total), 11 del servicio (71 en la
  API), 12 E2E nuevas (148 en total, incluida la auditoría axe).
- Suite de humo contra PostgreSQL real: 46/46, con el ciclo completo
  proponer → aceptar → noviazgo → salir de Descubrir en ambos sentidos.

### 2026-08-31 15:23 · `74d5dae`
**Acompañamiento: un matrimonio camina al lado, sin leer el chat**

Un noviazgo dentro de una iglesia no ocurre a solas. Yugo ya sabía en qué
etapa está una pareja; faltaba que alguien de su congregación pudiera
caminar al lado.

La invariante que sostiene todo el módulo: quien acompaña ve el vínculo y
su etapa, nunca un mensaje. No es una pantalla que decidimos no
construir. AccompanimentService no tiene ningún camino a una Conversation,
vive en su propio controlador, y la suite de humo comprueba contra un
servidor real que un padrino recibe 403 al intentar leer o escribir en el
chat. Una garantía de privacidad que no se puede verificar no es una
garantía.

Consentimiento
- Invitar es consentir, pero solo por quien invita: hacen falta los tres.
  Nadie inscribe a su pareja por su cuenta.
- Cualquiera de los tres puede terminarlo, cuando quiera, sin dar
  explicaciones. Un consentimiento que no se puede retirar no es
  consentimiento.
- Solo se puede invitar desde «Amistad intencional»: un vínculo en
  «conociéndonos» todavía no tiene qué acompañar, y la pantalla lo
  explica en vez de esconder la opción.

Quién puede acompañar
- Hace falta respaldo de iglesia nivel 3 (RF-VER-02): la congregación
  responde por alguien antes de que una pareja confíe en él.
- El matrimonio recibe un código para compartir. `spouseName` es texto
  libre porque el cónyuge muchas veces no está en Yugo, y fingir lo
  contrario dejaría fuera a matrimonios reales.

Aviso de avance
Cuando la pareja avanza de etapa, quien los acompaña se entera por la
app y no por terceros. Es la razón por la que alguien acepta acompañar.

Verificación
- 22 pruebas del servicio (93 en la API), incluidas las que fijan por
  nombre los campos que la respuesta del padrino puede contener.
- 7 E2E nuevas (166 en total, con auditoría axe de las dos pantallas).
- Suite de humo contra PostgreSQL real: 58/58, con el ciclo completo de
  invitación, triple consentimiento, y los 403 del padrino en el chat.

### 2026-08-31 15:36 · `bedf2fd`
**Encuentros convocados: el cupo es el que cabe en el salón**

La iglesia deja de ser un nombre en una insignia y pasa a convocar. Un
encuentro del ministerio de solteros es algo distinto de un culto, y
separarlos es lo que permite al ministerio ver si su propio trabajo está
llegando a alguien.

El cupo, corregido
La regla anterior dejaba a Oro entrar por encima del límite. El comentario
prometía «a small reserved buffer» que nunca se implementó, así que en la
práctica el dinero compraba una silla que no existe en el salón.

Ahora: el cupo no se pasa nunca, con ningún plan. La prioridad de Oro es
una reserva *dentro* del cupo (seatFor en @yugo/shared), y esa reserva se
disuelve 48 h antes, porque una silla guardada y vacía es peor que una
silla ocupada por cualquiera. La reserva tampoco se queda nunca con la
última plaza.

Lista de espera
Cuando el salón está lleno, la persona entra en lista de espera y se le
dice en qué lugar está. Si alguien cancela, el primero entra y recibe un
aviso. Decir «no» y olvidar a la persona es como una congregación la
pierde; decirle «eres la tercera» es como llena un salón.

Ministerio de solteros
Panel nuevo en el portal de iglesias, con la misma línea de privacidad que
el resto: totales y tasas, nunca nombres, nunca actividad de citas. La
lista de espera aparece ahí porque es el único número que le dice a una
iglesia que necesita un salón más grande: «vinieron 40» y «vinieron 40 y
25 no cupieron» son hechos muy distintos.

De paso
El portal de iglesias y el panel admin no tenían landmark <main>: sin él
un lector de pantalla no tiene dónde saltar y hay que recorrer el menú en
cada página.

Verificación
- 8 pruebas de cupo en shared (60 en total), 16 E2E nuevas (184 en total).
- Suite de humo contra PostgreSQL real: 63/63, con un encuentro de un solo
  lugar donde la segunda persona va a lista de espera y entra sola cuando
  la primera cancela.

### 2026-08-31 15:48 · `c853cd8`
**Historias: la escalera termina en el matrimonio, y se puede contar**

El producto promete relación con propósito de matrimonio, pero la última
etapa que la app sabía nombrar era el compromiso. Si no sabe nombrar el
resultado, no puede medir si cumplió su promesa — y lo que no se mide
termina reemplazado por lo que sí: ingresos, sesiones, tiempo en pantalla.

Ahora la escalera termina en «Casados». La boda ocurre fuera de la app;
declararla dentro es de los dos, como todas las demás etapas. El embudo
gana su última fila, y esa fila es el propósito del producto.

Historias
Es lo único que Yugo puede publicar que demuestre que hace lo que dice, y
también lo más fácil de falsificar. Por eso: la escriben solo parejas que
declararon el matrimonio, hacen falta los dos síes, la congregación queda
nombrada y una persona la lee antes de publicarla. Decir que no la borra
en vez de dejarla en una cola esperando que alguien cambie de opinión.

La página es pública y vive fuera de la app: quien no tiene cuenta también
debería poder ver para qué sirve esto, sin un muro de pago delante.

Una lista que ya no puede desincronizarse
«['COURTSHIP', 'ENGAGED']» estaba escrito a mano en cuatro sitios: una
cadena SQL, un filtro de Prisma y dos consultas de reportes. Añadir
MARRIED habría fallado en silencio en alguno, y una pareja casada
reapareciendo en Descubrir es justo el fallo que esta función existe para
evitar. Ahora se deriva de isExclusive en @yugo/shared.

Verificación
- 9 pruebas de etapas en shared (61 en total), 12 del servicio de
  historias (105 en la API), 5 E2E nuevas (196 en total).
- Suite de humo contra PostgreSQL real: 72/72, recorriendo la escalera
  completa hasta «Casados», comprobando que la historia no es pública ni
  con un solo sí ni en revisión, y que el embudo cuenta matrimonios.

### 2026-08-31 16:00 · `7be47a4`
**El evento como presentación, y un plan para el primer encuentro**

Coincidir en un evento
Compartir denominación es una etiqueta; estar los dos en la misma sala el
viernes es un hecho comprobable. Cuando el motivo de una sugerencia es un
evento al que van los dos, ese motivo desplaza a todos los demás en la
tarjeta y lleva al evento, porque además de un motivo es un plan: verse
entre gente conocida es más seguro que cualquier primera cita armada
desde cero. El rompehielos también lo usa, y va primero: no hay que
inventar un tema cuando ya van a estar en el mismo lugar.

La preferencia de la otra persona manda: allowEventPresenceVisible ya
gobierna quién puede ver que alguien asistirá a un evento (RF-EVE-05), y
honrarla con las conexiones e ignorarla con desconocidos sería
indefendible.

Plan del primer encuentro (RF-SEG-06)
Dos decisiones sostienen esta función:

1. El plan es de quien lo escribe. La otra persona del vínculo no lo ve
   ni sabe que existe. Avisarle a tu hermana dónde vas no es algo que
   debas negociar con la persona con quien vas a salir.

2. Yugo nunca guarda ni contacta al tercero. Conservar el teléfono de
   alguien que jamás aceptó estar aquí sería guardar datos personales de
   un tercero (Ley 172-13), y no hace falta: la app escribe el mensaje y
   la persona lo manda desde su propio teléfono. Solo se registra que lo
   hizo. `trustedContactLabel` es texto libre —«mi hermana Rosa»— para
   que el recordatorio de después pueda nombrar a alguien.

Unas horas después del encuentro la app pregunta «¿todo bien?», a la
persona y a nadie más. No avisamos a terceros en su nombre: no tenemos a
quién avisar ni derecho a hacerlo. Si algo salió mal, el aviso lleva a
reportar y bloquear.

Verificación
- 6 pruebas nuevas en shared (67 en total), 14 en la API (119), 6 E2E
  nuevas (208 en total), incluidas las que comprueban que el formulario
  no tiene ningún campo de teléfono.
- Suite de humo contra PostgreSQL real: 79/79, comprobando que la otra
  persona no ve ni puede tocar el plan y que la respuesta no contiene
  ningún número de teléfono.

### 2026-08-31 16:02 · `77562ab`
**Documentar la v0.3.0 y sembrar lo que hace falta para verla**

El README lista ahora las promesas nuevas junto a las que ya no se
negociaban: el cupo que ningún plan agranda, la salida mutua de Descubrir
al declarar noviazgo, la etapa que declaran los dos, el padrino que no ve
el chat, el tercero cuyo teléfono nunca guardamos, y el éxito medido en
vínculos y no en dinero.

Las semillas incluyen un encuentro de solteros con cupo pequeño —sin uno
que se llene, la lista de espera y la regla del aforo no se pueden ver en
una base recién sembrada—, un matrimonio con código de padrinos, y una
historia publicada, porque una página de historias vacía no dice para qué
existe todo lo demás.

Verificado con la base recién sembrada: 79/79 en la suite de humo, y
/historias responde sin sesión.

### 2026-08-31 16:42 · `485e9be`
**Validar el propósito, y sacar las conversaciones que importan**

La moderación leía mensajes, uno por uno. Nadie miraba el patrón de una
persona — y alguien puede escribir cien mensajes impecables mientras usa
Yugo para coleccionar conexiones. El contenido no lo delata; el
comportamiento sí.

Señales de propósito
Cinco señales que responden preguntas que un pastor haría sin datos: ¿le
escribe a quien dice que le interesa? ¿alguna conversación llega a algún
lado? ¿en seis meses ningún vínculo avanzó? ¿insiste en pedir dinero o en
sacar la charla de la app? ¿lo reportaron por no buscar lo que dice buscar?

Tres decisiones son el producto entero:

1. Ninguna señal castiga sola. Lo peor automático es fricción y una
   conversación privada que no acusa a nadie. Verificado contra la base
   real: tras el barrido, cuenta ACTIVE y cero sanciones.
2. Los falsos positivos duelen mucho más que los falsos negativos. Acusar
   de insinceridad a alguien sincero es la herida que este producto no
   puede permitirse. Una cuenta nueva no puede disparar ninguna señal, y
   el barrido contra los 40 miembros sembrados no señaló a ninguno.
3. El puntaje no se le muestra a nadie. Un número visible se vuelve un
   juego de estatus y la gente aprende a moverlo en vez de a comportarse.
   Solo lo ve moderación, con cada señal explicada en español: un puntaje
   sin explicación es una acusación sin pruebas.

La insignia «Perfil con propósito» se gana con evidencia positiva y no se
compra, igual que el filtro de respaldados es gratis.

Conversaciones que importan
Doce conversaciones concretas —dinero, hijos, familia política, conflicto,
fe— que se abren por etapa: preguntar por hijos en el primer mensaje
espanta, preguntarlo antes del compromiso llega tarde.

Las dos respuestas se revelan a la vez. Si el segundo ve la del primero,
contesta a esa respuesta y no a la pregunta. No es un hidden de CSS: el
dato no sale del servidor mientras falte una, y la suite de humo comprueba
que el texto no viaja en ninguna parte del payload.

Sin puntaje de compatibilidad. Dos personas que no coinciden aquí no están
mal emparejadas: están informadas.

De paso
Al contestar, la tarjeta saltaba a la siguiente pregunta y se llevaba por
delante la revelación recién desbloqueada, que es el momento que da
sentido a la función. Ahora se queda.

Verificación
- 97 pruebas en shared, 141 en la API, 224 E2E.
- Suite de humo contra PostgreSQL real: 89/89.

### 2026-08-31 16:58 · `5591540`
**Devocional diario y muro de oración: modelo, dominio y API**

Cuando alguien termina su lista de sugerencias del día, Yugo se queda sin
nada que ofrecerle hasta mañana. El devocional y el muro de oración le dan
una razón para volver que no depende de que haya alguien nuevo — y que le
sirve aunque nunca conozca a nadie aquí.

Decisiones que son el producto, no detalles de implementación:

- El mismo devocional para todos, cada día. Un plan personalizado daría
  mejores métricas de lectura y destruiría lo único valioso: que «142
  personas de tu iglesia lo leyeron hoy» signifique que leyeron lo mismo.
- Constancia, nunca racha. Una racha que se pierde convierte una disciplina
  espiritual en un puntaje y le añade culpa a quien faltó tres días, que es
  justo quien más falta hace que vuelva.
- De una petición anónima no sale del servidor ni el nombre ni la iglesia.
  En una congregación de cuarenta personas, «esto es de tu iglesia» reduce
  el anonimato a un puñado de candidatos, y la congregación es ante quien
  alguien elige no firmar. Se guarda churchId en null: la invariante vive en
  el dato, no en la consulta.
- El muro sube lo que nadie ha acompañado. Ordenado por fecha, la petición
  del tímido se queda en cero, que es peor que no haberla escrito.
- Nada se publica sin moderación previa: una petición de oración es el
  vehículo perfecto para una estafa, porque pedir ayuda es lo que se espera.

Migración 0012 aplicada contra PostgreSQL real, sin drift. 23 pruebas nuevas
en @yugo/shared y 15 en la API, incluida la que comprueba que el nombre no
aparece en ninguna parte del objeto serializado.

RF-COM-05, RF-COM-08

### 2026-08-31 17:16 · `6348320`
**Devocional y muro de oración en web, móvil e Inicio**

Cierra la brecha que hacía que la app no tuviera razón de existir un martes
cualquiera: cuando alguien terminaba su lista de sugerencias del día, no
había nada más. Ahora Inicio abre con el devocional y un vistazo al muro, y
las dos cosas sirven aunque esa persona nunca conozca a nadie aquí.

El vistazo del muro trae, por el orden del servidor, la petición que nadie
ha acompañado todavía: es la que de verdad necesita que alguien pase por
aquí hoy.

Las decisiones que estas pantallas defienden son sobre todo ausencias, que
son las más fáciles de deshacer sin darse cuenta, y por eso hay una prueba
para cada una:

- Ni una cadena habla de rachas, de días seguidos ni de días perdidos.
- Nunca se imprime un cero al lado de una petición: quien lee «0 personas
  orando» es la persona que peor la está pasando.
- La autoría se decide por id, nunca por nombre: dos personas se pueden
  llamar Ana y cada una vería la petición de la otra como suya.
- Volver a abrir el devocional no infla el conteo de la congregación; si lo
  inflara, «27 de tu iglesia lo leyeron hoy» dejaría de significar 27
  personas.

34 pruebas E2E nuevas en Playwright (desktop y móvil web) y 25 comprobaciones
nuevas en la suite de humo contra API y PostgreSQL reales: 115/115. La suite
de humo ahora mide desde dónde arranca la cuenta antes de gastar el límite
diario, en vez de asumir que empieza en cero.

RF-COM-05, RF-COM-08

### 2026-09-01 05:17 · `45df70a`
**Detección de secretos: gitleaks en CI y en el pre-commit, con auto-test**

Las reglas de fábrica de gitleaks NO atrapan las tres fugas más probables de
este repositorio. Se comprobó corriéndolo, no leyendo la documentación: un
DATABASE_URL de producción con contraseña, un REDIS_URL igual y una
ANTHROPIC_API_KEY pasan limpios. Sí atrapa Stripe, Azul y el token de Expo.

Esa asimetría tiene sentido del lado de gitleaks —una URI de conexión es
sintaxis legítima y aparece en mil archivos de ejemplo— y es exactamente por
eso que aquí hay que nombrarlas. En Yugo un DATABASE_URL filtrado no es la
credencial de un servicio: es la libreta de direcciones, las fotos y las
conversaciones de gente real, más las peticiones de oración anónimas que se
escribieron porque nadie iba a saber quién las firmó.

Reglas propias en .gitleaks.toml: URIs con contraseña embebida, clave de
Anthropic, Azul (procesador dominicano que gitleaks no conoce), secretos de
firma de JWT y bloques de clave privada.

scripts/secret-scan-selftest.sh le pone delante un secreto falso de cada forma
y falla si alguno pasa limpio; también comprueba que los valores de relleno del
repositorio no disparen nada, porque un escáner que grita por todo se apaga en
una semana. CI lo corre ANTES del escaneo: sin ese paso, una regla rota se
vería igual que un repositorio limpio. 15/15.

Dos redes con papeles distintos:
- CI escanea la historia completa (fetch-depth: 0) y bloquea el merge. Es la
  que no se puede saltar.
- El pre-commit avisa y DEJA PASAR si gitleaks no está instalado. Es una
  decisión: bloquear enseña a escribir --no-verify, y quien aprende ese
  reflejo se lo salta también el día que sí había un secreto. El costo queda
  documentado en OPERATIONS.md — si haces push con un secreto, CI lo detiene
  antes del merge pero ya está en el historial y hay que rotarlo igual.

El auto-test queda en el allowlist porque contiene secretos falsos por diseño.
Eso abre un punto ciego, dicho en voz alta en los dos archivos: es el único
sitio del repositorio donde un secreto real pasaría inadvertido.

RNF-05, RF-SEG

### 2026-09-01 05:18 · `fd3361d`
**Registrar lo que Yugo decide no construir, con su costo y su falsador**

Un producto se define tanto por lo que hace como por lo que se niega a hacer,
pero lo primero está en el código y lo segundo no está en ninguna parte. A los
seis meses nadie recuerda si una ausencia fue una decisión o un olvido.

docs/DECISIONES.md recoge cada una con tres cosas, y la tercera es la que
faltaba en README y CHANGELOG: qué evidencia concreta la cambiaría. Sin eso una
decisión de producto es una convicción, y las convicciones no se revisan.

Los costos van dichos sin adornos, porque una lista donde todo sale gratis es
una lista de excusas: la lista finita empeora las métricas de sesión frente a
cualquier competidor; renunciar a las rachas cuesta puntos enteros de retención
mensual, no decimales; no vender el rango de edad ni la insignia de propósito
cuesta ingresos reales; y el embudo que termina en matrimonios tiene un último
escalón que tarda años en moverse y va a ser tentador dejar de mirar.

También registra, en la otra dirección, que el acompañamiento y el devocional
estaban FUERA del MVP en la sección 3.2 de los requerimientos y se construyeron
igual. Añaden superficie que mantener y moderar, y no estaban presupuestados;
quien planifique lo siguiente debe saberlo.

Cada afirmación se verificó contra el código, no contra la memoria. Una salió
mal y se corrigió: decía que ningún endpoint devuelve el puntaje de propósito, y
sí existe GET /proposito/:userId restringido por rol a moderación. La decisión
real es esa restricción —quien juzga necesita ver el razonamiento, quien es
juzgado no necesita un marcador— y así quedó escrita.

### 2026-09-02 14:55 · `91e50b8`
**Arreglar dos defectos propios, y revisar la interfaz con capturas reales**

Dos defectos introducidos en la entrega anterior, encontrados al verificarla:

1. Una petición de oración retenida no podía aprobarse nunca. El caso de
   moderación se creaba solo con el id de la persona; la cola resolvía por
   mensaje, publicación o foto y no sabía qué hacer con este. A quien la
   escribió se le decía «se publica cuando alguien la apruebe», y nadie podía.
   Igual con las reflexiones del devocional y con los testimonios de «fue
   contestada», que además se descartaban en silencio.
2. No había forma de escribir devocionales. Catorce sembrados; el día quince la
   app iba a decir «el de hoy todavía no está publicado» para siempre.

Cola de retenidos, real. La pestaña traía un texto fijo («41 mensajes
retenidos») y no permitía hacer nada, ni siquiera con mensajes. Ahora trae el
contenido de cada cosa y dos botones; aprobar publica y avisa, rechazar retira
y también avisa. Una sola puerta para todos los tipos, para que el siguiente
texto que pase por moderación no repita la historia. Migración 0013 enlaza el
contenido en el caso y guarda el estado del testimonio.

Una petición o una reflexión nunca se rechaza sola: si el clasificador dice
«rechazar», queda retenida con prioridad alta y la decide una persona. En el
chat se le dice a la persona al instante que no se entregó; aquí se le dijo
que espere, y alguien tiene que estar del otro lado.

Autoría de devocionales en /admin/devocionales, con la reserva —días
consecutivos programados desde hoy— en grande y con color, y aviso en el
tablero con una semana. Uno ya leído no se reescribe ni se borra: lo que
alguien leyó fue lo que leyó. Es una dependencia operativa y queda escrita en
OPERATIONS.md: alguien tiene que escribir uno al día.

Lo que la suite encontró de paso:
- Desfase de un día en las fechas del devocional: publishOn es un DATE que
  Prisma entrega como medianoche UTC y formatearlo en hora de Santo Domingo lo
  convertía en el día anterior. La semilla tenía el mismo sesgo.
- El login del personal exige 2FA y la suite de humo no lo contemplaba. Ahora
  acuña su propio código, como haría una persona con la consola delante.

Revisión visual con 36 capturas, móvil y escritorio, y lo que se corrigió:
- En escritorio todo era una columna de 672 px con media pantalla vacía.
  Inicio va a dos columnas; Descubrir y Eventos en retícula. El chat, el
  perfil y los formularios se quedan estrechos: una conversación a 1000 px se
  lee peor.
- «Muro de oración» aparecía dos veces en su propia página.
- «Miércoles, 2 De Septiembre»: un capitalize de CSS. Corregido en web y app.
- Las pestañas de la web no tenían roles de pestaña; la app sí.
- El panel no tenía navegación en móvil.
- Un texto al 80 % de opacidad bajaba el contraste por debajo de AA.

Verificación: 120 pruebas en @yugo/shared, 179 en la API (22 nuevas),
290 E2E, auto-test del escáner 15/15, historia sin secretos. Suite de humo
contra API y PostgreSQL reales: 130/130, incluido el ciclo que antes no
cerraba: petición retenida → aparece en la cola con su texto → un moderador la
aprueba → aparece en el muro → sale de la cola.

RF-ADM-04, RF-COM-05, RF-COM-08, RNF-05

### 2026-09-02 19:43 · `400a500`
**Preparar Railway y validar la app antes del APK: una sola copia de React**

Lo que hacía falta para desplegar, y no estaba:
- La API no podía migrar en producción: prisma era dependencia de desarrollo
  y la imagen se instala con --prod. Ahora es dependencia y el contenedor
  arranca con `prisma migrate deploy && node dist/main.js`.
- La API ignoraba PORT, que es lo que Railway inyecta. Verificado arrancando
  con PORT=4100 y recibiendo /v1/health en ese puerto.
- railway.json por servicio y docs/RAILWAY.md con pasos, variables y la tabla
  de «cuando algo falla». La plantilla estándar de Postgres de Railway no trae
  PostGIS y la primera migración lo exige: la guía despliega
  postgis/postgis:16-3.4 con volumen.

No hay token de Railway ni de Expo en este entorno; el despliegue y el build
los lanza quien tenga las cuentas. Todo lo que se puede verificar sin ellas,
se verificó.

La app móvil, validada sin dispositivo (el SDK de Android no se puede
descargar desde aquí):
- expo export del bundle de Android. En la primera corrida faltaba
  @babel/runtime, que pnpm no expone a la app aunque Metro lo necesita: eso
  habría roto el build en EAS. Añadido; el bundle compila.
- Dos copias de React en el APK. @yugo/app-core resolvía react 18.3.1 desde su
  propio node_modules y la app usa 18.2.0 (la que exige React Native 0.74).
  Metro empaquetaba las dos: «Invalid hook call» al abrir. metro.config.js
  fuerza una sola copia de react, react-native, @tanstack/react-query y
  zustand, las cuatro que guardan estado en contextos de React.
- Cada pantalla se monta sin lanzar: suite Jest que descubre las 32 rutas, las
  monta con los proveedores de producción y falla si alguna lanza o escribe un
  error de React. Corre en modo demo y, con YUGO_TEST_LIVE=1, sin sesión contra
  la API real (todo 401, la app en pie). 33/33 en las dos.
- eas.json con preview (APK), preview-demo (APK con fixtures) y production
  (AAB). CI corre expo export.

El escáner de secretos atrapó «postgresql://yugo:<pass>@…» en la guía. Es un
marcador: la regla reconoce ahora <así> y ${ASÍ}, con caso en el auto-test.

Verificación: 120 shared, 179 API, 33 app, 290 E2E, escáner 17/17, suite de
humo contra API y PostgreSQL reales 130/130.

### 2026-09-02 21:50 · `974b9f1`
**Desplegar en Railway y generar el APK desde GitHub con un secreto y un clic**

Dos flujos nuevos para que el despliegue y el APK no dependan de una máquina
con la CLI de Railway o de EAS instalada:

- .github/workflows/railway.yml: `railway up` de la API y la web en cada push a
  main que toque apps/api, apps/web o packages, y a mano eligiendo el
  servicio. Único secreto: RAILWAY_TOKEN; sin él se detiene en el primer paso
  con el mensaje de dónde crearlo. Con la variable RAILWAY_API_URL espera a
  que /v1/health responda ok.
- .github/workflows/apk.yml: build de Android en EAS con el perfil elegido
  (preview, preview-demo, production). Antes de gastar cuota repite lo barato:
  tipos, las 32 pantallas montándose y el bundle de Android. Necesita
  EXPO_TOKEN y un `eas init` previo; el enlace al APK queda en el resumen.
- .dockerignore en la raíz: el contexto de los Dockerfiles arrastraba
  node_modules (1.1 GB) y podía arrastrar un .env local a una capa de imagen.

Se intentó construir las imágenes aquí: el daemon de Docker arranca pero la
política de salida bloquea el CDN de Docker Hub (403), así que el primer
despliegue en Railway es la primera construcción real. Queda dicho en
docs/RAILWAY.md y en el changelog, junto con los pasos exactos (5b en la guía
de Railway y «Desde GitHub» en la de tiendas).

Verificado: gitleaks 17/17 en el auto-test y sin hallazgos en el repo; ambos
YAML válidos; la exclusión de e2e/ del contexto coincide con la del tsconfig
de la web.

### 2026-09-03 00:09 · `91bcf02`
**Probar la app móvil real en Chromium y corregir lo que apareció**

Sin teléfono, emulador ni SDK de Android en este entorno, la pregunta «¿el
APK abre sin cerrarse?» se respondió con lo más cercano que existe:

- `pnpm --filter @yugo/mobile test:web` (apps/mobile/scripts/web-smoke.mjs):
  exporta el bundle de Metro para web con React Native Web —el mismo código
  del APK, con expo-router, React Query y los stores reales, sin módulos
  simulados— y lo abre en Chromium con viewport de teléfono. Recorre las 32
  rutas y un flujo con toques (entrar, devocional, Descubrir, guardar,
  afinidad, interés, Conexiones, chat, enviar mensaje, cinco pestañas).
  45 pasos sin errores de JavaScript ni pantallas en blanco. Corre también en
  el flujo de GitHub del APK antes de gastar cuota de EAS.
- `expo prebuild --platform android` genera el proyecto nativo sin fallos;
  el bundle de Android exportado es bytecode de Hermes.

Corregido a raíz de la prueba:

- +not-found en español: un enlace a algo borrado mostraba «Unmatched Route».
- useFontScale escuchaba un evento inexistente de AccessibilityInfo (nunca
  disparaba y hacía intermitente la suite de Jest al desmontar); ahora relee
  la escala al volver al primer plano. Jest simula la suscripción.
- La lista de Eventos formateaba en la zona del teléfono y el detalle en la
  de RD; ahora las dos usan APP_TIMEZONE.
- expo-system-ui instalado para que userInterfaceStyle aplique en Android.
- react-native-web, react-dom y @expo/metro-runtime como dependencias de
  desarrollo para la exportación web.

Verificado: 34 pantallas en Jest (dos corridas), 120 pruebas compartidas,
tipos de web y móvil, gitleaks 17/17 y sin hallazgos.

### 2026-09-07 21:05 · `5882ed9`
**Railway desde GitHub: disparar en la rama por defecto, sembrar y probar**

El flujo de Railway solo se disparaba por push a `main`, y este repositorio
no tiene esa rama: la rama por defecto es la de trabajo. Ahora el push corre
en la rama por defecto del repositorio, sea cual sea, y a mano desde
cualquiera.

Dos casillas nuevas al lanzarlo a mano, porque desde este entorno no se llega
a Railway y la única vía de verificación real es el registro del flujo:

- `seed`: corre prisma/seed.ts desde el runner contra la base por el TCP
  Proxy de Railway (secreto SEED_DATABASE_URL). Una sola vez.
- `smoke`: las 130 comprobaciones de la suite de humo contra la API
  desplegada, con la base recién sembrada.

Documentado en docs/RAILWAY.md (5b), con la razón de crear los servicios como
Empty Service para que no haya despliegues dobles.

### 2026-09-08 13:12 · `8572459`
**Flujo de Railway: opción «ninguno» para solo sembrar o probar cuando Railway despliega desde GitHub**

### 2026-09-08 13:13 · `5635ac0`
**Flujo de Railway: con «ninguno» no exige RAILWAY_TOKEN**

### 2026-09-08 13:35 · `253ecca`
**Primer arranque sin manos: la API siembra si la base está vacía (SEED_ON_BOOT)**

Para poner el sistema en marcha en Railway sin exponer Postgres ni correr la
semilla desde otra máquina: con SEED_ON_BOOT=true el contenedor ejecuta
prisma/seed-if-empty.ts después de las migraciones. Si no hay denominaciones,
siembra el catálogo (denominaciones, áreas de servicio, documentos legales,
ajustes) y los datos de demo; si hay una sola fila, no toca nada aunque la
variable siga puesta. tsx pasa a dependencia de producción.

Probado contra una base recién creada (siembra 41 usuarios), la misma base
otra vez (no siembra) y sin la variable (no se ejecuta).

La guía de Railway usa ahora referencias entre servicios para DATABASE_URL y
WEB_URL, de modo que no hay que copiar contraseñas ni dominios a mano. El
escáner de secretos las reconoce como marcadores (18/18 en el auto-test).

### 2026-09-08 13:51 · `a8f67ee`
**Dockerfiles: generar el cliente de Prisma en producción e incluir app-core en la web**

Primer build real en Railway, dos fallos:

- API: `COPY --from=build /app/node_modules/.prisma` no existe con pnpm (el
  cliente generado vive en node_modules/.pnpm/@prisma+client@<v>/…). La etapa
  de producción ahora corre `prisma generate` tras copiar prisma/.
- Web: faltaba @yugo/app-core en las etapas deps/build/runtime; next build
  fallaba con «Can't resolve '@yugo/app-core'».

Verificado reproduciendo cada etapa fuera de Docker con los mismos COPY:
instalación parcial con lockfile congelado, build de paquetes y next build
completo (51 páginas); instalación --prod, prisma generate y carga de
@prisma/client para la API.

### 2026-09-08 13:59 · `8a51a31`
**API: una sola secuencia de arranque (start.mjs) para el CMD y para `pnpm start`**

En Railway el contenedor arrancó con `pnpm start` (Custom Start Command que
Railway fijó al detectar el monorepo) en vez del CMD de la imagen, así que no
corrían ni las migraciones ni la semilla: la API se caía contra una base sin
tablas. Ahora `start`, `start:prod` y el CMD ejecutan apps/api/start.mjs:
migrate deploy → seed-if-empty si SEED_ON_BOOT=true → dist/main.js. Si falta
DATABASE_URL lo dice en claro (la referencia ${{postgres.…}} vacía es el
síntoma de que el servicio `postgres` no existe).

Probado localmente: migraciones al día, base con datos (no siembra), API
escuchando y /v1/health ok.

### 2026-09-08 15:28 · `251028a`
**Web contra la API real: puerta de sesión, destacados con formato correcto y errores visibles**

Primera entrada real a la web desplegada: «Ya tengo cuenta» entraba sin pedir
credenciales y todo quedaba en «Cargando…». Verificado en Chromium contra la
API real (modo sin demo), tres defectos que la demo tapaba:

- La bienvenida enlazaba a /inicio y la zona de miembros no comprobaba la
  sesión. Ahora «Ya tengo cuenta» va a /entrar y SessionGate manda sin sesión a
  /entrar?next=/ruta, volviendo ahí después de entrar (solo rutas internas).
- GET /events/featured devolvía filas crudas de Prisma; Inicio leía
  connectionsGoing.length y se caía con «Application error» tras entrar. Ahora
  reutiliza la agenda (EventSummary completo). La suite de humo comprueba el
  contrato.
- Los errores se mostraban como «Cargando…». Inicio distingue cargando de
  fallido (QueryError con Reintentar) y ApiStatusBanner avisa cuando la API no
  responde, con la URL configurada: el fallo más común de un despliegue nuevo.
- Una contraseña incorrecta decía «Tu sesión expiró»: el código de error
  conocido manda sobre el 401. Un fallo de red se distingue de una respuesta
  de error (isUnreachableError).

Suite de humo: comprobación del contrato de destacados; el orden por afinidad
se evalúa entre perfiles no destacados; la reescritura de un devocional leído
apunta al que se leyó (si la reserva está en cero, el «día libre» es hoy).
La variable correcta es SMOKE_BASE_URL (flujo de Railway y guía corregidos).

Verificado: 120 pruebas compartidas, 179 de la API, tipos y lint de la web,
290 E2E en demo, humo 132/132, y el flujo real en Chromium: redirección sin
sesión, entrada, Inicio con datos reales, ?next=, y API caída con aviso.

### 2026-09-08 16:37 · `cb8fadd`
**Explorar sin cuenta, panel y portal contra la API real, y cuenta de prueba**

Auditoría de las 48 rutas de la web en Chromium contra la API real (sesión
de miembro, de staff y anónima). Lo que apareció y se corrigió:

- Chat inutilizable en producción: la lista enlazaba con matchId y la API
  solo aceptaba el id de conversación (404). La lista usa el id correcto y
  la API acepta cualquiera de los dos en /connections/conversations/:id.
- /admin mostraba KPIs de fixtures a cualquiera. StaffGate por rol en el
  layout; el tablero lee /admin/dashboard.
- Portal de iglesias de utilería (fixtures, errores de hidratación, 403 sin
  manejar). ChurchGate contra /church-portal/me: sin sesión → entrar; sin
  iglesia → formulario de registro; pendiente → aviso. Portada, eventos y
  «nuevo evento» usan el portal real; /church-portal/events devuelve un
  resumen limpio.
- favicon que faltaba (404 en cada página).

Explorar sin cuenta (RF nuevo): /explorar desde la bienvenida, con el
devocional del día, próximos encuentros, historias, grupos y cómo funciona
Descubrir con una tarjeta de ejemplo marcada como ilustración. Endpoints
públicos /devocional/publico, /events/publicos y /community/groups/publicos:
texto y conteos, nunca perfiles. /e/:id existe por fin (era el enlace para
compartir eventos que la API generaba).

Cuenta de prueba prueba@yugo.do / Yugo.prueba1 (prisma/seed-tester.ts,
idempotente): conexiones en tres etapas, propuesta de noviazgo pendiente,
mensajes sin leer, intereses recibidos, evento con una conexión, devocional
con constancia, oración acompañada, notificaciones. SEED_ON_BOOT=always
reaplica la semilla en cada despliegue del piloto.

Verificado: auditoría 53/55 (los dos restantes eran el favicon, corregido, y
un id inventado por el guion), 300 E2E, humo 132/132, 179 API, 120
compartidas, tipos y lint en web, móvil y API.

### 2026-09-08 16:49 · `26006ce`
**Bienvenida: en pantalla ancha, dos columnas con el devocional de hoy y lo que hay dentro**

En escritorio quedaba media pantalla vacía entre la promesa y los botones:
era la pantalla del teléfono estirada. Ahora, a partir de md, la promesa y
las acciones van a la izquierda y a la derecha un panel con el devocional
del día (contenido real vía /devocional/publico; cambia cada día) y las tres
cosas que distinguen a Yugo. En el teléfono, un vistazo compacto entre el
texto y los botones. Esqueleto del mismo alto mientras carga.

E2E: 74 pruebas de registro, explorar y accesibilidad (axe) en verde;
se corrigió un contraste insuficiente y un texto duplicado que detectaron.

### 2026-09-08 17:19 · `fcef517`
**feat(web): escritorio de verdad y diagnóstico de conexión en /estado (RF-AUT-01, RF-CON-03, RNF-05)**

La web se veía como un teléfono estirado y «No se pudo conectar con el
servidor» no decía por qué.

Escritorio:
- AuthLayout para entrar, registro y recuperar: panel con la promesa, el
  devocional de hoy y las tres cosas que distinguen a Yugo; formulario en
  ancho de lectura. En el teléfono, la misma columna de siempre.
- Conexiones con lista y conversación lado a lado en pantallas ≥1280 px
  (layout propio, ConnectionsList extraído, fila activa con aria-current,
  estado vacío «Elige una conversación»). Sin relleno inferior en esa
  ruta para que el chat no haga scroll a toda la página.
- Perfil en dos columnas y Comunidad con tarjetas a dos columnas.
- AppShell: todas las secciones a 5xl; Conexiones a 6xl; devocional,
  oración, Plus y legal en columna de lectura (3xl).

Acceso:
- /estado: prueba desde el navegador si la web llega a /health y separa
  URL mal construida, API caída y CORS (WEB_URL), con el paso a seguir.
- La pantalla de entrar, ante un error de red, muestra la URL de API con
  la que se construyó y enlaza a /estado.

Pruebas: e2e/escritorio.spec.ts (8 casos, ambos proyectos); suite E2E
completa 300/300 + 77 de las afectadas; typecheck y lint limpios;
capturas a 1440 y 390 px. Docs: RAILWAY.md (sección 6 y síntoma nuevo),
CHANGELOG v0.8.0.

### 2026-09-08 18:19 · `9b2defd`
**fix(despliegue): API_URL en tiempo de ejecución, API que espera a Postgres y CORS sin WEB_URL (RF-AUT-01, RNF-04)**

En producción la web quedó apuntando a «https:///v1»: NEXT_PUBLIC_API_URL se
hornea al construir y la referencia de Railway resolvió vacía; la única
salida era otro build. La API, además, moría con P1001 en el primer segundo
cuando Postgres arrancaba después, y Railway la marcaba «Crashed».

Web:
- El layout raíz lee API_URL del servidor al servir cada página y la deja en
  window.__YUGO_API_URL__; apiBaseUrl() la prefiere sobre la horneada y
  descarta URLs sin host (referencias sin resolver). Cambiar la variable en
  Railway surte efecto al reiniciar, sin reconstruir. Páginas dinámicas.
- /estado dice de dónde salió la dirección (API_URL, build o ninguna) y
  los pasos hablan de API_URL; la pantalla de entrar y el aviso de la
  cáscara muestran la dirección real con la que se intentó.

API:
- start.mjs reintenta `prisma migrate deploy` hasta DB_WAIT_SECONDS (120)
  mientras el error sea de conectividad (P1001/P1017/ECONNREFUSED…); una
  contraseña mal o una migración rota siguen fallando en el acto. Mensaje
  final con el host y qué revisar en el servicio Postgres.
- CORS refleja cualquier origen: la API autentica solo con Bearer, nunca
  cookies, así que WEB_URL mal puesta solo producía «no carga nada».
  WEB_URL queda para los enlaces que la API genera.
- trust proxy = 1: detrás de Railway, req.ip era la del proxy y el límite
  de intentos de entrada era un solo contador para todos.

Verificado: start.mjs contra un puerto cerrado (3 intentos y salida clara);
CORS reflejado en GET y preflight; build web en modo real sin
NEXT_PUBLIC_API_URL + API_URL en runtime → entrar como prueba@yugo.do llega a
/inicio con datos reales; E2E 307/308 (1 omitido), API 179, typecheck y lint.
Docs: RAILWAY.md (sección 5, síntomas P1001 y «https:///v1»), CHANGELOG,
.env.example.

### 2026-09-08 18:35 · `b3b21d7`
**fix(api): raíz que dice «estoy viva», aviso de puerto en Railway y guardia de contraseña vacía (RNF-08)**

Tres cosas que habrían ahorrado adivinar en el despliegue:
- GET / (fuera del prefijo /v1) responde {name, health}: si carga, dominio y
  puerto están bien; antes era un 404 indistinguible de «no responde».
- Al arrancar en Railway, el log dice a qué puerto debe apuntar el dominio
  público y qué variable tocar si no coincide.
- start.mjs corta en seco si DATABASE_URL viene sin contraseña
  (`yugo:@host`), que es lo que deja una referencia ${{Postgres.…}} sin
  resolver, y dice cómo escribirla.

### 2026-09-08 19:04 · `e38d61f`
**docs(railway): Postgres en bucle por volumen de otra versión mayor (autovacuum_worker_slots) y cómo salir**

### 2026-09-08 19:47 · `0dac264`
**feat(web): pantallas de miembro con datos reales, escritorio a 1400 px centrado, portadas y retratos (RF-PER-08/10, RF-DES-02/09, RF-EVE-05/08, RNF-05)**

Ocho pantallas mostraban la ficha de demostración en modo real («Emilio, 34»
en el perfil de cualquier cuenta). Y la web usaba ~1000 px pegados al riel:
en 1920 la mitad derecha quedaba vacía.

app-core:
- useCurrentMember(): quién soy, igual para demo y API (/auth/me +
  /profiles/me/preview), con completitud y sugerencia siguiente.
- useUpdatePreferences, useUpdateProfile, useSetOroBadge, useSetTravelMode,
  useWhoViewedMe, usePauseProfile.
- useEvents/useEventDetail funden la asistencia del almacén de la demo.

web:
- Perfil, Preferencias, Visibilidad, «Te interesan», Comunidad, detalle de
  evento (agenda real, asistencia, .ics, compartir), detalle de afinidad y
  firma de publicaciones leen y escriben la cuenta real.
- AppShell: contenido centrado a la derecha del riel, hasta 1400 px;
  lectura a 3xl, oración a 5xl; Plus con fondo oscuro de borde a borde.
- Descubrir 3 columnas; Eventos lista 2 col + mapa fijo; detalle de evento,
  afinidad y grupo a dos columnas; muro de oración a dos columnas (CSS
  columns); títulos de sección más grandes en escritorio.
- PhotoPlaceholder por persona (degradado del color del avatar + inicial);
  EventCover por tipo (velas, montañas, ondas, manos, arcos, rayos, puntos)
  en Inicio, Eventos, detalle y página pública.
- CITIES compartido (portal de iglesias y modo viaje).

shared: PublicEvent lleva type e imageUrl; textos nuevos (perfil.fields,
visibilidad, comunidad, eventos, afinidad).

Verificado: E2E 305/308 + reejecución de las 4 suites afectadas tras corregir
la lista de espera (79/79); shared 120; typecheck web/app-core/móvil; lint;
capturas 1920 y 390 de todas las secciones; build en modo real + recorrido
como prueba@yugo.do (perfil propio, guardar preferencias, evento y grupo
reales, 0 errores de consola). CHANGELOG v0.9.0.

### 2026-09-08 20:33 · `033e124`
**Panel admin y portal de iglesias con datos reales; app móvil sin ficha demo**

Diez páginas del panel y cuatro del portal pintaban listas fijas: la cola de
verificación siempre tenía el mismo caso, «Generar 25 códigos» sumaba a un
número en memoria y «Aprobar» no llamaba a nadie. Ahora cada pantalla lee y
escribe en la API, con la demo como respaldo.

API (RF-ADM-02/03/05/06/09/10/11, RF-IGL-02/04/05/06)
- Filas limpias en admin.members() y admin.verificationQueue() (selfie y foto
  en URL firmada, similitud, prueba de vida, historial).
- Nuevos GET /admin/events, /admin/groups, /admin/churches,
  /admin/subscriptions/summary, /admin/staff.
- Portal: metrics con weeklyReach; GET /church-portal/group, GET/POST/DELETE
  de usuarios del portal (invitar solo ADMIN, la cuenta debe existir).
- Semilla: iglesia@yugo.do como administradora de la primera iglesia aprobada,
  con grupo oficial, códigos (5 usados), solicitudes de líder, un evento en
  revisión y una selfie pendiente en la cola de verificación.

Web
- Panel: miembros, verificaciones, moderación (reportes y apelaciones con
  decisión y motivo), eventos, grupos, organizaciones, suscripciones,
  configuración (pesos guardados y matriz celda a celda), auditoría (equipo
  real y bitácora filtrable) y reportes (crecimiento semanal real).
- Globos del menú admin desde las colas reales del tablero.
- Portal: códigos para copiar y generar, confirmar solicitudes, métricas
  reales, grupo oficial, usuarios con invitación y retiro de acceso.
- CITIES pasa a @yugo/shared para compartirla con la app móvil.

App móvil
- Perfil, Preferencias, Visibilidad y la firma en el muro de un grupo usan
  useCurrentMember, useUpdatePreferences, useSetOroBadge, useSetTravelMode,
  useWhoViewedMe y usePauseProfile; los interruptores Oro se deshabilitan
  sin Oro y lo dicen.

Verificación: API jest 179; E2E web 307 en demo; recorrido real como
admin@yugo.do e iglesia@yugo.do contra la API local; jest móvil 34 y humo
RN Web de 45 pasos sin errores.

### 2026-09-08 20:57 · `af9b199`
**Notificaciones que llegan: avisos del panel, aviso a quien reporta, resumen semanal y badge en vivo**

- Preferencias: RELATIONSHIP y ACCOMPANIMENT aceptadas (antes el toggle daba 400).
- Push: pushedAt real, tokens muertos (DeviceNotRegistered) se borran,
  ruta de acompañamiento y toque en frío en la app móvil.
- Correo por categoría (preferencia email) con plantilla NOTIFICATION.
- Resumen semanal por correo los lunes 9:00 (DigestService): interés,
  conexiones, mensajes sin leer, oraciones recibidas, eventos cerca y el
  devocional; nada de rachas; no se envía si la semana estuvo vacía;
  se apaga desde Notificaciones (User.weeklyDigestOptOutAt).
- El panel avisa a quien corresponde al aprobar o devolver eventos,
  iglesias y grupos, y a quien reportó cuando el caso se decide, sin
  revelar la sanción (RF-ADM-04/05/06).
- Sala por usuario en el gateway Socket.IO: notification:new en vivo,
  useUnreadNotifications con badge en el riel web y en Perfil móvil,
  marcar todas como leídas.
- Migración 0014: weeklyDigestOptOutAt, CityWaitlist, ChurchInvitation,
  ProductEvent (las tres últimas se usan en las siguientes entregas).

### 2026-09-08 21:03 · `e796f96`
**Registro corto y «Completa tu perfil» diferido (RF-AUT-01..04, RF-PER-01/10)**

- Registro en cuatro pasos en web y móvil: cuenta, edad, pacto y lo
  esencial (nombre, ciudad, qué buscas; denominación opcional con la señal
  de alcance, también cuando la persona es de las primeras). El paso de
  fotos que no subía nada desaparece; el rango de edad lo calcula la API.
- Pantalla final con lo que más ayuda ahora: fotos (+15 %), verificación
  como beneficio y «cuenta un poco más de ti».
- Nueva página «Completa tu perfil» (/perfil/editar en web y móvil): lo
  básico, la dimensión de fe y la historia, todo opcional, guardado con
  useUpdateProfile.
- Tarjeta «Tu perfil está al N %» en Inicio y Perfil: dice si aún no
  aparece en Descubrir (60 %) y cuál es el siguiente paso con su valor.
- E2E del pacto actualizado al nuevo paso «Lo esencial».

### 2026-09-08 21:08 · `8a46d6e`
**Fotos: guía al subir, tiempo de moderación honesto y cola de fotos en el panel con atajos (RF-PER-02, RF-ADM-04)**

- Miembro (web y móvil): «Las fotos que funcionan» (luz, rostro, tú y no un
  grupo, reciente y sin filtros), plazo real de moderación (menos de 24 h),
  motivo visible cuando una foto no se aprueba y «Subir otra».
- Panel: /admin/fotos, una foto a la vez y grande, las demás fotos aprobadas
  de la persona al lado, desde cuándo es miembro y cuánto lleva esperando;
  atajos A (aprobar), R (rechazar) y flechas; globo con la cola en el menú.
- Dos fallos de moderación corregidos: las fotos rechazadas en automático y
  las que el clasificador no pudo procesar quedaban con el caso abierto pero
  fuera de la lista (contaban en el globo y nadie podía verlas). Ahora se
  muestran con su origen y se pueden rescatar.
- Aprobar una foto recalcula la completitud del perfil (+15 %).

### 2026-09-08 21:12 · `22f6f89`
**Esqueletos de carga y actualizaciones optimistas en web y móvil**

- Componentes Skeleton (página, tarjeta, lista, rejilla de perfiles, chat)
  en web y móvil; el pulso respeta «reducir movimiento». Sustituyen el
  «Cargando…» centrado en Inicio, Descubrir, Conexiones, Comunidad, Eventos,
  detalle de evento, grupo, afinidad, chat y perfil.
- Marcar interés y pasar quitan la tarjeta al instante (con vuelta atrás si
  la API falla); guardar invalida «Guardados» (antes no se enteraba en
  producción); Amén/Orando suben el contador al momento; «Asistiré» se
  refleja al instante y el servidor confirma o lo pasa a lista de espera.

### 2026-09-08 23:38 · `6555331`
**Check-in con QR real, enlaces profundos, invitaciones al portal por enlace y lote de códigos para imprimir**

Check-in (RF-EVE-06)
- El QR vive en la entrada del evento, no en el teléfono: el portal imprime
  un QR real (qrcode) por evento publicado (GET /church-portal/events/:id/qr)
  que codifica la URL pública con el token de entrada.
- La app lo lee con la cámara (expo-camera, pantalla «Registrar mi
  asistencia») y registra la asistencia; con la cámara del teléfono, la web
  pública /e/:id?ci= la registra si hay sesión o pide entrar. Antes ambos
  clientes dibujaban una matriz que ningún lector entendía y la API validaba
  un token que nadie tenía.

Enlaces profundos (RF-NOT-03, RF-EVE-08)
- associatedDomains e intentFilters en app.json, apple-app-site-association
  y assetlinks.json en la web (con marcadores para TEAM_ID y la huella),
  ruta /e/[id] en la app que abre el detalle y registra el check-in, y
  «Abrir en la app» en la página pública del evento desde un teléfono.
- Manifest e icono para instalar la web como app.

Portal de iglesias (RF-IGL-02/05)
- Invitar a alguien sin cuenta crea una invitación con enlace (7 días) y
  correo; el registro acepta el token y la cuenta nace vinculada; también se
  acepta con sesión desde /iglesias/invitacion. Lista de pendientes con
  copiar y anular.
- «Imprimir lote (PDF)»: tarjetas recortables con el nombre de la iglesia,
  el código y cómo usarlo; la impresión del navegador las guarda en PDF.

### 2026-09-08 23:43 · `60df11d`
**Pagos reales: Stripe Checkout con webhook, recibos, cambio de nivel y cancelación (RF-PLU-02/05/07)**

- Suscripciones: purchase() se divide en quote() (precio con prorrateo o
  baja programada) y activate() (idempotente por referencia del proveedor).
- POST /subscriptions/checkout: en local activa al instante (stub); con
  STRIPE_SECRET_KEY crea una sesión de Checkout alojada y devuelve la URL.
  La tarjeta nunca pasa por Yugo.
- POST /subscriptions/webhooks/stripe con firma verificada (HMAC del cuerpo
  crudo, rawBody en Nest) activa el período al confirmarse el pago.
- GET /subscriptions/payments: recibos del miembro. Cancelar queda auditado
  y el estado expone canceledAt y canal.
- Web: «Continuar» en /plus hace algo (antes no tenía acción); /plus/gracias
  espera la confirmación y muestra el recibo; /perfil/suscripcion con nivel,
  hasta cuándo, cambio de nivel, cancelación con aviso claro y recibos.
- Móvil: pantalla «Mi suscripción» equivalente; el paywall explica cuando la
  compra en tienda aún no está activa y ofrece la web.

### 2026-09-08 23:56 · `cc26171`
**Arranque por iglesia, lista de espera por ciudad, embudo con eventos anónimos y accesibilidad**

Densidad (la decisión que más pesa en un piloto pequeño)
- Descubrir dice cuándo la lista sale corta por falta de gente en la ciudad
  (cityCount, lowDensity) y ofrece «Avísame cuando haya más gente»
  (CityWaitlist); un aviso único los lunes cuando la ciudad pasa de 25
  perfiles completos. Web y móvil.
- Portal: página «Arranque» con los cinco pasos para que la congregación
  entre junta (aprobación, lote de códigos, tarjetas impresas, equipo del
  portal, primer evento) marcados con datos reales, y el mensaje listo para
  el grupo de la iglesia. Tarjeta en el inicio del portal mientras haya
  menos de 10 respaldados.

Embudo con eventos anónimos (RF-ADM-12)
- Tabla ProductEvent, POST /analytics/events (público, con límite; hash del
  usuario si hay sesión, propiedades cortas y sin PII), cliente track() en
  app-core con cola y envío en segundo plano, id anónimo por instalación.
- Eventos: welcome_view, register_start/account/covenant/done,
  photo_uploaded, interest_marked, connection_created, event_attendance,
  checkout_started, subscription_activated, city_waitlist_joined.
- Reportes nuevos en el panel: «Activación (eventos anónimos)» y «Eventos
  de producto».

Accesibilidad
- Móvil: la letra sigue el tamaño del sistema con tope de 1.6×; los
  esqueletos respetan «reducir movimiento».
- Web: en el chat, Escape cierra menú y selector de eventos y devuelve el
  foco; el campo conserva el foco tras enviar; el menú anuncia su estado.

### 2026-09-09 00:16 · `7697e71`
**Cierre de la ronda de experiencia: guardar perfil existente, invitación sin puerta, query en el login y docs v0.11.0 (RF-PER-08/10, RF-IGL-02, RF-EVE-06, RNF-05, RNF-09)**

- API: el upsert del perfil omitía el rango de edad obligatorio en la rama
  create cuando el perfil ya existía y Prisma la valida igual, así que cada
  edición posterior devolvía 500. Los valores por defecto viajan siempre;
  prueba unitaria nueva que lo cubre.
- Web: el enlace de invitación al portal queda fuera de la puerta y del menú
  del portal (sin cuenta no se podía ver). Las tres puertas de sesión
  (miembro, portal, panel) conservan la query al mandar a /entrar, de modo
  que ?ci= del QR o ?token= de la invitación sobreviven al login.
- E2E: paywall con el propio nivel seleccionado, tarjeta de check-in y ?ci=,
  y auditorías axe sobre la pantalla asentada (sin transiciones a medias).
- Docs: CHANGELOG v0.11.0, RAILWAY (Stripe, ANALYTICS_SALT, WEB_URL,
  universal links), TESTING (notificaciones en vivo, check-in QR,
  invitaciones, arranque, embudo, suscripciones) y .env.example.

### 2026-09-09 00:36 · `9add9d0`
**Destino por rol al entrar, portal con vuelta a Yugo y páginas públicas sin 401 de fondo (RF-AUT-01, RF-IGL-02, RF-EVE-06, RNF-05)**

- Web: sin ?next=, cada cuenta va a su casa al entrar: staff al panel, quien
  administra una iglesia (o solo edita sus eventos y no tiene perfil) al
  portal, el resto a Inicio. Antes una cuenta sin perfil caía en la zona de
  miembros con errores de «perfil requerido».
- API: GET /auth/me incluye churchMemberships (iglesia y rol) para decidirlo
  en una sola llamada.
- shared: homeRouteFor() y STAFF_ROLES con prueba; la puerta del panel usa
  la misma lista.
- Portal de iglesias: enlace «Volver a Yugo» en el menú, con contraste AA.
- app-core: useSession acepta enabled; la invitación y el evento público no
  piden la sesión cuando no hay una guardada (sin 401 para quien llega sin
  cuenta; en demo sigue activa).
- Docs: CHANGELOG y TESTING (destinos por cuenta y conservación de la query).

### 2026-09-09 04:28 · `cc3b839`
**Perfil con voz propia: tres preguntas en sus palabras y testimonio en audio moderado (RF-PER-09/10/12, RF-ADM-08, RF-SEG-02)**

- API: catálogo de preguntas administrable (SETTING_KEYS.PROFILE_QUESTIONS,
  con validación y vuelta al compilado); modelo VoiceNote con subida firmada
  bajo voice/, confirmación que abre caso de moderación manual, quitar y
  reemplazar cierran el caso anterior; solo lo aprobado sale del perfil
  propio. Descubrir resuelve respuestas contra el catálogo y firma el audio
  aprobado. Cola de retenidos del panel con rama de audio y aprobación que
  recalcula completitud. Completitud reequilibrada: respuestas 5+5, audio 5.
- Web: /perfil/voz (responder, quitar, elegir otra pregunta, grabar con
  MediaRecorder hasta 20 s, escucha previa, publicar, estado), enlace desde
  Completa tu perfil, «En su voz» y «En sus palabras» en la ficha de
  afinidad, reproductor en la cola de moderación, editor del catálogo en
  Configuración.
- Móvil: perfil/voz con expo-av (grabación y reproducción), VoicePlayer,
  respuestas y audio en la tarjeta de Descubrir, acceso desde Perfil.
- Semilla con respuestas para los 40 perfiles; fixtures de Mariel; E2E
  voz-propia y superficie nueva en accesibilidad; pruebas de completitud.
- Migración 0015_voz_propia. Docs: CHANGELOG v0.12.0 y TESTING.

### 2026-09-09 04:38 · `4e9997f`
**Razones de afinidad visibles y comunidad que alimenta Descubrir y los rompehielos (RF-DES-02, RF-CON-04, RF-SEG-07)**

- shared: affinityReasons() devuelve dos o tres razones comprobables en
  orden de lo que más dice de una persona (evento próximo compartido, lo que
  ya hicieron juntos, prácticas, iglesia o denominación, intención,
  cercanía); nunca un porcentaje. La frase única se conserva. CommunitySignals
  en el tipo de tarjeta.
- API: CommunitySignalsService (global) calcula en lote grupo en común,
  peticiones por las que ambos oraron en 30 días, devocional con reflexiones
  aprobadas de ambos y evento pasado compartido (respetando la visibilidad
  de asistencia). Descubrir lo incorpora a las razones y a la tarjeta; los
  rompehielos abren con ello. La distancia exacta solo entra como razón si la
  persona no la oculta.
- Web: lista de razones en la tarjeta y «Por qué esta persona» + «Lo que ya
  comparten en Yugo» en la ficha. Móvil: lista de razones en la tarjeta.
- Fixtures de Mariel, pruebas de reason y de rompehielos, E2E
  razones-afinidad. Docs: CHANGELOG y TESTING.

### 2026-09-09 04:56 · `c120ff9`
**Cierre digno y videollamada dentro de la app (RF-CON-11/12)**

- API: POST /connections/:matchId/close cierra con una plantilla amable o un
  mensaje propio (moderado y sin datos de contacto: containsContactData en
  shared), lo deja como último mensaje, avisa a la otra persona y guarda
  closingMessage en el vínculo. Reporte «Cierres: con mensaje o en silencio».
- API: VideoCall + VideoCallsService con proveedor detrás de abstracción
  (Daily: salas privadas de dos personas que caducan solas y tokens
  nominales; stub sin clave → función no disponible). Listar, proponer,
  entrar en ventana (10 min antes, 15 después del fin), cancelar; avisos.
- Web: paneles de cierre y videollamada en el chat, página de la sala
  embebida, reporte nuevo en el panel. Móvil: hojas de cierre (plantillas o
  texto propio) y videollamada (tres horas propuestas, entrar en el
  navegador integrado con expo-web-browser).
- Migración 0016. Pruebas de ventana de entrada, proveedor Daily y detector
  de datos de contacto; E2E cierre-y-videollamada. Docs: CHANGELOG, TESTING,
  RAILWAY (DAILY_API_KEY) y .env.example.

### 2026-09-09 05:27 · `d8cea63`
**feat: presentación por padrino, segunda mirada y plan de domingo (RF-ACO-05, RF-DES-13, RF-NOT-04)**

Presentación por padrino con doble consentimiento
- Modelo Introduction (migración 0017) y IntroductionsService: un padrino
  activo presenta a dos personas por correo o teléfono con una nota
  moderada; 14 días de vigencia.
- Nadie ve a la otra persona antes del sí: quien recibe ve al padrino, la
  nota y la iglesia/ciudad del otro. Un «no» cierra y al padrino solo se le
  dice «no se concretó». Dos «sí» crean el mismo vínculo y conversación que
  un interés mutuo y avisan a los tres.
- Misma respuesta para «no existe» e «inactivo»; no se presenta a personas
  bloqueadas, ya conectadas, del mismo género ni a uno mismo.
- Rutas bajo /acompanamiento/presentaciones; cliente tipado, hooks, tarjeta
  en Conexiones y formulario en Acompañar (web y móvil); enrutado de la
  notificación.

Segunda mirada
- Cuando un paso vence y la persona sigue activa, Descubrir la trae con la
  etiqueta «Segunda mirada» y lo que cambió (fotos aprobadas, audio de
  testimonio, perfil actualizado). Web y móvil; ficha demo de Daniela.

Plan de domingo
- WeekendPlanService: sábados 10:00 (Santo Domingo) aviso y correo con el
  evento del fin de semana, el devocional de mañana y la conexión que más
  días lleva callada. Sin racha ni reproche; nada si no hay nada. Respeta el
  apagado del resumen semanal.

Pruebas: introductions.spec (6), weekend-plan.spec (4), E2E
presentaciones y segunda-mirada; jest API 197, móvil 39; subconjunto E2E
34 en verde. Fichas demo de presentaciones renombradas para no chocar con
las de acompañamiento. Documentado en CHANGELOG y TESTING.

### 2026-09-09 05:43 · `af67d14`
**feat: ruta de pareja después del sí (RF-REL-05)**

- Su ruta: desde el noviazgo, la conversación muestra los pasos que una
  pareja cristiana suele dar antes de casarse, por etapa (noviazgo,
  compromiso, casados). Cada paso se marca con fecha y se ve quién lo
  marcó; sin porcentaje ni reclamo. Antes del noviazgo la tarjeta dice
  cuándo se abre. Modelo CoupleMilestone, migración 0018_ruta_de_pareja.
- Para prepararse: catálogo de recursos prematrimoniales en @yugo/shared,
  en dos bloques (para toda pareja y de la tradición de alguno de los
  dos), ordenados por tipo y nunca por denominación; sin enlaces a tiendas.
- Consejería con la iglesia: uno la pide a una de las iglesias de los dos,
  la otra persona confirma, y solo entonces el portal la ve (nombres,
  correos y nota; PENDING_PARTNER no aparece por consulta). La iglesia
  acepta o no con un mensaje que les llega a los dos. Página «Consejería»
  en el portal y aviso a sus usuarios.
- Rutas /connections/:matchId/journey y /church-portal/counseling; cliente
  tipado, hooks (web y móvil comparten), tarjeta en la conversación web y
  móvil, enrutado de la notificación.

Pruebas: journey.test (7, catálogo), journey.spec (7, servicio), E2E
ruta-de-pareja (ruta y portal). Jest API 204, móvil 39; subconjunto E2E
106 en verde. Comprobado en vivo contra la API local: el portal no lista
la petición hasta que confirma la otra persona. Documentado en CHANGELOG
y TESTING.

### 2026-09-09 09:55 · `63193fb`
**feat: robustez (Sentry, cola sin conexión, E2E en vivo, copias) e inglés para la diáspora (RNF-06/07/08/09)**

Robustez
- Sentry opcional en API (SENTRY_DSN: solo 5xx con requestId/ruta, sin
  cuerpos ni cabeceras), web (SENTRY_DSN_WEB leída en tiempo de ejecución,
  SDK cargado solo con DSN, sin datos de la persona) y app
  (EXPO_PUBLIC_SENTRY_DSN; exige build nativo). Página de último recurso
  en la web. Sin variables no se envía nada.
- Cola de mensajes sin señal en la app: lo escrito sin red se guarda en el
  teléfono, se ve como «Pendiente de enviar» y sale en orden al volver la
  conexión; un rechazo del servidor se descarta con aviso y no se reintenta.
- E2E contra la API real: `pnpm e2e:live` (web sin demo + API viva + cuenta
  real) y trabajo `e2e-live` en CI con PostGIS, migraciones y semilla.
  Etiquetas accesibles en el formulario de entrar.
- Copias y restauración: `pnpm db:backup` (pg_dump verificado) y
  `pnpm db:restore` (rechaza producción sin confirmación, recrea esquema,
  aplica migraciones, cuenta usuarios). Ensayo real contra una base
  temporal; guía en RAILWAY.md.

Inglés para la diáspora
- Diccionario en-US completo tipado contra es-DO; `es` pasa a ser un proxy
  con el tipo del español que resuelve cada lectura contra el idioma activo,
  así 130 pantallas cambian sin tocarlas. Las tablas que se leían al cargar
  el módulo (menús, etiquetas de estado) pasan a lectura perezosa.
- Selector en Bienvenida y Perfil (web), fila «Idioma» en Perfil (app);
  memoria en navegador/teléfono, idioma del sistema por defecto para la
  diáspora, y preferencia guardada en la cuenta (PUT /profiles/me/locale,
  migración 0019_idioma). Web: el servidor pinta español y se remonta solo
  si cambia, sin desajuste de hidratación.
- Titular de bienvenida y pestañas de la app dejan de estar escritos a mano.

También: la ficha demo del evento compartido usa una fecha próxima (la fija
ya había pasado y la razón «los dos van a» desaparecía).

Pruebas: shared 143 (incluye cobertura de claves en inglés y el proxy),
API 204, móvil 45 (cola sin conexión), E2E completa 341 en verde, E2E en
vivo 4/4, smoke móvil en Chromium 45 pasos, bundle Android con Sentry,
ensayo de copia y restauración con 43 usuarios y 18 migraciones.

### 2026-09-09 10:17 · `f665f68`
**feat: fechas en el idioma elegido, idioma de la cuenta al entrar y CI en la rama por defecto (RNF-06)**

- intlLocale() en @yugo/shared: toda la web y la app formatean fechas y
  números con el idioma activo (54 archivos dejan el 'es-DO' fijo; el
  servidor lo conserva porque allí no hay persona activa).
- El idioma guardado en la cuenta se aplica al cargar la sesión solo si en
  ese navegador o teléfono no se eligió ninguno (onAccountLocale en el
  runtime compartido; web y móvil deciden con su propio almacenamiento).
- En la app, cambiar de idioma vuelve a Perfil tras remontar la navegación.
- CI corre también en la rama por defecto del repositorio y a mano; antes
  solo en `main`, que no existe, así que ningún push pasaba por lint,
  pruebas ni E2E.

Pruebas: shared 143, móvil 45, lint limpio, E2E completa 341 en verde.

### 2026-09-09 10:34 · `3b0281f`
**ci: la versión de pnpm sale solo de packageManager**

pnpm/action-setup@v4 se detiene cuando recibe `version: 10` y el package.json
declara `packageManager: pnpm@10.33.0` a la vez («Multiple versions of pnpm
specified»). Fue lo primero que dijo la CI al correr por fin en la rama por
defecto. Se quita la versión de los tres flujos; manda el package.json.

### 2026-09-09 11:45 · `597851c`
**ci: tipos de Node en la app y paquetes construidos antes de sembrar**

Segundo hallazgo de la CI recién activada:
- El typecheck de la app fallaba en una instalación limpia («Cannot find
  name 'process'»): @types/node llegaba por hoisting local y no por
  dependencia. Ahora es devDependency de @yugo/mobile.
- El trabajo `migrations` sembraba antes de construir @yugo/shared, y la
  semilla lo importa desde su dist. Se construye antes.

### 2026-09-09 12:20 · `da4cd7c`
**feat: web más viva, avisos y correos en el idioma de la cuenta, Rekognition y carga desde CI (RNF-05, RNF-06, RF-VER-01, RNF-02)**

Web más viva (RNF-05):
- Tarjetas, botones, chips accionables, campos, filas de lista, enlaces y
  menú lateral responden al mouse (elevación, sombra, borde, foto que se
  acerca, flecha que sigue). Cada pantalla entra con un fundido y las
  tarjetas suben en escalera. Solo con `hover: hover`; «reducir
  movimiento» sigue apagándolo todo. E2E completa: 341 en verde.

Servidor en el idioma de la cuenta (RNF-06):
- Catálogo `server-messages` (es-DO/en-US tipado contra el español) y
  `NotificationsService.send(userId, categoría, clave, params)` que
  resuelve por `User.locale`; ~60 avisos migrados en 20 servicios.
- Diez plantillas de correo con versión en inglés; bienvenida, recibo,
  resumen semanal, plan de domingo, invitación al portal y aviso leen el
  idioma de quien recibe. El recordatorio de propósito se deduplica por
  `data.nudge` y no por el título.
- `notificationsMock()` para las pruebas; 11 pruebas nuevas del catálogo
  y del correo en inglés. Probado en vivo: una cuenta en-US recibe
  «Someone showed interest in you».

Verificación de identidad (RF-VER-01):
- `FaceComparator` con stub, servicio externo y Amazon Rekognition
  (`FACE_MATCH_PROVIDER=rekognition`, lee selfie y foto del bucket S3);
  `shouldAutoApprove` exige vida y similitud ≥ umbral (0.93 por defecto,
  `FACE_MATCH_AUTO_APPROVE`); cualquier fallo va a revisión humana. 20
  pruebas. No probado contra AWS real.

Carga (RNF-02):
- Workflow «Carga (k6)» solo a mano: base_url, guion y modo humo; login
  con secretos enmascarados, resumen p95 por endpoint y artefacto.
  `SMOKE=1` en los guiones (10 s, 5 VUs, mismos umbrales); corrido en
  local con 100 % de checks.

CI:
- `migrations` genera el cliente de Prisma antes de sembrar.
- La prueba de montaje de pantallas móviles tiene 30 s por ruta: la
  primera carga en frío pasaba de 5 s en el runner y arrastraba a la
  siguiente.

### 2026-09-09 12:38 · `1250c0a`
**ci: la web se construye tras los paquetes compartidos y el E2E en vivo sabe dónde está la API**

Tercer hallazgo del CI en la rama por defecto:
- El trabajo `e2e` construía la web sin compilar antes @yugo/ui-tokens,
  @yugo/shared y @yugo/app-core («Can't resolve '@yugo/shared'»). Ahora
  los construye igual que `e2e-live`.
- La prueba de `/estado` rechazaba `localhost:4000` como señal de «URL de
  desarrollo por defecto», pero en CI la API vive justo ahí. Con
  `LIVE_API_URL` la prueba exige el host indicado; sin él, conserva el
  rechazo anterior. El flujo lo declara.
- En escritorio, el mensaje enviado aparece en la burbuja y en la vista
  previa de la lista: el localizador toma el primero en vez de fallar por
  modo estricto.

E2E en vivo local: 4 en verde.

### 2026-09-09 14:50 · `30c78b6`
**chore: dependencias para el mapa de eventos (Leaflet) y la entrada con QR en la app**

Base de la siguiente ronda: leaflet en la web para un mapa real de
encuentros (RF-EVE) y qrcode en la app para dibujar la entrada del miembro
con react-native-svg. Sin cambios de comportamiento todavía.

### 2026-09-09 15:12 · `4ea2414`
**feat(api): entrada con código para eventos, restauración de cuenta y hooks para privacidad, líder, grupos y asistencia (RF-EVE-05, RF-SEG-06/08, RF-VER-03, RF-COM-02)**

Base para cerrar las brechas de web y app:
- Entrada del miembro: `EventAttendance.ticketCode` (migración
  0020_entrada_con_codigo), `GET /events/:id/ticket` (solo con «Asistiré»,
  código de 10 caracteres sin ambigüedad) y
  `POST /church-portal/events/:id/check-in-ticket` (idempotente; única
  excepción documentada al «totales, nunca nombres» del portal: la persona
  presenta su propia entrada en la puerta). El check-in por QR del portal
  sigue igual.
- Cuenta: `POST /auth/account/restore` cancela la eliminación dentro del
  plazo de gracia, con auditoría; `me` expone `deletionRequestedAt`.
- Verificación: `GET /verification/status` devuelve la solicitud al líder
  pendiente. Comunidad: «Mis grupos» incluye los propios en revisión, con
  `status`. Eventos: `attendance` acepta `WAITLIST`.
- Cliente y hooks: usePrivacyPreferences/useSetPrivacyPreferences,
  useAccountStatus/useDeleteAccount/useRestoreAccount,
  useRequestLeaderEndorsement, useResolveJoinRequest, useCreateGroup,
  useEventTicket, useCheckInTicket (portal), asistencia con null para
  quitar; `calendarDataUrl()` para «Añadir al calendario» en demo. Todos
  con rama de demostración persistida.
- Diccionarios es-DO/en-US: claves de privacidad, verificación, comunidad,
  eventos (entrada, filtros, mapa) y conexiones.

Pruebas: API 251 (16 nuevas), shared 145 (2 nuevas); humo con curl del
flujo completo de entrada contra la API local.

### 2026-09-09 15:35 · `f1e2170`
**feat(mobile): cerrar las brechas de la app frente a la web (RF-SEG-06/08, RF-VER-03, RF-COM-02, RF-EVE-04/05, RF-CON-12, RF-PLU-03, RNF-05)**

Lo que parecía funcionar y no lo hacía:
- Privacidad persistida en el servidor (ocultar distancia y asistencia),
  eliminar cuenta real con plazo de gracia y cancelación, exportación
  compartible.
- Solicitud al líder enviada de verdad; selfie con captura real
  (expo-camera, cámara frontal, subida al almacenamiento firmado);
  simulada solo en demo/web.
- Solicitudes de grupo: aceptar y rechazar; reacciones sin doble conteo;
  proponer grupo con estado «en revisión».
- Asistencia a eventos leída del servidor (Asistiré, Me interesa, Ya no
  iré) en lista, detalle e Inicio; Descubrir sin depender del almacén demo.

Lo que faltaba frente a la web:
- Cerrar sesión (con confirmación en pantalla) y paywall consciente del
  nivel actual, gestión de suscripción y bajada programada.
- Detalle de afinidad completo: razones, señales de comunidad, voz,
  respuestas y testimonio, sin porcentajes.
- Chat con auto-scroll y pantalla propia de videollamada.
- Tarjeta de error con reintento en las cinco pestañas; estado vacío en
  Conexiones; portadas de evento por tipo; selector de hora para horas
  silenciosas; fecha del plan de encuentro por día y hora con error
  visible; textos de «Te interesa» desde el diccionario.

Placeholders:
- Entrada del miembro con QR real (qrcode + react-native-svg) y «Cómo
  llegar» que abre el mapa del teléfono.
- Hoja de confirmación propia en vez de Alert.alert para decisiones
  destructivas.

Pruebas: móvil 59 (4 suites; montaje de 36 rutas), smoke RN-Web 47 pasos
sin errores, typecheck limpio.

### 2026-09-09 21:09 · `d0f08bb`
**feat(web): cerrar las brechas de la web frente a la app y sustituir los placeholders (RF-SEG-06/08, RF-VER-03, RF-COM-02, RF-EVE-04/05/06, RNF-05, RNF-07)**

Lo que parecía funcionar y no lo hacía:
- Privacidad leída y guardada en el servidor; «Descargar mis datos» entrega
  el JSON real; eliminar cuenta con panel de confirmación, fecha de borrado
  y cancelación dentro del plazo de gracia.
- Solicitud al líder enviada de verdad y visible como pendiente; selfie con
  captura real desde la cámara del navegador (subida firmada), con caída al
  recorrido guiado cuando no hay cámara.
- Solicitudes de grupo aceptar/rechazar, reacciones contra la API, proponer
  grupo con «En revisión», filtros de eventos con estado vacío, chips de
  Descubrir con las preferencias reales, calendario nunca inerte, Guardados
  desde la API, confirmación visible del cierre digno.

Lo que faltaba frente a la app:
- Cola sin conexión para mensajes con burbuja «pendiente» y aviso «Sin
  conexión»; estados vacíos en Conexiones y Eventos; cámara o galería al
  subir foto; accesos directos en Perfil (voz, suscripción con nivel,
  no leídas).

Placeholders:
- Mapa real de encuentros con Leaflet y OpenStreetMap (pin por evento, «Cómo
  llegar»); entrada del miembro con QR y código (`/eventos/:id/entrada`) y
  «Registrar entradas» en el portal de iglesias (escribir o escanear,
  idempotente, con contador); ConfirmPanel en vez de window.confirm.

Pruebas: web E2E 393 en demo (22 casos nuevos en cuatro archivos, axe en
verde en las superficies nuevas) y 4 en vivo contra la API local; tsc y
lint limpios en web, API y app. CHANGELOG v0.13.0 y recorridos en TESTING.

