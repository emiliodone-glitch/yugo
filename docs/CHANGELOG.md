# Changelog de Yugo

Registro por hito. Cada entrada indica los RF cubiertos y cómo verificarla
(ver `docs/TESTING.md` para el paso a paso).

## v0.12.0 — La mejor app de citas cristiana: voz propia, razones, confianza y lo que pasa después del sí

Respuesta a la revisión profunda de producto. Cada tanda se verificó y subió
por separado; esta entrada crece con cada una.

### Perfil con voz propia (RF-PER-09/12)
- **Tres preguntas en sus palabras.** Catálogo administrable desde
  Configuración del panel (`SETTING_KEYS.PROFILE_QUESTIONS`, mínimo tres, con
  validación y vuelta al catálogo compilado si el ajuste está roto). Pantalla
  «Tu voz» en web (`/perfil/voz`) y móvil (`perfil/voz`): responder, cambiar,
  quitar, elegir otra pregunta; cada respuesta pasa por moderación de texto.
- **Testimonio en audio de 20 segundos.** Modelo `VoiceNote` (uno por
  persona, almacenamiento privado con URL firmada bajo `voice/`), grabación
  con MediaRecorder en web y `expo-av` en móvil, tope de tiempo, escucha
  previa y subida directa firmada. No hay clasificador de voz: cada audio abre
  un caso en la cola de retenidos del panel con reproductor; solo lo aprobado
  sale del perfil propio. Reemplazar o quitar el audio cierra el caso viejo.
- **La ficha de la otra persona lo muestra.** «En su voz» y «En sus
  palabras» en la ficha de afinidad web y en la tarjeta móvil; Descubrir
  resuelve las respuestas contra el catálogo vigente para no mostrar claves
  huérfanas.
- **Completitud reequilibrada** (suma 100): una respuesta 5, tres respuestas
  +5, audio aprobado 5; el nombre baja de 10 a 5 y el versículo deja de
  puntuar. Sin voz propia el perfil se queda en 85 como máximo, y la tarjeta
  «Tu perfil está al N %» pide justo eso.
- Semilla: respuestas para los 40 perfiles de demostración; fixtures con las
  respuestas de Mariel. Migración `0015_voz_propia`.

### Razones de afinidad visibles y comunidad que alimenta Descubrir (RF-DES-02, RF-CON-04)
- **Dos o tres razones en cada tarjeta**, nunca un porcentaje:
  `affinityReasons()` en shared ordena por lo que más dice de una persona
  (evento próximo compartido → lo que ya hicieron juntos → prácticas →
  iglesia/denominación → intención → cercanía). La frase única
  `affinityReason` se conserva para diseños estrechos.
- **La comunidad entra en las citas.** `CommunitySignalsService` calcula en
  lote, por lista, lo que dos personas ya hicieron juntas en Yugo: grupo en
  común, peticiones por las que ambos oraron (30 días), devocional sobre el
  que ambos reflexionaron (reflexiones aprobadas), evento pasado al que ambos
  fueron (respetando quién deja ver su asistencia). Sale en la tarjeta, en la
  ficha («Lo que ya comparten en Yugo») y abre los rompehielos del chat.
- Web: lista de razones en la tarjeta y sección «Por qué esta persona» en la
  ficha; móvil: lista en la tarjeta. Fixtures y E2E `razones-afinidad`.

### Cierre digno y videollamada dentro de la app (RF-CON-11/12)
- **Cerrar con una palabra, no con silencio.** «Cerrar esta conexión» ya no
  es un «¿seguro?»: se elige una de tres plantillas amables o se escribe la
  propia (moderada como cualquier texto). El mensaje queda como último de la
  conversación, llega como notificación y la conexión se cierra para ambos.
  `POST /connections/:matchId/close`; el vínculo guarda `closingMessage`.
  Reporte nuevo en el panel: «Cierres: con mensaje o en silencio», por
  semana. El ghosting no se prohíbe; se mide y se hace más fácil no hacerlo.
- **Videollamada de quince minutos sin compartir número.** Modelo
  `VideoCall`; proponer hora desde el chat, lista con estado, entrar desde 10
  minutos antes hasta 15 después del fin, cancelar con aviso. Proveedor
  detrás de una abstracción (`VideoProvider`): Daily crea salas privadas de
  dos personas que caducan solas y tokens nominales; sin `DAILY_API_KEY` la
  función se muestra como «todavía no activa». Web: panel en el chat y
  página de la sala embebida; móvil: hoja con tres horas propuestas y sala en
  el navegador integrado (`expo-web-browser`).
- Migración `0016_cierre_digno_videollamada`. Pruebas de la ventana de
  entrada y del proveedor; E2E `cierre-y-videollamada`.

### Presentación por padrino con doble consentimiento (RF-ACO-05)
- Un matrimonio que acompaña (perfil de padrino activo, respaldado por su
  iglesia) presenta a dos personas que conoce: correo o teléfono de cada una
  y una nota con el porqué (moderada). Modelo `Introduction`, catorce días
  de vigencia.
- **Nadie ve a la otra persona antes del sí.** Quien recibe la presentación
  ve al padrino, su nota y la iglesia y ciudad de la otra persona; ni nombre
  ni foto. Un «no» cierra y al padrino solo se le dice que «no se concretó».
  Con dos «sí» nace la conexión igual que con un interés mutuo (mismo
  vínculo, misma conversación) y los tres reciben aviso.
- La misma respuesta para «no existe» y «no está activa»: un padrino no puede
  averiguar desde aquí quién tiene cuenta. No se presenta a personas
  bloqueadas entre sí, ya conectadas, del mismo género ni a uno mismo.
- Web: tarjeta de presentación arriba de Conexiones; formulario y lista «lo
  que propusiste» en Acompañar. Móvil: sección equivalente en Conexiones y
  en Acompañar; el toque en la notificación lleva a Conexiones.
