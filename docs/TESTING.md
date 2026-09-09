# Cómo probar Yugo manualmente

## Preparación

```bash
pnpm install
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d
pnpm --filter @yugo/api db:deploy      # aplica prisma/migrations (incluye PostGIS)
pnpm --filter @yugo/api db:seed        # catálogos, 3 iglesias, 40 perfiles, 10 eventos
pnpm --filter @yugo/api dev            # API http://localhost:4000/v1
pnpm --filter @yugo/web dev            # Web http://localhost:3000
```

Credenciales sembradas: `admin@yugo.do` / `Yugo.demo1` (superadmin con 2FA por OTP en
consola de la API) y `demo1@yugo.do` … `demo40@yugo.do` / `Yugo.demo1` (miembros).

> **Modo demo**: con `NEXT_PUBLIC_DEMO_MODE=true` en la web y `EXPO_PUBLIC_DEMO_MODE=true`
> en móvil (ambos por defecto) toda la interfaz funciona sin API usando los fixtures de
> `@yugo/shared` — ideal para revisar la UI de los mockups. Poniendo esas variables en
> `false` las mismas pantallas hablan con la API real a través del cliente tipado
> compartido; no hay un segundo camino de código. Las verificaciones de API de abajo
> usan `curl`.

```bash
# La app móvil contra la API local
EXPO_PUBLIC_DEMO_MODE=false EXPO_PUBLIC_API_URL=http://localhost:4000 \
  pnpm --filter @yugo/mobile dev
```

## Cuentas y datos de prueba

La semilla (`pnpm --filter @yugo/api db:seed`) deja tres tipos de cuenta:

- **`prueba@yugo.do` / `Yugo.prueba1`**: la cuenta para validar. Viene con
  un mundo alrededor (conexiones en tres etapas, propuesta de noviazgo
  pendiente, mensajes sin leer, intereses recibidos, evento con una conexión,
  devocional con constancia, petición de oración acompañada, notificaciones).
  Se define en `prisma/seed-tester.ts` y es idempotente: volver a sembrar no
  duplica nada. Para añadir más situaciones de prueba, ese es el archivo.
- **`demo1@yugo.do` … `demo40@yugo.do` / `Yugo.demo1`**: perfiles ficticios.
  `demo3` y `demo5` son las conexiones de la cuenta de prueba: entrando con
  ellas se ve el otro lado de la conversación.
- **`admin@yugo.do` / `Yugo.demo1`**: exige 2FA. En local, el código sale en
  la consola de la API (`OTP for admin@yugo.do (LOGIN): 123456`).
- **`iglesia@yugo.do` / `Yugo.iglesia1`**: administrador del portal de
  iglesias (`/iglesias`) de la primera iglesia aprobada. Llega con 12 códigos
  de respaldo (5 ya usados), dos solicitudes de líder pendientes y un evento
  esperando revisión en `/admin/eventos`.

Contra la API real, la web se prueba de punta a punta con
`NEXT_PUBLIC_DEMO_MODE=false` (ver «Auditoría contra la API real» en el
changelog 0.7.0): es la única forma de ver lo que las fixtures tapan.

## Pruebas automatizadas

```bash
pnpm test        # 51 specs API (Jest) + 26 specs shared (Vitest)
pnpm typecheck   # api, web, mobile, packages
pnpm lint        # 0 errores / 0 warnings
pnpm build       # dist api + .next + packages

# Humo contra la API viva (requiere base sembrada y la API escuchando)
pnpm --filter @yugo/api build && node apps/api/dist/main.js &
pnpm --filter @yugo/api test:smoke   # 34 comprobaciones por HTTP y socket

# E2E web/admin/portal — 136 pruebas en móvil y escritorio
# (incluye 42 de accesibilidad: axe contra WCAG 2.1 AA en 21 superficies)
pnpm --filter @yugo/web build
pnpm --filter @yugo/web e2e
# contra un despliegue: PLAYWRIGHT_BASE_URL=https://staging.yugo.do pnpm --filter @yugo/web e2e

# E2E móvil (requiere Maestro y un emulador/dispositivo) — 3 flujos:
# registro con pacto, descubrir → chat moderado, perfil → verificación
maestro test apps/mobile/.maestro

# Carga (requiere k6 y un token válido)
k6 run -e BASE_URL=http://localhost:4000/v1 -e TOKEN=<jwt> infra/k6/discover.js
k6 run -e BASE_URL=http://localhost:4000/v1 -e TOKEN=<jwt> -e CONVERSATION_ID=<id> infra/k6/chat.js
```

