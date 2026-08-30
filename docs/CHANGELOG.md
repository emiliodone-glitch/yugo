# Changelog de Yugo

Registro por hito. Cada entrada indica los RF cubiertos y cómo verificarla
(ver `docs/TESTING.md` para el paso a paso).

## v0.1.0 — MVP inicial (2026-08-30)

### Hito 1 — Cimientos del monorepo
- Monorepo pnpm + Turborepo: `apps/api`, `apps/web`, `apps/mobile`, `packages/shared`, `packages/ui-tokens`.
- `infra/docker-compose.yml`: PostgreSQL 16 + PostGIS, Redis, MinIO, Mailpit.
- Tokens de diseño (`@yugo/ui-tokens`): paleta índigo/olivo/trigo/lino/vino, Fraunces + DM Sans.
- Dominio compartido (`@yugo/shared`): tipos, validadores zod, constantes de límites,
  motor de afinidad puro con 16 pruebas, catálogos, i18n es-DO centralizado y fixtures demo.
- CI de GitHub Actions (lint + typecheck + test + build), ESLint + Prettier + Husky.

### Hito 1b — Datos
- Esquema Prisma completo (sección 9): 40+ modelos, enums de dominio, `AuditLog` append-only.
- Migración inicial `0001_init` con `CREATE EXTENSION postgis`.
- Semillas: 10 denominaciones dominicanas + matriz de afinidad simétrica, 12 áreas de
  servicio, 8 categorías de grupos, pacto de conducta v1.0, ajustes por defecto,
  3 iglesias, 40 perfiles ficticios, 4 grupos, 10 eventos, 25 códigos de respaldo.
  Credenciales demo: `admin@yugo.do` / `Yugo.demo1`, `demo1..demo40@yugo.do` / `Yugo.demo1`.

### Hito 2 — Autenticación y pacto (RF-AUT-01..08, RF-SEG-01)
- Registro con correo/teléfono + OTP (proveedor `console` en dev), rate limit de OTP.
- Validación de mayoría de edad EN BACKEND; el intento de menor queda en `AuditLog`
  (`REGISTER_UNDERAGE_BLOCKED`) y se bloquea. Nunca se relaja.
- Aceptación versionada del pacto; tokens acceso/refresco con rotación y revocación
  global; recuperación de contraseña; 2FA por OTP obligatoria para roles admin;
  pausar cuenta y eliminación con gracia de 14 días (reingresar cancela).

### Hito 3 — Perfil (RF-PER-01..11)
- CRUD de perfil con dimensión de fe, prácticas (N:M), preguntas de conversación.
- `completeness` calculado con reglas ponderadas (spec con 5 casos); < 60 % no aparece en Descubrir.
- Fotos: URL firmada (S3/MinIO), 2–6, moderación de imagen previa (stub en dev).
- Preferencias de búsqueda con rango de edad obligatorio (amplitud ≥ 3, mínimo 18).

### Hito 4 — Verificación (RF-VER-01..05)
- Selfie con gestos aleatorios, comparación automática (adaptador con stub), autoaprobación
  en casos claros y cola de revisión con prioridad Oro (<4 h).
- Códigos de iglesia de un solo uso con vencimiento a 30 días; solicitud de respaldo a líder;
  revocación con motivo y notificación.

### Hito 5 — Descubrir y afinidad (RF-DES-01..15)
- `AffinityService` con pesos leídos de `Setting`, matriz de denominaciones, Jaccard de
  prácticas, decaimiento por distancia y edad. Notas explicativas en español.
- **RF-DES-11**: filtro mutuo de edad en la consulta SQL (ambas direcciones), sin excepción por nivel.
- **RF-DES-12**: modo invisible excluido del query salvo interés previo hacia el consultante.
- Lista diaria (30/60) cacheada en Redis hasta la medianoche de Santo Domingo, con hash de
  preferencias (cambiar el rango regenera la lista).
- Intereses con límite diario en Redis (8 gratis, reset 00:00 AST), Pasar (30 días), Guardar,
  Deshacer (Oro, 5/día), "Te interesa a…" (cantidad gratis / perfiles Plus),
  quién vio mi perfil (Oro, 30 días), modo viaje, orden con bono +5 nivel 3, boost Oro y destacado.

### Hito 6 — Conexiones y chat (RF-CON-01..10)
- Match automático en interés mutuo + conversación; Socket.IO con salas por conversación,
  entregado/leído/escribiendo.