- Migración `0017_presentacion_por_padrino`. Pruebas del servicio (seis
  reglas) y E2E `presentaciones`.

### Segunda mirada y plan de domingo (RF-DES-13, RF-NOT-04)
- **Segunda mirada.** Cuando un «paso» vence y la persona sigue activa,
  Descubrir puede volver a mostrarla con la etiqueta «Segunda mirada» y lo
  que cambió desde entonces: fotos nuevas aprobadas, audio de testimonio o
  perfil más completo. Nunca se muestra a quien dio un «no» definitivo ni a
  quien deshizo el paso; sin cambios, solo dice que sigue activa.
- **Plan de domingo.** Los sábados a las 10:00 (Santo Domingo) cada persona
  recibe, si hay algo que contar, un aviso y un correo con el evento de su
  iglesia o ciudad este fin de semana, el devocional de mañana y la
  conexión con la que más días lleva sin hablar (tres o más). Sin racha ni
  «perdiste»: cuenta lo que hay alrededor, no lo que dejó de hacer. Si no
  hay nada, no se manda. Respeta el mismo apagado que el resumen semanal
  («Resumen semanal y plan de domingo por correo»).
- Pruebas del plan (cuatro reglas: nada vacío, la conexión más callada,
  mensajes recientes no cuentan, apagado respetado).

### Ruta de pareja después del sí (RF-REL-05)
- **Su ruta.** Desde el noviazgo, la conversación muestra los pasos que una
  pareja cristiana suele dar antes de casarse (familias, pastor, matrimonio
  que acompañe, la conversación de dinero; al comprometerse: consejería,
  fecha, vivienda, presupuesto, papeles; al casarse: su historia). Cada paso
  se marca con fecha y se ve quién lo marcó. Sin porcentaje ni reclamo:
  es un mapa, no una lista de tareas. Antes del noviazgo la tarjeta dice
  cuándo se abre. Modelo `CoupleMilestone`.
- **Para prepararse.** Recursos prematrimoniales en dos bloques: los que
  sirven a cualquier pareja y los de la tradición de alguno de los dos
  (evangélica/bautista, católica, adventista, pentecostal). Orden por tipo,
  nunca por denominación. Sin enlaces a tiendas.
- **Consejería con la iglesia.** Uno la pide a una de las dos iglesias
  (solo esas), la otra persona confirma, y solo entonces el portal la ve
  con los dos nombres, correos y la nota. `PENDING_PARTNER` no aparece en
  el portal por consulta. La iglesia acepta o no con un mensaje que les
  llega a los dos. Nueva página «Consejería» en el portal.
- Migración `0018_ruta_de_pareja`. Pruebas del catálogo (siete reglas), del
  servicio (siete) y E2E `ruta-de-pareja`.

### Web más viva (RNF-05)
- **Cada componente responde a la mano.** Tarjetas que se levantan y
  toman sombra y borde al pasar el mouse (y su foto se acerca un poco),
  botones que suben y se hunden al pulsar, chips accionables que crecen,
  campos que marcan el borde al acercarse y un anillo suave al enfocar,
  filas de lista que se deslizan y arrastran su flecha, enlaces del menú
  lateral que avanzan un paso. Solo reaccionan las superficies que hacen
  algo: un chip informativo o una tarjeta sin enlace no fingen ser botón.
- **Las pantallas entran, no saltan.** Cada `main` hace un fundido corto y
  las tarjetas suben en escalera (40 ms entre una y otra). Duraciones de
  150 a 350 ms; nada compite con leer.
- **Reducir movimiento sigue mandando.** El bloque `prefers-reduced-motion`
  apaga todas las animaciones y transiciones, incluidas las nuevas. Los
  efectos de mouse solo se aplican con `@media (hover: hover)`, así que en
  pantallas táctiles no queda nada «pegado» tras tocar.

### Verificación de identidad con proveedor real (RF-VER-01)
- **Amazon Rekognition detrás de la misma abstracción.** `FaceComparator`
  con tres implementaciones: stub (desarrollo), servicio externo por URL
  (`FACE_MATCH_URL`) y `RekognitionFaceComparator`, que compara la selfie
  con la foto principal leyéndolas del bucket S3 (`CompareFaces`). Se elige
  por entorno (`FACE_MATCH_PROVIDER=rekognition`, `REKOGNITION_REGION`
  opcional, `FACE_MATCH_AUTO_APPROVE` para el umbral, 0.93 por defecto).
- **Regla de auto-aprobación explícita y probada.** `shouldAutoApprove`
  exige vida (liveness) y similitud sobre el umbral; cualquier fallo del
  proveedor devuelve la selfie a revisión humana, nunca aprueba. 20
  pruebas cubren el factory, el umbral y los bordes. No verificado contra
  la cuenta real de AWS: falta contratar el servicio.

### Pruebas de carga ejecutables contra un despliegue (RNF-02)
- **Workflow «Carga (k6)» solo a mano** (`workflow_dispatch`): `base_url`,
  guion (`both`/`discover`/`chat`) y modo humo (por defecto). Inicia sesión
  con `LOAD_TEST_EMAIL`/`LOAD_TEST_PASSWORD` (token enmascarado), elige la
  primera conversación de esa cuenta para el chat, escribe el p95 por
  endpoint en el resumen del run y sube `k6-summary-*.json` como
  artefacto. Concurrencia por URL: nunca dos cargas a la vez contra el
  mismo entorno.
- **`SMOKE=1` en los guiones**: 10 s con 5 usuarios virtuales y los mismos
  umbrales, para validar guion y entorno sin castigar la API. Sin token, el
  guion corta antes de arrancar en vez de fallar con 401 en silencio.
  Corrido en local: 100 % de checks, p95 de 8 a 15 ms.

