# Changelog de Yugo

Registro por hito. Cada entrada indica los RF cubiertos y cómo verificarla
(ver `docs/TESTING.md` para el paso a paso).

## v0.5.0 — Dos defectos propios, y una revisión con capturas

### Lo que estaba roto, dicho sin rodeos
Dos defectos introducidos en la entrega anterior, encontrados al verificarla y
no por un reporte:

1. **Una petición de oración retenida no podía aprobarse nunca.** El caso de
   moderación se creaba solo con el id de la persona; la cola resolvía casos
   por mensaje, publicación o foto y no sabía qué hacer con este. A quien la
   escribió se le decía «se publica cuando alguien la apruebe», y nadie podía.
   Lo mismo con las reflexiones del devocional y con los testimonios de
   «fue contestada», que además se descartaban en silencio.
2. **No había forma de escribir devocionales.** Había catorce sembrados; el día
   quince la app iba a decir «el de hoy todavía no está publicado» para
   siempre. Se construyó la función y no quién la alimenta.

### Cola de retenidos, real
La pestaña «Retenidos» del panel traía un texto fijo («41 mensajes retenidos»)
y no permitía hacer nada, ni siquiera con mensajes. Ahora trae el contenido de
cada cosa —mensajes, publicaciones, fotos, peticiones, testimonios y
reflexiones— y dos botones. Aprobar publica y avisa; rechazar retira y también
avisa: las dos respuestas importan igual. Una sola puerta para todos los tipos,
para que el siguiente texto que pase por moderación no repita la historia.

Quien modera ve quién escribió una petición anónima —es personal del equipo y
lo necesita para decidir—; la etiqueta «anónima para la comunidad» le recuerda
lo grave que sería filtrarla.

**Una petición o una reflexión nunca se rechaza sola.** Si el clasificador dice
«rechazar», queda retenida con prioridad alta y la decide una persona. En el
chat es distinto: ahí se le dice a la persona al instante que no se entregó;
aquí se le dijo que espere, y alguien tiene que estar del otro lado.

### Autoría de devocionales
`/admin/devocionales`: la **reserva** —días consecutivos programados a partir
de hoy— en grande y con color, porque es el número que evita el defecto. El
tablero avisa con una semana y en rojo cuando llega a cero. Un devocional ya
leído no se reescribe ni se borra: lo que alguien leyó fue lo que leyó, y «27
de tu iglesia lo leyeron hoy» tiene que seguir significando que leyeron lo
mismo.

Esto es una **dependencia operativa**, no solo una pantalla: alguien tiene que
escribir uno al día. Está en `OPERATIONS.md`.

### Lo que la suite encontró de paso
- **Desfase de un día en las fechas del devocional.** `publishOn` es un `DATE`
  que Prisma entrega como medianoche UTC; formatearlo en hora de Santo Domingo
  lo convertía en el día anterior. Contra la API real, el devocional de hoy
  habría dicho «el de hoy todavía no está publicado». La semilla tenía el mismo
  sesgo.
- El login del personal exige 2FA (RF-AUT-07) y la suite de humo no lo
  contemplaba. Ahora acuña su propio código, como haría una persona con la
  consola delante: el camino que se ejercita es el real.

### Revisión visual, con capturas y no leyendo código
36 capturas de todas las pantallas, en móvil y escritorio. Lo que se corrigió:
- En escritorio, todas las páginas eran una columna de 672 px y la mitad de la
  pantalla quedaba vacía. Inicio va a dos columnas (lo del día y, al lado, lo
  que vale abrir todos los días); Descubrir y Eventos, en retícula. El chat,
  el perfil y los formularios se quedan en una columna: una conversación
  estirada a 1000 px se lee peor.
- «Muro de oración» aparecía dos veces en su propia página.
- «Miércoles, 2 De Septiembre»: un `capitalize` de CSS ponía mayúscula a cada
  palabra. Corregido en web y en la app.
- Las pestañas de la web no tenían roles de pestaña (la app sí): un lector de
  pantalla anunciaba botones sueltos sin saber cuál estaba activa.
- El panel no tenía navegación en móvil: quien moderaba desde el teléfono se
  quedaba en la página en la que entró.
- Un texto al 80 % de opacidad bajaba el contraste por debajo de AA.

### Verificación
- 120 pruebas en `@yugo/shared`, 179 en la API (22 nuevas: cola de retenidos y
  autoría), **290 E2E**, escaneo de secretos con auto-test 15/15.