## Recorridos por hito

### Registro y mayoría de edad (RF-AUT-01/03/04)
1. `POST /v1/auth/register` con `birthDate` de un menor → **403 must_be_adult** y fila en
   `AuditLog` con acción `REGISTER_UNDERAGE_BLOCKED`.
2. Registro válido → el código OTP aparece en el log de la API (`OTP for …`).
3. `POST /v1/auth/otp/verify` → tokens; `POST /v1/auth/covenant/accept` con `version: "1.0"`.
4. En la web: `/registro` — el paso 3 es el Pacto (toggle obligatorio); una fecha < 18 años
   bloquea el paso 2 con el mensaje del mockup.

### Perfil y completeness (RF-PER-08/10)
1. `PUT /v1/profiles/me/preferences` con `{ageMin: 25, ageMax: 26}` → **400 age_range_too_narrow**
   (amplitud mínima 3). Con `ageMin: 17` → **400** (nunca menores).
2. Completa testimonio/versículo/prácticas y observa `completeness` subir en `GET /v1/profiles/me`.

### Descubrir y regla mutua de edad (RF-DES-01/05/11/12)
1. Con `demo1@yugo.do`: `GET /v1/discover` → lista ≤ 30 ordenada por afinidad con desglose.
2. Cambia tu rango a uno que excluya la edad de un perfil sugerido → desaparece de la lista
   (la regla se evalúa en SQL en ambas direcciones; ningún nivel la desactiva).
3. Marca 8 intereses (`POST /v1/interests`) → el 9º devuelve **403 daily_interests_used**;
   el contador reinicia a las 00:00 de Santo Domingo.
4. Activa modo invisible en un usuario Oro → deja de aparecer en Descubrir de otros salvo
   que él haya marcado interés antes.
5. En la web demo: `/descubrir` — Pasar oculta la tarjeta, "Me interesa" cambia a
   "Interés enviado ✓" y al agotar el límite navega al paywall.

### Conexión y chat moderado (RF-CON-01/04/06, 7.3)
1. Interés mutuo entre `demo1` y `demo2` → se crea Match + Conversation y notificación.
2. `GET /v1/connections/conversations/:id/icebreakers` → 3 preguntas del perfil del otro.
3. Envía "Necesito que me deposites dinero" → mensaje **REJECTED** con aviso educativo
   (stub de clasificación sin API key; con `ANTHROPIC_API_KEY` clasifica Claude).
   "Hablemos por WhatsApp" → **HELD** (en revisión) y caso en la cola admin.
4. En la web demo: escribe esas mismas frases en `/conexiones/m-mariel` y observa los
   estados visuales de retenido/rechazado.

### Eventos (RF-EVE-03/04/06)
1. `GET /v1/events` → agenda con distancia y conexiones que asisten.
2. `POST /v1/events/:id/attendance` `{status: "GOING"}`; con aforo lleno responde
   **400 event_full** salvo cuenta Oro.
3. `POST /v1/events/check-in` con el `qrToken` del evento sembrado → check-in registrado.

### Portal de iglesias (RF-IGL-03/05)
1. Entra como `iglesia@yugo.do` y usa
   `POST /v1/church-portal/events` con `submit: true` → estado `IN_REVIEW`.
2. `POST /v1/church-portal/codes/generate` `{count: 25}` → códigos de un solo uso (30 días).
3. Como miembro: `POST /v1/verification/church-code` con un código → insignia nivel 3;
   reutilizarlo → **400 code_already_used**.
4. `GET /v1/church-portal/metrics` → totales y `weeklyReach` (8 semanas); nunca nombres.
   `POST /v1/church-portal/users/invite` `{email, role}` solo para ADMIN; un correo
   que no existe en Yugo → **404 user_not_found**.
5. Web: `/iglesias/eventos/nuevo` (vista previa en vivo), `/iglesias/codigos`
   (generar, copiar, confirmar solicitudes), `/iglesias/metricas`, `/iglesias/grupo`
   y `/iglesias/usuarios` (invitar y retirar acceso).