### Robustez (RNF-06/07/08/09)
- **Errores a Sentry, opcional.** API (`SENTRY_DSN`: solo 5xx, con requestId
  y ruta; nunca cuerpos, cookies ni cabeceras), web (`SENTRY_DSN_WEB`, leída
  al arrancar sin reconstruir; el SDK se descarga solo si hay DSN; sin datos
  de la persona) y app (`EXPO_PUBLIC_SENTRY_DSN`; exige build nuevo). Página
  de último recurso en la web cuando falla todo el árbol. Sin las variables no
  se envía nada.
- **Mensajes sin señal en la app.** Lo que se escribe sin red se guarda en
  el teléfono, se ve como «Pendiente de enviar» y sale solo al volver la
  conexión, en orden y de uno en uno. Un rechazo del servidor se descarta con
  aviso; nada más se reproduce al reconectar.
- **E2E contra la API real.** `pnpm e2e:live` recorre la web sin demo contra
  una API viva con una cuenta real; en CI, trabajo `e2e-live` con PostGIS,
  migraciones y semilla.
- **Copias y restauración.** `pnpm db:backup` (pg_dump verificado) y
  `pnpm db:restore` (se niega a tocar producción sin confirmación explícita,
  recrea el esquema, aplica migraciones pendientes y cuenta usuarios). Ensayo
  mensual documentado en RAILWAY.md.

### Inglés para la diáspora (RNF-06)
- **Diccionario `en-US` completo**, tipado contra el español: una clave que
  falte o una función con otra firma no compila. Misma voz («I'm interested»,
  «connection»), sin lenguaje de conquista.
- **Cambio sin tocar pantallas.** `es` (lo que importan 130 archivos) es
  ahora un proxy con el tipo del español que resuelve cada lectura contra el
  idioma activo. `setLocale('en-US')` y la siguiente pintura es en inglés;
  funciones, arreglos y claves dinámicas incluidas.
- **Elección y memoria.** Web: selector en Bienvenida y en Perfil; el
  servidor pinta español, al hidratar se aplica lo guardado o el idioma del
  navegador y solo entonces se remonta (sin desajuste de hidratación).
  App: fila «Idioma» en Perfil; arranca en lo guardado o en el idioma del
  sistema. Con sesión, la elección se guarda en la cuenta
  (`PUT /profiles/me/locale`, columna `User.locale`, migración `0019_idioma`).
- **Fechas y números en el idioma elegido.** Toda la web y la app formatean
  con el idioma activo (`intlLocale()`); el servidor sigue en es-DO porque
  allí no hay una persona activa.
- **La cuenta y el dispositivo coinciden.** Al cargar la sesión, el idioma
  guardado en la cuenta se aplica solo si en ese navegador o teléfono no se
  eligió ninguno: la elección local, más reciente, manda. En la app,
  cambiar de idioma vuelve a Perfil.
- **Lo que sigue en español a propósito:** nombres de lugares e iglesias y
  el texto legal del Pacto (se firma en español).
- **Lo que escribe el servidor también cambia de idioma.** Avisos (push,
  campana) y correos salen del catálogo `server-messages` en el idioma de
  la cuenta (`User.locale`): `NotificationsService.send(userId, categoría,
  clave, parámetros)` resuelve el texto por persona, así una misma
  conexión avisa en español a uno y en inglés al otro. Las diez plantillas
  de correo tienen versión en inglés (`renderTemplate(plantilla, datos,
  idioma)`); bienvenida, recibo, resumen semanal, plan de domingo e
  invitación al portal leen el idioma de quien recibe. El inglés está
  tipado contra el español: una clave sin traducción no compila. Las
  pruebas usan `notificationsMock()`, que resuelve el catálogo en español
  para seguir afirmando sobre el texto que lee una persona.
- CI corre también en la rama por defecto del repositorio (antes solo en
  `main`, que no existe, así que ningún push pasaba por lint, pruebas ni
  E2E).

## v0.11.0 — Ronda de experiencia: la primera semana, lo que hace volver y lo que faltaba de verdad

Respuesta completa a la revisión honesta de experiencia. Cada punto señalado
tiene su entrega; ninguno quedó fuera.

### La primera semana con pocos usuarios
- **Arranque por iglesia.** Portal → «Arranque»: cinco pasos con datos reales
  (aprobación, lote de códigos, tarjetas impresas, equipo del portal, primer
  evento) y el mensaje listo para el grupo de la congregación. Tarjeta en el
  inicio del portal mientras haya menos de 10 respaldados.
- **Lista de espera por ciudad.** Descubrir dice cuándo la lista sale corta
  por densidad (`cityCount`, `lowDensity`) y ofrece «Avísame cuando haya más
  gente»; aviso único los lunes al pasar de 25 perfiles completos.
- **Inicio con valor sin citas** ya existía (devocional, oración, eventos);
  ahora, además, la tarjeta «Tu perfil está al N %» lleva a lo que falta.

### Avisos y tiempo real
- Push conectado a los momentos que faltaban: eventos, iglesias y grupos
  aprobados o devueltos, reporte revisado (a quien reportó, sin revelar la
  sanción), ruta de acompañamiento y toque en frío en la app; `pushedAt`
  real y limpieza de tokens muertos.
- Correo por categoría según la preferencia, plantilla `NOTIFICATION`.
- **Resumen semanal por correo** (lunes 9:00): interés recibido, conexiones,
  mensajes sin leer, oraciones recibidas, eventos cerca y el devocional. Sin
  rachas; no se envía si la semana estuvo vacía; se apaga con un toque.
- El chat ya era en tiempo real (Socket.IO); ahora también lo son las
  notificaciones: sala por usuario, `notification:new`, globo en vivo en el
  riel web y en Perfil móvil, «marcar todas como leídas».