- Moderación previa de cada mensaje con Anthropic (stub determinista sin API key);
  umbrales de `Setting`; retenidos a cola humana; rechazados con aviso educativo y
  escalada automática (3 en 7 días → advertencia; 4º → suspensión 3 días + caso).
- Rompehielos por plantillas desde el perfil del otro (spec), reportar con captura de
  historial, bloquear, deshacer conexión (90 días), archivar (Plus). Sin imágenes en chat.

### Hito 7 — Comunidad (RF-COM-01..09)
- Grupos abiertos/con aprobación/oficiales, muro moderado, comentarios, reacciones
  (Amén/Estoy orando/Me gusta), peticiones de oración con "respondida", actividades con
  asistencia, roles con silenciar/expulsar, sugerencias por perfil, máx. 3 grupos administrados.

### Hito 8 — Eventos (RF-EVE-01..08)
- Agenda con distancia (perfil→evento), conexiones que asisten respetando privacidad,
  asistencia GOING/INTERESTED con aforo (reserva prioritaria Oro), check-in por QR,
  recordatorios push 24 h antes (cron horario), destacados administrables.

### Hito 9 — Portal de iglesias (RF-IGL-01..06)
- Registro y aprobación de organizaciones, roles del portal, eventos borrador → revisión →
  publicado (publicación directa configurable), generación de códigos por lote, solicitudes
  de respaldo con confirmación/rechazo, revocación, métricas. UI según mockups.

### Hito 10 — Panel administrativo (RF-ADM-01..12)
- Tablero con KPIs y alertas; miembros con ficha y acciones; cola de verificaciones con
  comparación lado a lado; cola unificada (reportes/IA/apelaciones) con prioridad y SLA;
  decisiones auditadas; organizaciones/eventos/grupos; configuración del algoritmo
  (pesos con validación suma 100, matriz editable, límites, umbrales); reembolsos con
  doble aprobación; bitácora inmutable.

### Hito 11 — Notificaciones (RF-NOT-01..03)
- Centro en app + push Expo/FCM, preferencias por categoría, registro de tokens.

### Hito 12 — Freemium Plus/Oro (RF-PLU-01..10)
- Dos niveles con planes mensual/trimestral/anual y precios administrables DOP/USD.
- Adaptadores de pago: Stripe (real), Azul (stub documentado), recibos App Store/Google Play,
  stub de desarrollo. Un solo estado por cuenta; subir con prorrateo, bajar al fin del período.
- Modo invisible ligado a Oro con desactivación automática al vencer y aviso 3 días antes.
- Paywall contextual comparando niveles (mockup). RF-PLU-09: ningún pago desactiva seguridad.

### Hito 13 — Web de usuario
- Next.js 14 responsive con paridad de flujo: bienvenida, onboarding de 8 pasos con pacto,
  inicio, Descubrir, afinidad con arco del yugo, conexiones/chat, comunidad, eventos,
  perfil, paywall y visibilidad. Modo demo con fixtures cuando la API está apagada.

### App móvil (Expo)
- Expo Router + tabs; mismas pantallas clave con tokens compartidos y datos demo.

### Hito 14 — Seguridad, privacidad y cumplimiento (RF-SEG-06..08, RNF-04/07)
- Módulo `privacy`: exportación completa de datos personales, solicitud de rectificación
  y **borrado real** a los 14 días conservando solo lo que la ley permite retener.
- Rangos de distancia como control opt-in (RF-SEG-07), con spec de los cortes.
- Contenido legal versionado (pacto, términos, privacidad, consejos de seguridad) y
  `CovenantGuard` que fuerza la re-aceptación cuando cambia la versión (RF-SEG-01).
- Rate limiting global por usuario/IP con límites estrictos en registro (5/h), OTP (10/h),
  login (10/15 min) y recuperación de contraseña.
- Páginas legales públicas en la web y pantalla «Privacidad y seguridad» con los derechos
  de la Ley 172-13, consejos de seguridad y eliminación de cuenta dentro de la app (RNF-07).

### RF-AUT-02 — Inicio de sesión con Google y Apple
- Verificación del `id_token` contra el JWKS del proveedor: firma RS256, emisor, audiencia
  y expiración. La mayoría de edad se sigue validando en backend porque los proveedores no
  entregan fecha de nacimiento; el intento de un menor queda auditado igual que en el
  registro por correo.

### Colas y notificaciones
- BullMQ para moderación de imagen, push y correo, con ejecución en línea cuando no hay
  Redis (dev y CI) para que el comportamiento sea idéntico.