- Suite de humo contra API y PostgreSQL reales: **130/130**, incluido el ciclo
  completo que antes no cerraba: petición retenida → aparece en la cola con su
  texto → un moderador la aprueba → aparece en el muro → sale de la cola.

## v0.4.0 — Propósito verificable, y conversaciones que importan

### Validación de propósito
La moderación leía mensajes, uno por uno. Nadie miraba el **patrón** de una
persona: alguien podía escribir cien mensajes impecables y estar usando Yugo
para coleccionar conexiones. El contenido no lo delata; el comportamiento sí.

Ahora hay cinco señales que responden preguntas que un pastor haría sin
datos: ¿le escribe a la gente que dice que le interesa? ¿alguna de esas
conversaciones llega a algún lado? ¿en seis meses no hubo un vínculo que
avanzara? ¿insiste en pedir dinero o en sacar la charla de la app? ¿lo
reportaron por no buscar lo que dice buscar?

Tres decisiones son el producto entero, no detalles:

1. **Ninguna señal castiga sola.** Lo peor que ocurre automáticamente es
   fricción y una conversación privada que no acusa a nadie. Suspender y
   expulsar sigue siendo de una persona, con el historial delante. Verificado
   contra la base real: cuenta ACTIVE y cero sanciones tras el barrido.
2. **Los falsos positivos duelen mucho más.** Acusar de insinceridad a alguien
   sincero es la herida que este producto no puede permitirse. Cada señal tiene
   umbrales de volumen y antigüedad, y una cuenta nueva no puede dispararlas.
   El barrido contra 40 miembros sembrados no señaló a ninguno.
3. **El puntaje no se le muestra a nadie.** Un número visible se vuelve un juego
   de estatus. Solo lo ve moderación, con cada señal explicada en español —
   un puntaje sin explicación es una acusación sin pruebas.

La insignia **«Perfil con propósito»** se gana con evidencia positiva
—conversaciones sostenidas, un vínculo que avanzó— y no se compra, igual que el
filtro de respaldados es gratis.

### Conversaciones que importan
Las parejas que se rompen después de casadas rara vez se rompen por algo que
nadie podía saber: se rompen por dinero, por familia política, por hijos, por
cómo se pelea. Doce conversaciones concretas, que se abren por etapa —
preguntar por hijos en el primer mensaje espanta; preguntarlo antes del
compromiso llega tarde.

**Las dos respuestas se revelan a la vez.** Si el segundo ve la del primero,
contesta a esa respuesta y no a la pregunta. No es un `hidden` de CSS: el dato
no sale del servidor mientras falte una, y la suite de humo comprueba que el
texto no viaja en ninguna parte del payload.

No hay puntaje de compatibilidad ni «les falta un 20%». Dos personas que no
coinciden aquí no están mal emparejadas: están informadas.

### Lo que no se construyó, otra vez
Ni videollamadas, ni feed infinito, ni rachas. La razón práctica, más allá de
la filosófica: en una app de matrimonio, quien más horas acumula es
desproporcionadamente quien la está usando mal. Optimizar tiempo en pantalla
optimiza exactamente a la población que la validación de propósito filtra.

### Verificación
- 97 pruebas en `@yugo/shared`, 141 en la API, 224 E2E.
- Suite de humo contra PostgreSQL real: **89/89**, incluida la comprobación de
  que la respuesta ajena no viaja, que un miembro no puede ver el puntaje de
  otro, y que cada quien ve de sí mismo solo si ganó la insignia.

## v0.3.0 — El propósito, dentro del producto

Hasta aquí Yugo era una app de citas bien construida para cristianos. Esta
versión mete el propósito en el modelo de datos, donde no se puede olvidar.

### Etapas del vínculo
Una conexión que solo podía estar `ACTIVE` o `ENDED` no expresaba lo que el
producto promete. Ahora un vínculo recorre **conociéndonos → amistad
intencional → noviazgo → comprometidos → casados**, y cada paso lo declaran los
dos: uno propone, el otro acepta, ninguna avanza sola. La app no puede decir
que dos personas son novios porque una tocó un botón.

La consecuencia que sostiene todo lo demás: **al declarar noviazgo, ambos salen
de Descubrir**, en las dos direcciones. Ninguna app de citas lo hace porque va
contra su métrica; aquí es la señal de confianza que sostiene el respaldo de
una iglesia. Le cuesta alcance a Yugo, y por eso vale.

`validateStageProposal()` vive en `@yugo/shared` y valida igual en la API y en
modo demo, así que la demo no puede enseñar un paso que el producto rechazaría.