- Corregido: RELATIONSHIP y ACCOMPANIMENT devolvían 400 al guardar
  preferencias.

### Registro corto y «Completa tu perfil»
- Cuatro pasos (cuenta, edad, pacto, lo esencial). El paso de fotos que no
  subía nada desaparece; denominación opcional con la señal de alcance.
- Pantalla final con lo que más ayuda ahora; página `/perfil/editar` (web y
  móvil) con todo lo diferido; tarjeta de completitud en Inicio y Perfil.

### Fotos
- Guía de composición, plazo honesto de moderación (menos de 24 h), motivo
  visible al rechazar y «Subir otra».
- Panel `/admin/fotos`: una a la vez, grande, las demás fotos de la persona,
  atajos A/R y flechas. Dos fallos corregidos: las rechazadas en automático
  y las que el clasificador no pudo procesar quedaban invisibles.
- Aprobar una foto recalcula la completitud.

### Sensación de velocidad
- Esqueletos en todas las pantallas principales (web y móvil).
- Actualizaciones optimistas: interés y pasar quitan la tarjeta al instante
  (con vuelta atrás), Amén/Orando suben al momento, «Asistiré» se refleja
  ya; guardar por fin invalida «Guardados».

### Enlaces profundos y check-in
- Universal links (AASA, assetlinks, `associatedDomains`, `intentFilters`),
  ruta `/e/[id]` en la app, «Abrir en la app» en la página pública del
  evento, manifest e icono para instalar la web.
- **Check-in con QR real.** El QR se imprime desde el portal (`qrcode`),
  codifica la URL pública con el token de entrada; la app lo lee con
  `expo-camera` («Registrar mi asistencia») y la web lo registra con sesión.
  Antes ambos clientes dibujaban una matriz que ningún lector entendía.

### Portal de iglesias
- Invitación por enlace (7 días) a quien aún no tiene cuenta; el registro
  acepta el token; lista de pendientes con copiar y anular.
- «Imprimir lote (PDF)»: tarjetas recortables con el código y cómo usarlo.

### Pagos
- `quote()` + `activate()` idempotente; `POST /subscriptions/checkout`
  (stub en local, Stripe Checkout en producción); webhook con firma
  verificada sobre el cuerpo crudo; `GET /subscriptions/payments`.
- Web: «Continuar» en `/plus` funciona; `/plus/gracias` espera la
  confirmación y muestra el recibo; `/perfil/suscripcion` con recibos,
  cambio de nivel y cancelación clara. Móvil: pantalla equivalente.

### Accesibilidad
- Móvil: la letra sigue el tamaño del sistema (tope 1.6×); «reducir
  movimiento» apaga los pulsos.
- Web: Escape y foco en el chat; el menú anuncia su estado.

### Medir sin vigilar
- `ProductEvent` + `POST /analytics/events` (id anónimo por instalación,
  hash irreversible del usuario, sin PII); `track()` en app-core con cola.
- Reportes «Activación (eventos anónimos)» y «Eventos de producto».

### Migración y configuración
- Migración `0014`: `weeklyDigestOptOutAt`, `CityWaitlist`,
  `ChurchInvitation`, `ProductEvent`.
- Variables nuevas: `STRIPE_WEBHOOK_SECRET` (ya listada), `ANALYTICS_SALT`;
  `WEB_URL` pasa a ser necesaria para recibos, QR e invitaciones.
- Nuevas dependencias: `qrcode` (web), `expo-camera` (móvil; requiere un
  build nuevo de la app).

### Corregido en el recorrido real
- Guardar un perfil que ya existía devolvía 500: el upsert omitía el rango de
  edad en la rama `create` y Prisma la valida aunque la fila exista. Ahora
  siempre viaja; prueba unitaria que lo cubre.
- El enlace de invitación al portal caía en la puerta del portal (sin cuenta
  no había forma de verlo). Va fuera de la puerta y del menú.
- Las puertas de sesión (miembro, portal, panel) conservan la query al mandar
  a entrar: `?ci=` del QR o `?token=` de la invitación sobreviven al login.
- Al entrar sin `?next=`, cada cuenta va a su casa: staff al panel, quien
  administra una iglesia (o solo edita sus eventos, sin perfil) al portal, y
  el resto a Inicio. Antes una cuenta sin perfil caía en la zona de miembros
  con errores. `GET /auth/me` incluye `churchMemberships`; `homeRouteFor()`
  en shared con su prueba. El portal enlaza de vuelta a Yugo.
- Las páginas públicas (invitación, evento público) ya no piden la sesión
  cuando no hay una guardada: sin 401 de fondo para quien llega sin cuenta.

### Pruebas
- E2E actualizadas al comportamiento nuevo: el paywall con el propio nivel
  seleccionado lleva a «Gestionar mi suscripción»; el detalle de evento
  explica el QR de la entrada y `?ci=` registra la asistencia.
- Las auditorías axe esperan a que la pantalla se asiente (datos cargados y
  sin transiciones a medias) antes de medir contraste.

## v0.10.0 — Panel admin y portal de iglesias con datos reales

### Lo que pasaba
Diez páginas del panel y cuatro del portal de iglesias pintaban listas fijas:
la cola de verificación siempre tenía a «Mariel Peña», los miembros eran
cuarenta filas inventadas, «Generar 25 códigos» sumaba 25 a un número en
memoria y «Aprobar» no llamaba a nadie. Contra la API real se veía lo mismo
que en la demo, así que nadie podía moderar ni respaldar de verdad.

### API (RF-ADM-02/03/05/06/09/10/11, RF-IGL-02/04/05/06)
- Filas limpias para el navegador en `admin.members()` (edad, completitud,
  nivel, plan, reportes, sanciones) y `admin.verificationQueue()` (selfie y
  foto en URL firmada, similitud, prueba de vida, historial).