- Plantillas de correo transaccional en es-DO (bienvenida, OTP, resultado de verificación,
  recibo de pago, aviso de moderación, descarga de datos, resumen semanal) con spec.
- `/health` público y `/health/metrics` con backlog de moderación, SLA vencidos y
  profundidad de colas.

### Pantallas restantes del mapa de pantallas (10.1)
- «Te interesa a…» con el corte gratuito/Plus, Guardados, detalle de grupo con muro
  moderado y actividades, detalle de evento con check-in QR, centro de notificaciones con
  preferencias por categoría y horario silencioso, privacidad y seguridad, páginas legales.

### Hito 15 — Calidad, observabilidad y lanzamiento (RNF-01..03, RNF-08..10)
- **56 pruebas E2E** con Playwright (móvil y escritorio) sobre los flujos críticos:
  registro con pacto y bloqueo de menores, descubrir → interés → conexión → chat con
  moderación previa, paywall Plus/Oro, regla mutua de edad, derechos Ley 172-13, colas del
  panel administrativo y publicación de evento desde el portal hasta la agenda de la app.
- Maestro para los dos flujos móviles críticos; k6 para Descubrir (p95 < 400 ms) y chat
  (costo de la moderación previa, objetivo < 300 ms).
- Logs estructurados en JSON con correlación y latencia, sin registrar cuerpos.
- Dockerfiles multi-etapa para API y web, pipeline de despliegue con staging automático,
  E2E contra staging y **aprobación manual para producción** (RNF-10).
- `docs/OPERATIONS.md` (runbook con umbrales de alerta e incidentes frecuentes) y
  `docs/STORE_RELEASE.md` (requisitos de App Store y Google Play para apps de citas).

### Cliente de API tipado y cableado real (Hito 1, cierre)
- `@yugo/shared/api`: transporte con token bearer, refresco transparente compartido entre
  401 simultáneos y errores de dominio tipados (`ApiError.needsUpgrade`, `needsCovenant`);
  cliente con un método por endpoint agrupado por módulo. `TokenStorage` es un adaptador:
  `localStorage` en la web, llavero del dispositivo (`expo-secure-store`) en móvil.
- `@yugo/app-core`: los hooks de pantalla y el estado demo viven una sola vez y los usan
  web y móvil; cada pantalla resuelve contra los fixtures o contra la API según el modo
  demo, con un solo camino de código. El `QueryClient` se crea aquí para que ambas apps
  compartan una única instancia de react-query.
- Los mensajes en español de los códigos de error del API se centralizaron en
  `@yugo/shared/i18n/api-errors`.

### Paridad completa de la app móvil
- Pantallas nuevas: entrar, recuperar contraseña, verificación en tres niveles con selfie
  guiada, perfil destacado, código promocional, notificaciones, preferencias de búsqueda,
  privacidad y seguridad, guardados, «Te interesa a…», detalle de grupo, detalle de evento
  con check-in QR y documentos legales.
- Las pantallas existentes pasaron de fixtures locales a los hooks compartidos: inicio,
  descubrir, conexiones, comunidad, eventos, chat (con reportar, bloquear, deshacer
  conexión e invitar a un evento), afinidad, perfil, visibilidad y Plus.
- El registro crea la cuenta contra la API en web y móvil: la cuenta se registra cuando ya
  se conoce la fecha de nacimiento (RF-AUT-03), luego el código OTP, el pacto con su
  versión (RF-AUT-04) y el perfil al terminar.
- Tres flujos Maestro: registro, descubrir → chat y perfil → verificación.

### Horario silencioso real (RF-NOT-02)
- Modelo `NotificationQuietHours` (migración `0004`) con la ventana en horas enteras de
  `America/Santo_Domingo`, ventana que cruza la medianoche incluida (22:00 → 07:00).
- Una notificación levantada dentro de la ventana **siempre se guarda**; lo que espera es
  el push, que se encola con retraso hasta que la ventana cierra en vez de perderse.
- 8 pruebas unitarias fijan instantes en UTC y verifican la lectura local, el cruce de
  medianoche, el minuto exacto de cierre y la ventana vacía.
- Web y móvil editan la ventana y silencian cada categoría por separado contra la API.

### Pendiente para siguientes iteraciones
- Proveedor real de comparación facial y de moderación de imágenes (hoy adaptadores con
  stub), pasarela Azul en producción (interfaz documentada, implementación pendiente de
  credenciales) y las funciones fuera del MVP de la sección 3.2 (videollamadas, mentoría,
  devocionales, bolsa de oportunidades, multimoneda).