### Acompañamiento: un matrimonio camina al lado
Un noviazgo dentro de una iglesia no ocurre a solas. Una pareja con respaldo
nivel 3 puede acompañar a otra: ve en qué etapa está el vínculo y cuándo
avanzan.

**Nunca ve un mensaje.** No es una pantalla que decidimos no construir:
`AccompanimentService` no tiene ningún camino a una `Conversation`, vive en su
propio controlador, y la suite de humo comprueba contra un servidor real que un
padrino recibe 403 al intentar leer o escribir en el chat. Una garantía de
privacidad que no se puede verificar no es una garantía.

Consentimiento de los tres, y cualquiera puede terminarlo cuando quiera sin dar
explicaciones: un consentimiento que no se puede retirar no es consentimiento.

### La iglesia convoca, y el cupo es real
Encuentros del ministerio de solteros, separados de los cultos para que el
ministerio pueda ver si su trabajo llega a alguien. Panel nuevo en el portal
con totales y tasas, nunca nombres.

Se corrigió un fallo de fondo: cuando un evento se llenaba, una suscripción Oro
entraba **por encima** del aforo. El comentario prometía «a small reserved
buffer» que nunca se implementó, así que el dinero compraba una silla que no
existe en el salón. Ahora el cupo no se pasa nunca con ningún plan; la
prioridad de Oro es una reserva *dentro* del cupo que se disuelve 48 h antes; y
quien no cabe entra en lista de espera y sube solo cuando alguien cancela.

### Medir lo correcto
El embudo terminaba en «Suscritos a Plus» y «Suscritos a Oro»: el sistema
definía su éxito como ingresos. Ahora termina en vínculos que avanzaron, en
noviazgos y en **matrimonios**. Las suscripciones siguen medidas, en su propio
reporte, sin ser la meta. La pantalla de reportes dejó de ser estática.

### Historias
Parejas que se conocieron aquí y se casaron, con su congregación por testigo.
Es lo único que Yugo puede publicar que demuestre que hace lo que dice, y lo
más fácil de falsificar: por eso hacen falta los dos síes, la iglesia queda
nombrada y una persona la lee antes de publicarla. La página es pública y vive
fuera de la app.

### El evento como presentación, y el primer encuentro
Coincidir en un evento desplaza a cualquier otro motivo en la tarjeta y lleva
al evento: compartir denominación es una etiqueta, estar en la misma sala el
viernes es un hecho, y verse entre gente conocida es más seguro que una cita
armada desde cero. La preferencia `allowEventPresenceVisible` manda.

El plan del primer encuentro (RF-SEG-06) es **de quien lo escribe**: la otra
persona no lo ve ni sabe que existe. Y Yugo **nunca guarda ni contacta al
tercero**: la app escribe el mensaje, la persona lo manda desde su teléfono, y
solo se registra que lo hizo (Ley 172-13). Unas horas después pregunta «¿todo
bien?», a la persona y a nadie más.

### Verificación
- 67 pruebas en `@yugo/shared`, 119 en la API, 208 E2E (con auditoría axe de
  cada pantalla nueva).
- Suite de humo contra PostgreSQL real: **79/79**, incluyendo el ciclo completo
  de etapas hasta «Casados», los 403 del padrino en el chat, el encuentro de un
  solo lugar con su lista de espera, y que el plan del primer encuentro no
  contiene ningún teléfono de terceros.

### Lo que deliberadamente NO se construyó
Videollamadas, feed infinito, rachas ni nada que optimice tiempo en pantalla.
Son las funciones que harían subir las métricas de una app de citas y bajar las
de esta.

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

### Requisitos no funcionales pendientes (RNF-01, RNF-05, RNF-06)
- **Accesibilidad (RNF-05)** — se auditaron 21 superficies con axe contra WCAG 2.1 AA y
  **10 fallaban**, todas por contraste. Correcciones en la paleta, no parches por pantalla:
  `olive` #7A8450 → #6B7445 (texto blanco encima pasa de 4.0 a 4.99) y `muted` #6C7280 →
  #63697A (sobre `linen2` pasa de 4.12 a 4.69). Además, el enlace al perfil desde Inicio
  no tenía nombre accesible, el lateral del portal de iglesias usaba un crema de 4.30 y
  aclaraba el fondo activo (bajando el contraste en vez de subirlo), y las notificaciones
  leídas se atenuaban al 70 % — ninguna opacidad conserva AA, así que ahora lo **no leído**
  se marca con un borde de acento en vez de apagar lo leído. 42 pruebas nuevas (móvil y
  escritorio) dejan la regla puesta: una regresión de contraste rompe la suite.