- Endpoints nuevos: `GET /admin/events` (publicados con asistencias y
  destacado), `GET /admin/groups`, `GET /admin/churches`,
  `GET /admin/subscriptions/summary` (Plus, Oro, ingresos del mes, reembolsos
  pendientes), `GET /admin/staff` (equipo con su 2FA).
- Portal: `GET /church-portal/metrics` añade `weeklyReach` (asistencias por
  semana, 8 semanas); `GET /church-portal/group` (muro del grupo oficial),
  `GET /church-portal/users`, `POST /church-portal/users/invite` (solo ADMIN,
  la cuenta debe existir, queda en la bitácora) y `DELETE /church-portal/users/:id`.
- Semilla: cuenta `iglesia@yugo.do` / `Yugo.iglesia1`, administradora de la
  primera iglesia aprobada, con 12 códigos (5 usados), dos solicitudes de
  líder pendientes y un evento en revisión.

### Hooks compartidos (`app-core/portal-hooks.ts`)
Uno por pantalla, con la demo como respaldo: `useAdminMembers`,
`useAdminMemberAction`, `useAdminVerificationQueue`, `useDecideVerification`,
`useModerationQueue('REPORT' | 'APPEAL')`, `useTakeNextCase`, `useDecideCase`,
`useAdminEventsInReview`, `useAdminPublishedEvents`, `useDecideEvent`,
`useSetEventFeatured`, `useAdminGroups`, `useDecideGroup`, `useAdminChurches`,
`useDecideChurch`, `useAdminSubscriptionSummary`, `useAdminPayments`,
`useApproveRefund`, `useAdminSettings`, `useUpdateWeights`,
`useDenominationMatrix`, `useUpdateMatrixCell`, `useAuditLog`, `useAdminStaff`,
`useChurchCodes`, `useGenerateChurchCodes`, `useEndorsementRequests`,
`useResolveEndorsement`, `useChurchMetrics`, `useChurchOfficialGroup`,
`useChurchUsers`, `useInviteChurchUser`, `useRemoveChurchUser`.

### Web
- Panel: miembros con búsqueda, ficha lateral y acciones con motivo;
  verificaciones caso a caso con anterior/siguiente; moderación con reportes
  y apelaciones reales y formulario de decisión (motivo obligatorio);
  eventos con aprobar/devolver con nota y destacar; grupos y organizaciones
  con aprobar/rechazar; suscripciones con resumen y reembolso a dos firmas;
  configuración con pesos guardados y matriz editable celda a celda;
  auditoría con el equipo real, aviso de quien no tiene 2FA y filtro por
  acción; reportes con el crecimiento semanal real.
- Portal: códigos vigentes para copiar, generar lotes y confirmar
  solicitudes; métricas reales con alcance semanal y estado vacío honesto;
  grupo oficial con su muro; usuarios con invitación y retiro de acceso.
- `CITIES` (ciudades con coordenadas) pasa a `@yugo/shared` para que la app
  móvil la use en el modo viaje.

### App móvil
Perfil, Preferencias, Visibilidad y la firma de tus publicaciones en un grupo
dejan la ficha de demostración: usan `useCurrentMember`, `useUpdatePreferences`,
`useSetOroBadge`, `useSetTravelMode` (con selector de ciudad y días),
`useWhoViewedMe` y `usePauseProfile`. Los interruptores Oro quedan
deshabilitados sin Oro y lo dicen; el rango de edad se guarda en la API.

### Verificación
`pnpm --filter @yugo/api test` (179), E2E web (308 en demo), recorrido real
como `admin@yugo.do` e `iglesia@yugo.do` contra la API local, jest móvil (34)
y humo RN Web sin errores de consola.

## v0.9.0 — Pantallas que dicen la verdad y una web que usa la pantalla

### Lo primero: ocho pantallas mostraban datos de otra persona
Con la cuenta de prueba, Perfil decía «Emilio, 34 · QA Analyst · Bautista ·
82 %». Era la ficha de demostración incrustada en el código, no la cuenta que
había entrado. Lo mismo pasaba en Preferencias, Visibilidad, «Te interesan»,
Comunidad, el detalle de un evento (con un evento real daba 404), el detalle
de afinidad y la firma de tus publicaciones en un grupo.

- Nuevo `useCurrentMember()` en `app-core`: una sola forma para la demo y la
  API real (`/auth/me` + `/profiles/me/preview`), con completitud y la
  sugerencia siguiente traducida a palabras de la persona.
- Hooks nuevos que faltaban para que esas pantallas escriban de verdad:
  `useUpdatePreferences`, `useUpdateProfile`, `useSetOroBadge`,
  `useSetTravelMode` (con selector de ciudad), `useWhoViewedMe`,
  `usePauseProfile`.
- Perfil lee verificaciones, plan, fotos y completitud reales; Preferencias
  y Visibilidad parten de lo guardado y lo escriben en la API (Descubrir se
  regenera); «Te interesan» usa el conteo real y no inventa nombres cuando
  el plan no permite ver quiénes; Comunidad lista los grupos reales y el
  muro de oración real; el detalle de evento usa la agenda, guarda la
  asistencia, descarga el .ics y comparte el enlace público.

### La web usa la pantalla
- Contenido **centrado** a la derecha del riel, hasta 1400 px de ancho útil
  (antes ~1000 px pegados al riel: la mitad derecha de una pantalla de 1920
  quedaba vacía).
- Descubrir a tres tarjetas por fila; Eventos con la lista a dos columnas y
  el mapa fijo a la derecha; detalle de evento con la ficha a la izquierda y
  la asistencia a la derecha; afinidad con la firma a un lado y el desglose
  al otro; muro de oración a dos columnas; grupo con el redactor fijo y el
  muro al lado; Plus con fondo oscuro de borde a borde.