### Panel admin (RF-ADM-03/04/08)
1. Entra como `admin@yugo.do` (el OTP del 2FA sale en el log de la API).
2. `GET /v1/admin/dashboard`, `GET /v1/admin/moderation/queue`, `POST /v1/admin/moderation/take-next`.
3. `PUT /v1/admin/settings/affinity-weights` con pesos que no suman 100 → **400 weights_must_sum_100**.
4. Web: `/admin` (tablero), `/admin/moderacion`, `/admin/verificaciones` (lado a lado),
   `/admin/configuracion` (mueve un slider: la suma se valida en vivo).
5. Todas las páginas del panel leen la API: `/admin/miembros` (buscar, ficha,
   advertir/suspender/reinstalar), `/admin/eventos` (aprobar o devolver el evento
   de `iglesia@yugo.do`, destacar), `/admin/grupos`, `/admin/organizaciones`,
   `/admin/suscripciones` (reembolso 1 de 2 / 2 de 2), `/admin/auditoria` (equipo
   real y bitácora filtrable) y `/admin/reportes` (crecimiento semanal real).

### Notificaciones en vivo, resumen semanal y aviso a quien reporta
1. Con dos sesiones abiertas (por ejemplo `prueba@yugo.do` en la web y `demo3@yugo.do`
   en otra ventana), manda un mensaje: el globo de Notificaciones del riel sube sin
   recargar (socket `notification:new`).
2. Perfil › Notificaciones › Preferencias: el interruptor «Resumen semanal por correo»
   guarda en `PUT /v1/notifications/digest`. Para forzar un envío en local:
   `DigestService.run()` desde una consola de Nest o esperar al lunes 9:00.
3. Como admin, decide un reporte en `/admin/moderacion`: quien lo envió recibe
   «Revisamos tu reporte» sin conocer la sanción.

### Check-in con QR (RF-EVE-06)
1. Como `iglesia@yugo.do`, en `/iglesias/eventos` → «QR de entrada» de un evento
   publicado: se imprime un QR real con la URL `…/e/<id>?ci=<token>`.
2. Como miembro con sesión en la web, abre esa URL: «¡Asistencia registrada!».
   En la app: Eventos › detalle › «Registrar mi asistencia» abre la cámara.
3. `GET /v1/church-portal/metrics` sube «Check-ins con QR».

### Invitaciones al portal y lote impreso (RF-IGL-02/05)
1. `/iglesias/usuarios` → invitar un correo sin cuenta: llega un enlace
   (`/iglesias/invitacion?token=…`, 7 días) y aparece en «Invitaciones pendientes».
2. Abrir el enlace sin sesión → «Crear mi cuenta» lleva al registro con el token; al
   terminar, la cuenta ya es usuaria del portal. Con sesión y el mismo correo, acepta
   al instante; con otro correo, lo dice.
3. `/iglesias/codigos/imprimir` → «Imprimir o guardar en PDF» produce las tarjetas.

### Arranque por iglesia y lista de espera por ciudad
1. `/iglesias/arranque` marca los cinco pasos con datos reales de la iglesia.
2. Con un perfil en una ciudad con menos de 8 perfiles completos, Descubrir explica la
   densidad y ofrece «Avísame cuando haya más gente» (`POST /v1/discover/city-waitlist`).

### Embudo con eventos anónimos (RF-ADM-12)
1. Navega bienvenida → registro: `POST /v1/analytics/events` recibe `welcome_view`,
   `register_start`, `register_account`, `register_done` con un `anonymousId` sin PII.
2. `/admin/reportes` → «Activación (eventos anónimos)» y «Eventos de producto».

### Suscripciones (RF-PLU-02/05/07/08)
1. Web `/plus` → «Continuar»: con `PAYMENT_PROVIDER=stub` activa al instante y lleva a
   `/plus/gracias` con el recibo; con Stripe redirige al Checkout y el webhook activa.
   `/perfil/suscripcion` muestra nivel, recibos y «Cancelar suscripción» (acceso hasta
   el fin del período). Para probar el webhook en local: `stripe listen --forward-to
   localhost:4000/v1/subscriptions/webhooks/stripe`.
2. API directa:
   - `POST /v1/subscriptions/purchase` (`PAYMENT_PROVIDER=stub`) → Plus u Oro activos.
   - Compra Plus y luego Oro → el monto se prorratea; compra Oro y baja a Plus → queda
   programado para fin de período (`downgradeToTier`).
   - `PUT /v1/subscriptions/invisible-mode` sin Oro → **403 oro_required** (RF-PLU-09).