- **i18n (RNF-06)** — el español era el único idioma posible: un objeto `es` exportado
  directamente. Ahora `packages/shared/src/i18n` tiene registro de locales, `Dictionary`
  derivado del diccionario de referencia (con las literales de `as const` ensanchadas) y
  `resolveLocale()` para la lista de idiomas del navegador o del dispositivo. Añadir
  inglés es escribir un archivo tipado como `Dictionary`: el compilador exige cada clave,
  incluidas las funciones de interpolación y sus firmas. Ninguna de las 70 pantallas cambia.
- **Respaldos (RNF-01)** — la retención de 30 días estaba escrita como política pero no
  existía el script. `infra/scripts/backup-postgres.sh` hace el volcado, **lo verifica con
  `pg_restore --list` antes de rotar** (si el respaldo de hoy salió mal conserva el
  histórico en vez de borrarlo) y opcionalmente lo copia fuera del servidor.

### Primera ejecución real contra PostgreSQL — cuatro fallos de arranque
Hasta aquí nada había levantado la API contra una base real: las pruebas
unitarias cubren el dominio aislado y Playwright cubre la interfaz en modo demo,
pero entre ambas no había nadie. Al ejecutarlo por fin aparecieron cuatro fallos,
tres de ellos **impedían arrancar en producción**:

- **El entrypoint compilado no existía.** `prisma/seed.ts` estaba en el `include`
  del tsconfig, así que el `rootDir` común subía a la raíz y el build emitía
  `dist/src/main.js`, mientras el script `start` y el `CMD` del Dockerfile
  apuntan a `dist/main.js`. El contenedor arrancaba y moría. El seed se ejecuta
  con `tsx`, nunca compilado, así que sale del build y se tipa en su propio
  `tsconfig.typecheck.json`.
- **`tsbuildinfo` quedaba fuera de `dist`.** Borrar `dist` sin borrarlo dejaba
  builds vacíos en silencio; ahora vive dentro y `deleteOutDir` lo limpia.
- **Un `ValidationPipe` global pedía `class-validator`**, paquete que el proyecto
  no usa: la validación es de zod por controlador. Se retiró.
- **`make_interval(days => $n)` recibía `bigint`** de Prisma donde Postgres
  espera `int`: `/discover` respondía 500. Corregido con `::int` en las tres
  consultas crudas.

También apareció un fallo de producto: la lista diaria de Descubrir se cachea
hasta la medianoche local (así debe ser: no hay feed infinito), pero **no se
encogía**. Quien ya había recibido tu interés seguía en pantalla y volver a
marcarlo devolvía `already_interested`. La exclusión ahora se aplica también al
servir, de modo que la lista es estable en su composición y decrece conforme la
persona la trabaja.

Y uno de trazabilidad legal: el intento de registro de un menor se rechazaba en
el esquema zod con 400, **antes** de llegar al servicio que lo escribe en
`AuditLog`. El bloqueo funcionaba pero no dejaba rastro, que es justo lo que
RF-AUT-03 exige. Ahora el esquema de la API no valida la edad —los clientes sí,
para avisar antes de enviar— y el servidor es la única autoridad: audita y
responde 403.

**Para que no vuelvan**: `apps/api/test/api-smoke.ts` levanta la API y le habla
por HTTP (21 comprobaciones sobre salud, mayoría de edad, regla mutua de edad,
lista del día, horario silencioso, conexión recíproca y moderación previa del
chat), y CI ahora aplica migraciones, **comprueba que no haya deriva de esquema**,
compila la API, la arranca y corre esa suite.

### Los adaptadores sin proveedor ahora fallan cerrado
Al revisar qué queda en manos de terceros apareció un patrón peligroso: dos
adaptadores **aprobaban** cuando no había proveedor configurado, en vez de
esperar a una persona.

- **Comparación facial (RF-VER-01).** El comparador estaba fijado al stub, sin
  forma de conectar un proveedor real: en producción la verificación de
  identidad se resolvía con un puntaje inventado. Ahora se elige por
  `FACE_MATCH_URL`, el stub devuelve 0.5 (por debajo del umbral de 0.93, así que
  nunca aprueba) y un fallo del proveedor deja la similitud desconocida en lugar
  de asumir un pase. La regla se extrajo a `shouldAutoApprove()` con 5 pruebas
  que la fijan.
- **Moderación de imágenes (RF-SEG-02).** Sin proveedor, el stub aprobaba todas
  las fotos — también en producción. Ahora el stub queda para desarrollo y una
  producción sin configurar retiene cada foto para revisión humana: más lento,
  nunca inseguro.