- Títulos de sección más grandes en escritorio; botones de guardar con
  ancho natural.

### Fotos y portadas
- Sin foto, la tarjeta de una persona lleva un degradado de **su** color (el
  del avatar) con su inicial al fondo, en vez de la silueta gris igual para
  todas.
- Cada tipo de encuentro tiene portada propia (velas, montañas, ondas,
  arcos, rayos…) en SVG: Inicio, Eventos, detalle y página pública.

Verificación: E2E Playwright completa; capturas a 1920 y 390 px de todas las
secciones; build en modo real contra la API local y recorrido como
`prueba@yugo.do` por las pantallas corregidas (perfil con su nombre, guardar
preferencias, evento real, grupo real).

## v0.8.0 — La web como web: escritorio de verdad y diagnóstico de conexión

### Escritorio
La web se veía como un teléfono estirado: una columna de 670 px en el centro
de una pantalla de 1440. Ahora usa el ancho como una aplicación web, sin
tocar la experiencia del teléfono:

- **Entrar, crear perfil y recuperar contraseña** (`AuthLayout`): a la
  izquierda qué es Yugo (la promesa, el devocional de hoy, las tres cosas que
  lo distinguen), a la derecha el formulario en un ancho de lectura.
- **Conexiones** con lista y conversación lado a lado (≥1280 px), con la fila
  activa resaltada y un estado vacío que invita a elegir una conversación. En
  el teléfono sigue el flujo lista → chat.
- **Perfil** en dos columnas (quién soy y cómo voy / ajustes) y **Comunidad**
  con las tarjetas a dos columnas.
- Todas las secciones se abren a ~1000 px; lo que se lee con calma
  (devocional, oración, Plus, textos legales) se queda en columna de lectura.

### «No se pudo conectar con el servidor»
El primer despliegue real lo dejó claro: la web llegó a producción apuntando
a `https:///v1` porque `NEXT_PUBLIC_API_URL` se hornea al construir y la
referencia de Railway quedó vacía; la única salida era otro build. Tres
cambios para que no vuelva a pasar:

- **`API_URL` en tiempo de ejecución.** El servidor web la lee al servir cada
  página y la deja en `window.__YUGO_API_URL__`; el cliente la prefiere sobre
  la horneada. Cambiarla en Railway surte efecto al reiniciar, sin
  reconstruir. Las páginas pasan a servirse dinámicas.
- **La API acepta cualquier origen.** Autentica solo con tokens Bearer, así
  que CORS no era una frontera de seguridad y `WEB_URL` mal puesta solo
  producía «no carga nada». Además, `trust proxy` para que el límite de
  intentos de entrada cuente por persona y no por el proxy de Railway (antes
  era un único contador para todos).
- **La API espera a Postgres.** `start.mjs` reintenta las migraciones hasta
  dos minutos mientras el error sea de conectividad (P1001); antes moría en el
  primer segundo si la base arrancaba después, y Railway la marcaba «Crashed».

La pantalla de entrar, ante un fallo de red, muestra la dirección con la que
la web intentó conectar y enlaza a **`/estado`**, que prueba desde el
navegador si la web llega a la API, dice de dónde salió la dirección
(`API_URL`, build o ninguna) y separa los casos con el paso concreto para cada
uno. No expone nada sensible: la URL de la API es pública por definición.

Verificación: E2E Playwright completa, capturas a 1440 px y 390 px de entrar,
registro, conexiones, chat, perfil, comunidad, inicio, eventos y descubrir.

## v0.7.0 — Explorar sin cuenta, panel y portal reales, cuenta de prueba

### Auditoría contra la API real: lo que la demo tapaba
Se recorrieron las 48 rutas de la web en Chromium con sesión de miembro, de
staff y anónima contra la API de verdad (no fixtures). Lo que apareció y se
corrigió:

- **El chat no abría en producción.** La lista de conexiones enlazaba con el
  `matchId` y la API solo aceptaba el id de la conversación: 404 en todas las
  conversaciones. Ahora la lista usa el id correcto y la API acepta cualquiera
  de los dos (la app móvil y los enlaces de notificación también los mezclan).
- **El tablero admin mostraba cifras inventadas a cualquiera.** `/admin` no
  llamaba a la API: 4.812 miembros activos en un piloto de 40, y un miembro
  común veía la cáscara del panel. Ahora hay una puerta por rol (`StaffGate`)
  y el tablero lee `/admin/dashboard`.
- **El portal de iglesias era de utilería.** Portada, eventos y «nuevo evento»
  vivían de fixtures (con errores de hidratación de React por las fechas de
  demo) y nadie comprobaba a qué iglesia pertenece quien entra. Ahora
  `ChurchGate` pregunta a `/church-portal/me`: sin sesión, a entrar; sin
  iglesia vinculada, el formulario para registrarla; con iglesia pendiente,
  aviso claro. Portada y eventos leen el portal real; «nuevo evento» crea de
  verdad (ciudad con coordenadas, cupo, público, costo) y respeta el flujo
  borrador → revisión → publicado.
- `/events/featured` devolvía filas crudas (ya corregido en 0.6.0); el mismo
  patrón se corrigió en `/church-portal/events`, que ahora devuelve un resumen
  limpio.

### Explorar sin cuenta
Desde la bienvenida, «Explorar sin cuenta ›» abre `/explorar`: el devocional
del día, los próximos encuentros publicados, las historias, los grupos que
existen y cómo funciona Descubrir, explicado con una tarjeta de ejemplo
marcada como ilustración. **Ningún dato de una persona real sale por ahí**:
los endpoints públicos nuevos (`/devocional/publico`, `/events/publicos`,
`/community/groups/publicos`) devuelven texto y conteos, nunca perfiles ni
reflexiones. «Entrar» y «Crear mi perfil» están siempre a la vista. Además,
`/e/:id` existe por fin: es la página a la que apuntaba el enlace para
compartir un evento que la API genera desde el primer día.