## App móvil

```bash
pnpm --filter @yugo/mobile start   # abre en Expo Go
```

Recorrido: Bienvenida → Registro (8 pasos, pacto en el 3) → tabs Inicio/Descubrir/
Conexiones/Comunidad/Eventos → Perfil → Paywall → Visibilidad. Funciona con datos demo.

### La app real en un navegador real

```bash
pnpm --filter @yugo/mobile test        # Jest: cada pantalla se monta, módulos nativos simulados
pnpm --filter @yugo/mobile test:web    # Chromium: el bundle de Metro, sin simulaciones
```

`test:web` exporta la app con Metro para web (React Native Web), la sirve, la
abre en Chromium con viewport de teléfono y recorre las 32 rutas más un flujo
con toques: entrar, leer el devocional, Descubrir, guardar, afinidad, marcar
interés, Conexiones, abrir un chat, enviar un mensaje y las cinco pestañas.
Falla si alguna ruta lanza un error de JavaScript, escribe `console.error` o
queda en blanco. Deja una captura y el texto de cada paso en
`apps/mobile/.web-smoke/`.

Necesita el Chromium de Playwright (`pnpm --filter @yugo/web exec playwright
install chromium`); si está en otra ruta, `YUGO_CHROMIUM=/ruta/al/binario`.

Lo que no cubre ninguna de las dos: la capa nativa —permisos, cámara,
SecureStore, Hermes en ARM—. Eso solo lo prueba el APK instalado en un
dispositivo, con los flujos de Maestro.

### Privacidad y cumplimiento (RF-SEG-06/07/08, Hito 14)
1. `GET /v1/privacy/export` devuelve la copia completa de datos personales del titular
   (perfil, fotos, intereses, conversaciones aprobadas, pagos, sanciones) citando la Ley 172-13.
2. `PUT /v1/privacy/preferences` `{hideExactDistance: true}` → en Descubrir la otra persona
   pasa a ver un rango (`5–10 km`) en lugar del número exacto.
3. Publica una versión nueva del pacto (`POST /v1/privacy/legal`) y llama a cualquier ruta de
   miembro → **403 covenant_acceptance_required** hasta volver a aceptarlo.
4. Repite `POST /v1/auth/register` 6 veces en una hora → **429 rate_limited**.
5. Web: `/perfil/privacidad` (descarga de datos, eliminación, consejos de seguridad) y
   `/legal/privacidad`, `/legal/terminos`, `/legal/pacto` sin sesión.

### Inicio de sesión social (RF-AUT-02)
`POST /v1/auth/oauth` con `{provider: "google", idToken: "<token>"}`. Sin `GOOGLE_CLIENT_ID`
configurado responde **400 google_client_id_not_configured**; con un token inválido,
**400 invalid_token_signature**. Para una cuenta nueva devuelve `{needsProfile: true}` hasta
que se envían `birthDate` (mayor de edad) y `gender`.

### Observabilidad (RNF-08)
```bash
curl http://localhost:4000/v1/health          # base de datos, caché, uptime
curl -H "Authorization: Bearer <admin>" \
     http://localhost:4000/v1/health/metrics  # colas, backlog de moderación, SLA vencidos
```
Los logs de la API salen como una línea JSON por petición con `requestId` y `durationMs`.

## Correo y almacenamiento locales

- Mailpit: `http://localhost:8025` (correos transaccionales).
- MinIO: `http://localhost:9001` (`yugo` / `yugo-secret`), bucket `yugo-media`.

### Horario silencioso (RF-NOT-02)
1. `GET /v1/notifications/quiet-hours` → la ventana por defecto `22:00 – 07:00`.
2. `PUT /v1/notifications/quiet-hours` con `{ "enabled": true, "startHour": 22, "endHour": 7 }`.
3. Provoca una notificación dentro de la ventana (por ejemplo un mensaje entrante a las
   11 p. m. hora de Santo Domingo): la fila aparece de inmediato en `GET /v1/notifications`,
   pero el push **no** sale — el trabajo queda en la cola con retraso hasta las 7 a. m.
   Con `REDIS_URL` sin definir las colas corren en línea y el retraso se ignora, que es lo
   esperado en desarrollo.
4. En la app: Perfil → Notificaciones → Preferencias muestra la ventana y permite
   silenciar cada categoría por separado.