La moderación de texto ya fallaba cerrado (retiene cuando el clasificador cae) y
se dejó igual.

## v0.2.0 — De maqueta funcional a producto usable

Tres cosas impedían que un usuario real evaluara Yugo, y ninguna se notaba
porque el modo demo las disimulaba.

### Fotos reales (RF-PER-02)
El backend estaba completo desde el principio — URL firmadas, moderación previa
por cola, `/discover` ya devolvía `photoUrl` — pero **ningún cliente subía ni
mostraba una imagen**: 22 siluetas y cero `<img>`. Ahora se suben desde cámara o
galería, recortadas al cuadrado en el dispositivo (todas las superficies muestran
la foto en cuadrado o círculo: sin recortar, la persona nunca vería el encuadre
que ven los demás), con el estado de moderación visible foto por foto.

### Chat en vivo (RF-CON-03)
El `ChatGateway` de Socket.IO existía y nunca se conectó nadie: los mensajes solo
aparecían al recargar. Se añadió el cliente compartido, el indicador de
«escribiendo…» y los acuses de entrega y lectura, que ya estaban en el modelo de
datos sin usar. La persistencia y la moderación siguen en HTTP, así que una caída
del socket degrada al comportamiento anterior en vez de perder un mensaje.

### Notificaciones que llegan (RF-NOT-01/03)
El endpoint de token existía y la app nunca lo llamaba: toda la infraestructura
de notificaciones no alcanzaba ningún teléfono. Ahora se registra el token y un
toque abre la pantalla correspondiente, con `destinationFor()` probado en
`@yugo/shared`.

### La afinidad y el respaldo, aprovechados
- **El porqué, en la tarjeta** (RF-DES-02): `affinityReason()` convierte el
  desglose en una frase corta y concreta. Es lo que justifica una lista de seis
  personas frente al scroll infinito. Conservador a propósito: cuando no hay nada
  específico dice el puntaje en vez de inventar una conexión.
- **Rompehielos del cruce real** (RF-CON-04): antes salían solo del perfil ajeno,
  lo que se lee como entrevista; ahora lo compartido va primero.
- **Filtro «solo respaldados»** (RF-VER-02), gratuito a propósito: cobrar por
  filtrar la señal de confianza empujaría a la gente hacia perfiles menos
  verificados.
- **Métricas de iglesia** (RF-IGL-06) con tasa de canje de códigos, y una
  explicación de qué **no** se muestra: el respaldo descansa sobre esa separación.

### Menos fricción
- Prueba de valor durante el registro: cuánta gente de tu denominación ya está
  aquí. Redondeado a la decena y sin número por debajo de un piso, para que no
  sirva para sondear quién hay en un pueblo pequeño.
- La lista vacía de Descubrir dejó de ser un callejón: ofrece comunidad, eventos,
  ampliar la búsqueda y quitar el filtro.
- Móvil sin señal: caché persistida por 24 h y un aviso explícito, en vez de
  pantallas vacías. Solo se restauran lecturas — reproducir una mutación vieja al
  reconectar es como las apps mandan cosas dos veces.
- Tipografía del sistema respetada hasta 1.6× (más allá la pantalla deja de ser
  usable y conviene el zoom del sistema), y `prefers-reduced-motion` en la web.

### La suite de humo cubre también lo nuevo
Las cinco fases de la v0.2.0 se habían verificado con typecheck, build y E2E en
modo demo — es decir, contra fixtures. Ahora `test:smoke` las ejerce contra una
base real y suma 13 comprobaciones: que el motivo de la sugerencia lo calcula el
servidor y viaja en cada tarjeta, que el filtro de respaldo nunca amplía la lista
ni deja pasar a quien no lo tiene, que `/catalog/reach` es público y redondea sin
filtrar identidades, que la firma de subida rechaza lo que no es imagen, y que el
**gateway de tiempo real** funciona de punta a punta: autentica con el JWT, se
une a la sala y un mensaje enviado por HTTP llega por el socket.

Ese último bloque importa especialmente: el gateway existía desde el principio
sin que nada se conectara, así que podía romperse sin que ninguna prueba se
enterara.

### Pendiente para siguientes iteraciones
- Proveedor real de comparación facial y de moderación de imágenes (hoy adaptadores con
  stub), pasarela Azul en producción (interfaz documentada, implementación pendiente de
  credenciales) y las funciones fuera del MVP de la sección 3.2 (videollamadas, mentoría,
  devocionales, bolsa de oportunidades, multimoneda).