### Cuenta de prueba con un mundo alrededor
`prueba@yugo.do` / `Yugo.prueba1` llega con lo que una cuenta nueva no tiene:
tres conexiones en etapas distintas (una nueva de hoy, una conversación con
mensajes sin leer, una amistad intencional con una propuesta de noviazgo
esperando respuesta), tres personas que marcaron interés, un perfil guardado,
un evento al que va con una conexión, constancia en el devocional con una
reflexión, una petición de oración acompañada por cinco personas y
notificaciones. Todo idempotente. Con `SEED_ON_BOOT=always` la API reaplica
la semilla en cada despliegue del piloto, así los datos de prueba nuevos
llegan solos; con `true` solo siembra la primera vez.

## v0.6.0 — Listo para Railway, y la app validada antes del APK

### Lo que hacía falta para desplegar, y no estaba
- **La API no podía migrar en producción.** `prisma` era dependencia de
  desarrollo; la imagen de producción se instala con `--prod` y el CLI no
  existía. Ahora es dependencia y el contenedor arranca con
  `prisma migrate deploy && node dist/main.js`: no hay que correr nada a mano.
- **La API ignoraba `PORT`.** Railway inyecta `PORT`; la API leía solo
  `API_PORT`. Ahora `PORT` manda. Verificado arrancando con `PORT=4100` y
  recibiendo `/v1/health` en ese puerto.
- `railway.json` por servicio (Dockerfile, healthcheck, reinicio) y
  `docs/RAILWAY.md` con los pasos exactos, la tabla de variables y la tabla de
  «cuando algo falla». El punto que más se va a tropezar: la plantilla estándar
  de Postgres de Railway **no trae PostGIS**, y la primera migración lo exige;
  la guía despliega `postgis/postgis:16-3.4` como servicio con volumen.

Lo que este entorno no puede hacer y queda dicho: no hay token de Railway ni de
Expo aquí. Todo está preparado y verificado; el despliegue y el build los lanza
quien tenga las cuentas, con los comandos de las guías.

### La app real en un navegador real, y lo que salió de ahí
La pregunta era «¿el APK abre sin cerrarse?». Sin teléfono, emulador (no hay
KVM) ni SDK de Android (la descarga está bloqueada), se hizo lo más cercano:

- **`pnpm --filter @yugo/mobile test:web`.** Exporta el bundle de Metro para
  web con React Native Web —el mismo código que va al APK, con expo-router,
  React Query y los stores de verdad, sin ninguna simulación— y lo abre en
  Chromium con viewport de teléfono. Recorre las 32 rutas y un flujo con
  toques: entrar, leer el devocional, Descubrir, guardar, afinidad, marcar
  interés, Conexiones, abrir el chat, enviar un mensaje, las cinco pestañas.
  Resultado: 45 pasos sin un solo error de JavaScript ni pantalla en blanco.
- **`expo prebuild --platform android`** genera el proyecto nativo completo
  (Hermes activado, `do.yugo.app`, permisos de cámara y notificaciones). Es el
  primer paso que EAS ejecuta y donde fallan los plugins mal configurados.
- El bundle de Android que produce `expo export` es **bytecode de Hermes**
  (versión 96), compilado por el mismo `hermesc` que usa el APK.

Lo que apareció y se corrigió:

- **Ruta inexistente en inglés.** Un enlace o una notificación a algo borrado
  mostraba la página por defecto de expo-router («Unmatched Route»). Ahora
  hay `+not-found` en español con un botón al inicio.
- **`useFontScale` escuchaba un evento que no existe.** `AccessibilityInfo`
  no emite `change`; el listener nunca disparaba y en Jest producía un error
  intermitente al desmontar. Ahora relee la escala al volver al primer plano.
- **La lista de Eventos usaba la zona horaria del teléfono** y el detalle la
  de República Dominicana: para un dominicano fuera del país, «SÁB 5» arriba y
  «viernes» abajo para el mismo evento. Las dos formatean en `APP_TIMEZONE`.
- `expo-system-ui` instalado: `userInterfaceStyle: light` no se aplicaba en
  Android sin él (lo avisaba el prebuild).

### La primera entrada real a la web, y lo que enseñó
Con la API ya arriba en Railway, la web «entraba» sin pedir credenciales y se
quedaba en «Cargando…». Tres defectos que la demo tapaba, corregidos y
verificados en Chromium contra una API real (modo sin demo):

- **«Ya tengo cuenta» enlazaba a `/inicio`**, no a `/entrar`, y la zona de
  miembros no comprobaba la sesión: cada pantalla disparaba peticiones que
  volvían 401. Ahora hay una puerta de sesión (`SessionGate`) que manda a
  `/entrar?next=/ruta` y vuelve a esa ruta después de entrar.
- **`GET /events/featured` devolvía filas crudas** en vez de `EventSummary`:
  Inicio leía `connectionsGoing.length` y se caía con «Application error» en
  la primera entrada real. Ahora reutiliza la agenda (mismo formato, con
  `myStatus` y conexiones que asisten). La suite de humo comprueba el contrato.
- **Los errores se mostraban como «Cargando…»**: Inicio mezclaba «cargando»
  con «falló». Ahora hay estado de error con «Reintentar», y un aviso en la
  cáscara de la app cuando la API no responde que incluye la URL configurada,
  porque el error más común en un despliegue nuevo es una URL mal puesta.
- Detalle que salió en la misma prueba: una contraseña incorrecta decía «Tu
  sesión expiró». El código de error conocido manda sobre el estado 401.

