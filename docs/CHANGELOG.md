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

### Pendiente para siguientes iteraciones (hitos 14–15)
- E2E Playwright/Maestro, pruebas de carga k6, exportación de datos (Ley 172-13),
  despliegue staging/producción, guía de publicación en tiendas, Google/Apple Sign-In real,
  BullMQ para colas dedicadas y proveedor real de comparación facial e imágenes.