### El primer build real en Railway, y lo que enseñó
Los dos Dockerfiles fallaron en su primera construcción de verdad, como se
había avisado que podía pasar:

- **API:** copiaba `node_modules/.prisma` desde la etapa de build, pero con
  pnpm el cliente generado vive en `node_modules/.pnpm/@prisma+client@<v>/…`
  («not found»). Ahora la etapa de producción corre `prisma generate` ella
  misma; el CLI ya es dependencia de producción.
- **Web:** la etapa de dependencias no incluía `@yugo/app-core`, del que la
  web depende para hooks y estado («Can't resolve '@yugo/app-core'»). Ahora
  se instala, se compila después de `shared` y su `dist` va a la imagen final.

Las dos correcciones se verificaron reproduciendo cada etapa fuera de Docker
con exactamente los mismos `COPY`: instalación parcial del workspace con el
lockfile congelado, compilación de los paquetes y `next build` completo (51
páginas) para la web; instalación solo de producción, `prisma generate` y
carga de `@prisma/client` para la API.

### Primer arranque sin manos: la API siembra si la base está vacía
Con `SEED_ON_BOOT=true`, el contenedor corre `prisma/seed-if-empty.ts` tras
las migraciones: si no hay denominaciones, siembra el catálogo y los datos de
demo; si hay una sola fila, no toca nada aunque la variable siga puesta. Es lo
que evita exponer Postgres o correr la semilla desde otra máquina para poner
el sistema en marcha. Probado contra una base recién creada (siembra), la
misma base otra vez (no siembra) y sin la variable (no se ejecuta). `tsx` pasa
a dependencia de producción por esto.

### Desplegar y generar el APK desde GitHub, con un secreto y un clic
Para que no haga falta instalar nada en una máquina propia:

- **`.github/workflows/railway.yml`.** Despliega API y web con la CLI de
  Railway. Corre en cada push a `main` que toque `apps/api`, `apps/web` o
  `packages`, y a mano desde Actions eligiendo qué servicio. Necesita el
  secreto `RAILWAY_TOKEN`; si falta, se detiene en el primer paso con el
  mensaje de dónde crearlo. Si el repo tiene la variable `RAILWAY_API_URL`,
  espera a que `/v1/health` responda `ok` antes de dar el trabajo por bueno.
- **`.github/workflows/apk.yml`.** Lanza el build de Android en EAS con el
  perfil elegido (`preview`, `preview-demo`, `production`). Antes de gastar
  cuota de EAS repite aquí lo barato: tipos, las 32 pantallas montándose sin
  lanzar y el bundle de Android. Necesita `EXPO_TOKEN` y que alguien haya
  corrido `eas init` una vez. El enlace para seguir el build y descargar el
  APK queda en el resumen del trabajo.
- **`.dockerignore` en la raíz.** Los Dockerfiles se construyen desde la raíz
  del monorepo y sin él el contexto arrastraba `node_modules` (1.1 GB) y
  cualquier `.env` local. Lo primero hacía lento cada despliegue; lo segundo
  podía meter una credencial en una capa de imagen.

Se intentó construir las dos imágenes en este entorno para verificarlas: el
daemon de Docker arranca, pero la política de salida bloquea el CDN de Docker
Hub (403 al bajar `node:22-alpine`), así que **el primer despliegue en Railway
es la primera construcción real de las imágenes**. Los Dockerfiles se
revisaron paso a paso contra el lockfile y los scripts de cada paquete, y la
guía tiene la tabla de síntomas por si algo se tropieza.

### La app móvil, validada sin dispositivo
No hay emulador ni SDK de Android en CI ni en este entorno (la descarga del SDK
está bloqueada), así que se construyó lo más parecido a abrir la app en un
teléfono:

- **`expo export` del bundle de Android.** En la primera corrida falló:
  faltaba `@babel/runtime`, que pnpm no expone a la app aunque Metro lo
  necesita. Eso habría roto el build en EAS. Añadido; el bundle compila
  (3.4 MB, un solo archivo).
- **Dos copias de React en el APK.** `@yugo/app-core` resolvía `react` 18.3.1
  desde su propio `node_modules` y la app usa 18.2.0 (la que exige React
  Native 0.74). Metro, con búsqueda jerárquica, empaquetaba las dos: es un
  «Invalid hook call» al abrir la app. `metro.config.js` fuerza ahora una sola
  copia de `react`, `react-native`, `@tanstack/react-query` y `zustand`, las
  cuatro que guardan estado en contextos de React.
- **Cada pantalla se monta sin lanzar.** Suite Jest (`apps/mobile/__tests__`)
  que descubre las 32 rutas bajo `app/`, las monta con los proveedores de
  producción (React Query, caché offline, push) y falla si alguna lanza o
  escribe un error de React en consola. Corre dos veces: en modo demo, y con
  `YUGO_TEST_LIVE=1` **sin sesión contra la API real** (todo responde 401 y la
  app tiene que quedarse en pie). 33/33 en las dos.
- `eas.json` con tres perfiles: `preview` (APK contra la API), `preview-demo`
  (APK con fixtures) y `production` (AAB). Pasos en `docs/STORE_RELEASE.md`.
- CI corre `expo export` en el trabajo `verify`.

### Lo que el escáner de secretos aprendió
La guía de Railway trae `postgresql://yugo:<pass>@…` como ejemplo y el escáner
lo atrapó como contraseña. Es un marcador, no una clave: la regla reconoce ahora
`<así>` y `${ASÍ}` y el auto-test lo fija (17/17). Que disparara por un ejemplo
es la prueba de que está mirando.

### Verificación
- 120 pruebas en `@yugo/shared`, 179 en la API, **33 en la app** (nuevas),
  290 E2E, escaneo de secretos 17/17.
- Suite de humo contra API y PostgreSQL reales: **130/130** con la API
  recompilada.

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
