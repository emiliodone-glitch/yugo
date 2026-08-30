
YUGO
Unidos en la misma fe
Documento de requerimientos del producto
Plataforma de citas con propósito, comunidad y eventos para cristianos de distintas denominaciones
App móvil  ·  Web  ·  Panel administrativo  ·  Portal de iglesias

Versión: 1.1 (MVP)
Fecha: 29 de agosto de 2026
Preparado por: Emilio Doñe
Estado: Borrador para validación

Contenido



1. Resumen ejecutivo
Yugo es una plataforma digital que ayuda a personas cristianas solteras a conocer parejas que comparten su fe, y a integrarse en una comunidad de creyentes de distintas denominaciones. El nombre proviene de la exhortación bíblica a no unirse "en yugo desigual" (2 Corintios 6:14), un principio ampliamente reconocido entre cristianos al momento de elegir pareja.
El problema que resuelve es concreto: los cristianos que quieren formar una relación con propósito de matrimonio tienen pocas opciones digitales que respeten sus valores. Las apps de citas generalistas están diseñadas para el consumo rápido de perfiles y el encuentro casual; Yugo está diseñada para la intención, la verificación y la vida en comunidad.
El producto se compone de cuatro piezas que comparten un mismo backend:
App móvil (iOS y Android): la experiencia principal para los usuarios: perfil, descubrimiento con afinidad de fe, conexiones, chat, comunidad y eventos.
Web de usuario: versión responsive con las mismas funciones, pensada para quien prefiere usar computadora.
Panel administrativo: gestión de usuarios, verificaciones, moderación, iglesias, eventos, contenido, suscripciones y configuración del algoritmo.
Portal de iglesias y ministerios: acceso web para que congregaciones registradas publiquen eventos, gestionen su grupo oficial y validen a sus miembros.
El modelo de negocio es freemium con dos niveles de suscripción: uso gratuito con límites diarios de interés, Yugo Plus con funciones ampliadas, y Yugo Oro, un nivel superior con modo invisible (el perfil solo lo ven las personas a quienes el miembro marca interés), prioridad y herramientas exclusivas.
2. Visión, principios y posicionamiento
2.1 Visión
Ser el espacio digital de referencia en República Dominicana y Latinoamérica donde los cristianos encuentran pareja, comunidad y propósito, con la confianza de que quien está al otro lado comparte su fe.
2.2 Principios de diseño del producto
Estos principios gobiernan cada decisión funcional y visual. Cuando exista duda sobre una funcionalidad, se resuelve a favor de ellos.
Principio
Qué significa en el producto
Intención sobre volumen
Límite diario de "intereses", perfiles con testimonio y propósito declarado, sin mecánicas de deslizar infinito.
Verificación como base de la confianza
Tres niveles de verificación (identidad, selfie, referencia de iglesia) visibles en cada perfil.
Comunidad antes que pareja
Grupos, eventos y actividades permiten conocerse en contexto, no solo uno a uno.
Respeto y pureza del ambiente
Pacto de conducta obligatorio, moderación asistida por IA y humana, sin contenido sugerente.
Interdenominacional con respeto
Se declaran denominación y apertura; el algoritmo respeta las preferencias sin imponerlas.
Solo adultos
Registro estrictamente para mayores de 18 años, con validación de fecha de nacimiento y verificación de identidad.
Rango de edad como regla, no sugerencia
Un miembro solo ve y es visto por personas dentro de su rango de edad declarado, y la compatibilidad debe ser mutua.

2.3 Diferenciación frente a apps existentes
Aspecto
Apps de citas generalistas
Yugo
Mecánica central
Deslizar perfiles sin límite
Intereses limitados por día con puntaje de afinidad de fe
Confianza
Verificación opcional por foto
Verificación por iglesia o líder, insignia visible
Contexto social
Uno a uno únicamente
Grupos, eventos de iglesias, actividades en comunidad
Conversación
Chat libre desde el primer match
Rompehielos guiados y reglas de chat progresivas
Moderación
Reactiva por reportes
Preventiva: IA de texto e imagen + revisión humana + pacto de conducta

3. Alcance del MVP
3.1 Incluido en el MVP
Registro, verificación en tres niveles y perfil completo con dimensión de fe.
Descubrimiento de perfiles con puntaje de afinidad de fe y filtros.
Intereses diarios limitados, conexiones mutuas y chat con rompehielos guiados.
Comunidad: grupos por interés y ministerio, muro de grupo moderado.
Eventos: publicados por iglesias y ministerios verificados, con asistencia y mapa.
Seguridad: pacto de conducta, reportes, bloqueos, moderación asistida por IA.
Modelo freemium con suscripción Yugo Plus (pagos con tarjeta local e internacional, y tiendas de apps).
Panel administrativo web completo y portal de iglesias.
3.2 Fuera del MVP (fases posteriores)
Videollamadas dentro de la app.
Bolsa de oportunidades laborales y servicios entre miembros de la comunidad.
Programa de mentoría o acompañamiento prematrimonial con consejeros.
Devocionales diarios y planes de lectura compartidos en pareja.
Expansión a otros países con soporte multimoneda.
4. Usuarios y roles
Rol
Descripción
Canal
Miembro
Persona cristiana mayor de 18 años que busca pareja y/o comunidad. Puede ser gratuito o Plus.
App móvil / Web
Iglesia / Ministerio
Organización verificada que publica eventos, administra su grupo oficial y emite códigos de verificación a sus miembros.
Portal web
Moderador
Revisa reportes, contenido marcado por IA y verificaciones de selfie.
Panel admin
Gestor de comunidad
Aprueba iglesias, grupos y eventos; gestiona contenido destacado.
Panel admin
Soporte
Atiende tickets, restablece accesos, gestiona reembolsos con aprobación.
Panel admin
Finanzas
Consulta suscripciones, pagos, conciliación y reportes de ingresos.
Panel admin
Superadministrador
Control total: roles, configuración del algoritmo, parámetros del freemium, auditoría.
Panel admin

4.1 Perfiles de usuario objetivo
Joven adulto (22–32): activo en su iglesia, busca relación seria pero no encuentra opciones en su congregación. Usa la app a diario, valora los eventos y grupos.
Adulto establecido (33–45): profesional, a veces con hijos, con poco tiempo para socializar. Valora la verificación y los filtros de intención.
Líder o pastor de jóvenes: no busca pareja; usa el portal para publicar eventos, respaldar a sus miembros y crear el grupo oficial de su ministerio.

5. Arquitectura del ecosistema
Las cuatro piezas comparten una única API y base de datos. Esto garantiza que un evento publicado desde el portal de una iglesia aparezca de inmediato en la app, y que una acción de moderación en el panel se refleje en tiempo real.
Componente
Tecnología propuesta
Responsabilidad
App móvil
React Native (Expo), TypeScript
Experiencia principal del miembro. Notificaciones push, geolocalización, cámara para verificación.
Web de usuario
Next.js, TypeScript, Tailwind
Misma funcionalidad del miembro en navegador; responsive.
Panel admin + Portal iglesias
Next.js (misma base, rutas y permisos separados)
Operación del negocio, moderación, gestión de organizaciones.
API
NestJS, Prisma, REST + WebSockets
Lógica de negocio, matching, chat en tiempo real, pagos, moderación.
Base de datos
PostgreSQL + PostGIS
Datos transaccionales y consultas geográficas (cercanía, eventos).
Cache y colas
Redis + BullMQ
Sesiones, límites diarios, colas de moderación y notificaciones.
Almacenamiento
S3 compatible (Cloudflare R2 o AWS S3)
Fotos de perfil y eventos con URLs firmadas.
Moderación IA
API de Claude (texto) + servicio de moderación de imágenes
Clasificación previa de mensajes, bios y fotos antes de revisión humana.
Push
Firebase Cloud Messaging / APNs
Notificaciones de conexiones, mensajes, eventos.
Pagos
Azul o CardNET (RD), Stripe (internacional), App Store y Google Play
Suscripciones Yugo Plus con conciliación en el panel.
Infraestructura
Docker, GitHub Actions, despliegue en VPS o Railway/Render
CI/CD con ambientes dev, staging y producción.

5.1 Diagrama lógico
[App móvil] ─┐
[Web usuario] ─┼─► [API NestJS] ─► [PostgreSQL/PostGIS]
[Panel admin] ─┤        │  ├──► [Redis / colas]
[Portal iglesia]┘       │  ├──► [S3: fotos]
                        │  └──► [Moderación IA]
                        └──► [Pagos: Azul / Stripe / tiendas]

6. Módulos y requerimientos funcionales
Cada requerimiento tiene un código único (RF-MMM-NN), donde MMM identifica el módulo. Prioridad: Alta (MVP obligatorio), Media (MVP deseable), Baja (fase posterior).
6.1 Módulo AUT — Registro, autenticación y pacto de conducta
Código
Requerimiento funcional
Prioridad
RF-AUT-01
Registro con correo electrónico o número de teléfono, con verificación por código OTP.
Alta
RF-AUT-02
Inicio de sesión con Google y Apple (obligatorio para publicación en App Store).
Alta
RF-AUT-03
Validación de mayoría de edad: fecha de nacimiento obligatoria; el sistema rechaza menores de 18 años y registra el intento.
Alta
RF-AUT-04
Aceptación explícita del Pacto de conducta y de los Términos y Política de privacidad antes de crear el perfil, con registro de fecha y versión aceptada.
Alta
RF-AUT-05
Recuperación de contraseña por correo o SMS.
Alta
RF-AUT-06
Sesiones con tokens de acceso y refresco; cierre de sesión remoto en todos los dispositivos.
Alta
RF-AUT-07
Autenticación de dos factores opcional para el miembro y obligatoria para roles administrativos.
Media
RF-AUT-08
Pausar la cuenta (ocultar perfil sin perder datos) y eliminar la cuenta con período de gracia de 14 días.
Alta

6.2 Módulo PER — Perfil del miembro
El perfil tiene dos dimensiones: la personal (quién soy) y la de fe (cómo vivo mi fe). La segunda es lo que hace único al producto y alimenta el puntaje de afinidad.
Código
Requerimiento funcional
Prioridad
RF-PER-01
Datos básicos: nombre, edad (calculada), género, ciudad y provincia, ocupación, nivel educativo.
Alta
RF-PER-02
Entre 2 y 6 fotos; la primera pasa por moderación automática de imagen antes de publicarse.
Alta
RF-PER-03
Dimensión de fe: denominación (catálogo administrable), iglesia a la que asiste (selección de iglesias registradas o texto libre), años en la fe, frecuencia de asistencia.
Alta
RF-PER-04
Testimonio breve (hasta 600 caracteres) y versículo favorito (referencia).
Alta
RF-PER-05
Prácticas y áreas de servicio: oración, estudio bíblico, ayuno, alabanza, misiones, servicio social, jóvenes, niños, medios, etc. (selección múltiple).
Alta
RF-PER-06
Intención declarada: "Relación con propósito de matrimonio", "Amistad y comunidad", "Ambas". Visible en el perfil.
Alta
RF-PER-07
Apertura interdenominacional: "Solo mi denominación", "Denominaciones afines", "Abierto a todas".
Alta
RF-PER-08
Preferencias de búsqueda: rango de edad (obligatorio, con valores por defecto de −5/+7 años ajustables), distancia máxima, intención, con hijos o sin hijos, nivel de verificación mínimo.
Alta
RF-PER-09
Preguntas de conversación ("Lo que más agradezco a Dios este año…") con respuestas cortas, para dar contexto a los rompehielos.
Media
RF-PER-10
Indicador de completitud del perfil con sugerencias; perfiles con menos del 60% no aparecen en Descubrir.
Alta
RF-PER-11
Vista previa "así te ven los demás".
Media

6.3 Módulo VER — Verificación en tres niveles
Nivel
Cómo se obtiene
Qué muestra
Nivel 1 · Contacto
Correo o teléfono verificado por OTP.
Requisito mínimo para usar la app.
Nivel 2 · Identidad
Selfie en vivo con gestos aleatorios comparada con las fotos del perfil; revisión por moderador en casos dudosos.
Insignia "Identidad verificada".
Nivel 3 · Iglesia
Código emitido por una iglesia registrada, o confirmación de un líder desde el portal.
Insignia "Respaldado por su iglesia" con el nombre de la congregación.

Código
Requerimiento funcional
Prioridad
RF-VER-01
Flujo de selfie en vivo con instrucciones (girar, sonreír) y detección básica de vida; resultado automático o cola de revisión.
Alta
RF-VER-02
Códigos de verificación de iglesia: generados por el portal, de un solo uso, con vencimiento de 30 días.
Alta
RF-VER-03
Solicitud de respaldo a un líder: el miembro ingresa el correo del líder; el líder recibe un enlace y confirma o rechaza.
Media
RF-VER-04
Las insignias son visibles en tarjetas de Descubrir, perfil y chat; se pueden usar como filtro.
Alta
RF-VER-05
Revocación de verificación por moderador con motivo registrado; el miembro es notificado.
Alta

6.4 Módulo DES — Descubrir y afinidad de fe
Descubrir presenta una lista curada de perfiles ordenados por afinidad, no un mazo infinito. El miembro ve la puntuación de afinidad y sus componentes, lo que le permite entender por qué se le sugiere a alguien.
Código
Requerimiento funcional
Prioridad
RF-DES-01
Lista diaria de perfiles sugeridos (máximo 30 por día) ordenados por puntaje de afinidad y frescura.
Alta
RF-DES-02
Puntaje de afinidad de fe (0–100) calculado con pesos configurables desde el panel (ver sección 7).
Alta
RF-DES-03
Desglose del puntaje en el perfil: denominación, intención, prácticas y valores, cercanía, edad.
Alta
RF-DES-04
Acciones: "Me interesa" (consume un interés diario), "Pasar", "Guardar para después".
Alta
RF-DES-05
Límite de intereses diarios: 8 para cuenta gratuita, ilimitados en Plus; contador visible y reinicio a medianoche local.
Alta
RF-DES-06
Filtros: edad, distancia, denominación, intención, nivel de verificación, con hijos, ciudad. Filtros avanzados (áreas de servicio, iglesia específica, educación) solo en Plus.
Alta
RF-DES-07
Mensaje de interés opcional (hasta 140 caracteres) al marcar "Me interesa"; el destinatario lo ve antes de responder.
Media
RF-DES-08
Exclusiones automáticas: bloqueados, reportados por el usuario, perfiles pausados, incompatibilidad de género según preferencia.
Alta
RF-DES-09
Sección "Te interesa a…" con cantidad visible para gratuito y perfiles visibles en Plus.
Alta
RF-DES-10
"Perfil destacado": aparece en las primeras posiciones de Descubrir de perfiles compatibles durante 24 horas. Plus: una vez por semana; Oro: tres veces por semana.
Media
RF-DES-11
Filtro estricto y mutuo de edad: un perfil A aparece a un miembro B únicamente si la edad de A está dentro del rango declarado por B y la edad de B está dentro del rango declarado por A. No es un filtro opcional; ningún nivel de suscripción lo desactiva.
Alta
RF-DES-12
Modo invisible (Oro): el perfil no aparece en Descubrir de nadie ni en "Te interesa a…"; solo se vuelve visible para las personas a quienes el miembro marca interés, y para sus conexiones existentes.
Alta
RF-DES-13
Deshacer "Pasar" (Oro): recuperar el último perfil descartado, hasta 5 veces por día.
Media
RF-DES-14
Modo viaje (Oro): cambiar temporalmente la ubicación de búsqueda a otra ciudad o país (útil para la diáspora dominicana), respetando el resto de reglas.
Media
RF-DES-15
Quién vio mi perfil (Oro): lista de miembros que abrieron el perfil en los últimos 30 días.
Media

6.5 Módulo CON — Conexiones y chat
Una conexión existe solo cuando el interés es mutuo. El chat está diseñado para conversar con propósito: inicia con rompehielos, no permite imágenes en el MVP y aplica reglas progresivas.
Código
Requerimiento funcional
Prioridad
RF-CON-01
Creación automática de conexión cuando dos miembros se marcan interés mutuamente; notificación a ambos.
Alta
RF-CON-02
Lista de conexiones con último mensaje, indicador de no leído y estado de verificación del otro miembro.
Alta
RF-CON-03
Chat en tiempo real (WebSockets) con estados de entregado y leído, indicador de escribiendo, y mensajes de texto y emojis.
Alta
RF-CON-04
Rompehielos guiados: al abrir una conexión nueva, se sugieren 3 preguntas basadas en el perfil del otro ("Vi que sirves en alabanza, ¿cómo llegaste ahí?").
Alta
RF-CON-05
Sin envío de imágenes ni archivos en el chat durante el MVP; intercambio de contacto es decisión de las partes.
Alta
RF-CON-06
Moderación previa de mensajes: la IA clasifica lenguaje sexual, ofensivo, solicitud de dinero o estafa; mensajes de alto riesgo se retienen y van a revisión.
Alta
RF-CON-07
Reportar y bloquear desde el chat con categorías (contenido inapropiado, sospecha de estafa, identidad falsa, acoso, no es cristiano/perfil engañoso).
Alta
RF-CON-08
Deshacer conexión (desconectar) con confirmación; la conversación deja de ser visible para ambos.
Alta
RF-CON-09
Conexiones inactivas por 30 días muestran un recordatorio suave; en Plus se pueden archivar.
Baja
RF-CON-10
Sugerencia "Invitar a un evento": desde el chat se puede compartir un evento de la agenda para asistir juntos.
Media

6.6 Módulo COM — Comunidad y grupos
Los grupos permiten que la gente se conozca en contexto: por interés, ministerio, ciudad o iglesia. Un grupo puede ser abierto, con aprobación, u oficial de una iglesia registrada.
Código
Requerimiento funcional
Prioridad
RF-COM-01
Catálogo de grupos con categorías administrables: Jóvenes adultos, Alabanza, Misiones, Estudio bíblico, Deportes, Emprendimiento, Servicio social, Profesionales, por ciudad.
Alta
RF-COM-02
Crear grupo (cualquier miembro verificado nivel 2): nombre, descripción, portada, categoría, ciudad, tipo (abierto / con aprobación); pasa por aprobación de gestor de comunidad.
Alta
RF-COM-03
Grupos oficiales de iglesia: creados desde el portal, con insignia y administrados por la iglesia.
Alta
RF-COM-04
Muro del grupo: publicaciones de texto y una imagen, comentarios, reacciones (amén, oro por esto, me gusta).
Alta
RF-COM-05
Peticiones de oración dentro del grupo con contador de "estoy orando" y opción de marcar como respondida.
Media
RF-COM-06
Actividades del grupo: encuentros con fecha, lugar y lista de asistencia (versión ligera de evento).
Alta
RF-COM-07
Roles de grupo: administrador, moderador, miembro; expulsión y silenciado.
Alta
RF-COM-08
Toda publicación pasa por moderación automática; los administradores de grupo reciben reportes de su grupo.
Alta
RF-COM-09
Descubrir grupos sugeridos según perfil (denominación, ciudad, áreas de servicio).
Media

6.7 Módulo EVE — Eventos de iglesias y ministerios
Código
Requerimiento funcional
Prioridad
RF-EVE-01
Publicación de eventos por iglesias y ministerios verificados desde el portal: título, descripción, tipo (culto especial, vigilia, retiro, concierto, congreso, actividad social, servicio comunitario), fecha y hora, lugar geolocalizado, aforo opcional, imagen, costo o gratuito, enlace externo.
Alta
RF-EVE-02
Aprobación por gestor de comunidad antes de publicarse (configurable: iglesias con historial pueden publicar directo).
Alta
RF-EVE-03
Agenda de eventos en la app: lista y mapa, filtros por fecha, tipo, distancia y denominación.
Alta
RF-EVE-04
Marcar "Asistiré" o "Me interesa"; el evento aparece en la agenda personal con recordatorio push 24 h antes.
Alta
RF-EVE-05
Ver quiénes de mis conexiones y grupos asistirán (respetando privacidad: solo si el miembro lo permite).
Media
RF-EVE-06
Check-in en el evento mediante código QR mostrado por la iglesia; alimenta métricas del portal.
Media
RF-EVE-07
Eventos destacados en la pantalla principal, seleccionados por el gestor de comunidad.
Media
RF-EVE-08
Exportar evento al calendario del dispositivo y compartir enlace público.
Baja

6.8 Módulo SEG — Seguridad y moderación
Código
Requerimiento funcional
Prioridad
RF-SEG-01
Pacto de conducta: documento versionado y administrable; re-aceptación obligatoria cuando cambia.
Alta
RF-SEG-02
Pipeline de moderación: IA clasifica texto (bio, testimonio, mensajes, publicaciones) e imágenes; resultado: aprobar, retener para revisión, rechazar. Umbrales configurables.
Alta
RF-SEG-03
Sistema de reportes con categorías, evidencia (capturas del historial), prioridad automática y SLA de atención (24 h alta prioridad).
Alta
RF-SEG-04
Sanciones graduales: advertencia, suspensión temporal (3, 7, 30 días), expulsión permanente; con registro y notificación.
Alta
RF-SEG-05
Detección de patrones de estafa: mención de dinero, enlaces externos, solicitud de moverse a otra app en los primeros mensajes; alerta al moderador y aviso educativo al miembro.
Alta
RF-SEG-06
Consejos de seguridad al crear la primera conexión y antes de un primer encuentro (reunirse en público, avisar a alguien).
Media
RF-SEG-07
Privacidad: ocultar distancia exacta (mostrar rangos), ocultar perfil a contactos del teléfono (opcional), modo invisible en Yugo Oro (ver RF-DES-12).
Media
RF-SEG-08
Cumplimiento de la Ley 172-13 de protección de datos personales de RD: consentimiento, acceso, rectificación y eliminación.
Alta

6.9 Módulo PLU — Freemium, Yugo Plus y Yugo Oro
Existen dos niveles de suscripción con precio y alcance distintos. Yugo Plus amplía los límites; Yugo Oro añade control sobre la visibilidad, prioridad y herramientas exclusivas. Grupos y eventos son gratuitos en todos los niveles.
Función
Gratuito
Yugo Plus
Yugo Oro
Perfiles sugeridos por día
Hasta 30
Hasta 30 + refrescar lista
Hasta 60 + refrescar lista
Intereses por día
8
Ilimitados
Ilimitados
Ver quién te marcó interés
Solo cantidad
Perfiles completos
Perfiles completos
Filtros
Básicos
Básicos + avanzados
Avanzados + por iglesia o ministerio específico
Mensaje al marcar interés
No
Sí (140 caracteres)
Sí (300 caracteres)
Perfil destacado
No
1 por semana
3 por semana
Modo invisible (solo te ven a quienes marcas interés)
No
No
Sí
Posición preferente en Descubrir
No
No
Sí (siempre entre los primeros compatibles)
Deshacer "Pasar"
No
No
Hasta 5 por día
Quién vio mi perfil
No
No
Sí (30 días)
Modo viaje (buscar en otra ciudad o país)
No
No
Sí
Estadísticas del perfil (vistas, tasa de respuesta)
No
No
Sí
Verificación de identidad prioritaria
Cola normal
Cola normal
Revisión en menos de 4 horas
Reserva prioritaria en eventos con aforo
No
No
Sí
Insignia Oro en el perfil
No
No
Opcional (se puede ocultar)
Soporte
Estándar
Estándar
Prioritario
Grupos y eventos
Completo
Completo
Completo
Chat
Completo
Completo + archivar
Completo + archivar

Código
Requerimiento funcional
Prioridad
RF-PLU-01
Dos niveles de suscripción (Plus y Oro), cada uno con planes mensual, trimestral y anual y precios administrables en DOP y USD de forma independiente.
Alta
RF-PLU-02
Compra dentro de la app (App Store / Google Play) y por web con tarjeta (Azul/CardNET para RD, Stripe internacional).
Alta
RF-PLU-03
Estado de suscripción sincronizado entre canales; un solo estado por cuenta.
Alta
RF-PLU-04
Períodos de prueba y códigos promocionales (por ejemplo, para congregaciones aliadas).
Media
RF-PLU-05
Cancelación en cualquier momento; el acceso se mantiene hasta el fin del período pagado.
Alta
RF-PLU-06
Paywall contextual: se muestra en el momento en que el miembro toca un límite, con explicación clara del beneficio y comparación de los dos niveles.
Alta
RF-PLU-07
Cambio de nivel: subir de Plus a Oro con prorrateo del período restante; bajar de Oro a Plus aplica al final del período pagado.
Alta
RF-PLU-08
Modo invisible: activable y desactivable desde Privacidad; al vencer Oro se desactiva automáticamente con aviso previo de 3 días.
Alta
RF-PLU-09
Ninguna función de pago desactiva las reglas de seguridad, el filtro mutuo de edad ni la moderación.
Alta
RF-PLU-10
Los precios de referencia iniciales son: Plus RD$399/mes o RD$2,990/año; Oro RD$899/mes o RD$6,990/año (ajustables desde el panel).
Media

6.10 Módulo NOT — Notificaciones
Código
Requerimiento funcional
Prioridad
RF-NOT-01
Push y en app: nueva conexión, mensaje, alguien marcó interés (Plus: quién), evento próximo, actividad de grupo, resultado de verificación, aviso de moderación.
Alta
RF-NOT-02
Preferencias por categoría y horario silencioso.
Alta
RF-NOT-03
Correos transaccionales: bienvenida, verificación, recibo de pago, resumen semanal opcional.
Media

6.11 Módulo IGL — Portal de iglesias y ministerios
Código
Requerimiento funcional
Prioridad
RF-IGL-01
Registro de organización: nombre, denominación, dirección, pastor o responsable, documentos de respaldo, redes sociales. Aprobación por gestor de comunidad.
Alta
RF-IGL-02
Usuarios de la organización con roles (administrador, editor de eventos).
Alta
RF-IGL-03
Publicación y edición de eventos, con vista previa y estado (borrador, en revisión, publicado, finalizado).
Alta
RF-IGL-04
Gestión del grupo oficial: publicaciones, miembros, moderación propia.
Alta
RF-IGL-05
Generación de códigos de verificación por lote y consulta de miembros respaldados (sin exponer datos sensibles).
Alta
RF-IGL-06
Métricas: asistencias marcadas, check-ins, miembros del grupo, alcance de eventos.
Media

6.12 Módulo ADM — Panel administrativo
Código
Requerimiento funcional
Prioridad
RF-ADM-01
Tablero: usuarios activos diarios y mensuales, registros, verificaciones pendientes, conexiones creadas, mensajes, reportes abiertos, ingresos, eventos próximos.
Alta
RF-ADM-02
Gestión de miembros: búsqueda, ficha completa, historial de reportes y sanciones, suscripción, acciones (advertir, suspender, expulsar, restablecer, borrar).
Alta
RF-ADM-03
Cola de verificaciones nivel 2 con comparación de selfie y fotos, aprobación o rechazo con motivo.
Alta
RF-ADM-04
Cola de moderación unificada: reportes, contenido retenido por IA, apelaciones; asignación a moderadores, notas internas, decisiones con plantillas.
Alta
RF-ADM-05
Gestión de organizaciones: aprobación, edición, suspensión, usuarios del portal.
Alta
RF-ADM-06
Gestión de eventos y grupos: aprobación, destacar, editar, cerrar.
Alta
RF-ADM-07
Catálogos: denominaciones y matriz de afinidad entre ellas, categorías de grupos y eventos, áreas de servicio, motivos de reporte, versículos.
Alta
RF-ADM-08
Configuración del algoritmo: pesos del puntaje de afinidad, límites diarios por nivel (gratuito, Plus, Oro), rango de edad por defecto y amplitud mínima, umbrales de moderación, radio por defecto.
Alta
RF-ADM-09
Suscripciones y pagos: listado, estado, reembolsos con doble aprobación, conciliación por canal, exportación a Excel.
Alta
RF-ADM-10
Contenido: pacto de conducta, términos, textos de rompehielos, consejos de seguridad, banners de la pantalla principal.
Alta
RF-ADM-11
Roles y permisos granulares; 2FA obligatorio; bitácora de auditoría inmutable de toda acción administrativa.
Alta
RF-ADM-12
Reportes exportables: crecimiento, retención por cohorte, embudo gratuito a Plus, actividad por provincia y denominación.
Media

7. Reglas de negocio clave
7.1 Puntaje de afinidad de fe
El puntaje (0–100) se calcula al generar la lista de Descubrir. Los pesos iniciales son los siguientes y son administrables (RF-ADM-08):
Componente
Peso inicial
Cómo se calcula
Denominación
25%
Matriz de afinidad entre denominaciones (administrable). Misma denominación = 100; afines = 60–80; distantes = 20–40. Si el miembro declara "Abierto a todas", el componente se fija en 80 para todos.
Intención
25%
Coincidencia exacta = 100; "Ambas" con cualquiera = 70; incompatibles (matrimonio vs. solo amistad) = 0 y el perfil se excluye de Descubrir.
Prácticas y valores
30%
Índice de Jaccard sobre áreas de servicio y prácticas, más coincidencia en frecuencia de asistencia y respuestas a preguntas de valores.
Cercanía
10%
Decae linealmente hasta la distancia máxima configurada por el miembro.
Edad
10%
100 si está dentro del rango preferido de ambos; decae 10 puntos por año fuera del rango.

Regla adicional: un perfil con verificación nivel 3 recibe un bono de posicionamiento (+5 en el orden, no en el puntaje mostrado) para incentivar la verificación.
7.2 Límites e intencionalidad
Rango de edad mutuo: la compatibilidad de edad se evalúa en ambas direcciones (RF-DES-11). Si un miembro cambia su rango, la lista de Descubrir se regenera.
El rango de edad declarado debe tener al menos 3 años de amplitud y no puede incluir menores de 18 en ningún caso.
Modo invisible (Oro): el miembro invisible sigue viendo Descubrir con normalidad; sus intereses se entregan como cualquier otro y, al marcarlos, su perfil se hace visible solo para ese destinatario.
Los intereses no usados no se acumulan; el contador reinicia a las 00:00 hora de Santo Domingo.
Un miembro no puede marcar interés dos veces al mismo perfil; "Pasar" oculta el perfil 30 días, luego puede reaparecer.
Una conexión deshecha no se puede rehacer durante 90 días.
Perfiles inactivos por más de 60 días se ocultan de Descubrir hasta que el miembro vuelve a ingresar.
7.3 Reglas de chat y moderación
Todo mensaje pasa por clasificación automática antes de entregarse; la latencia objetivo es menor a 300 ms.
Un mensaje retenido se marca al remitente como "en revisión"; si se aprueba se entrega, si se rechaza el remitente recibe aviso educativo.
Tres mensajes rechazados en 7 días generan advertencia automática; la cuarta genera suspensión de 3 días y un caso de moderación.
Cualquier reporte de "menor de edad" o "acoso" es prioridad crítica: perfil ocultado preventivamente hasta revisión en máximo 12 horas.
7.4 Reglas de eventos y grupos
Solo organizaciones aprobadas publican eventos; los grupos de miembros pueden crear "actividades" limitadas a sus integrantes.
Un miembro puede administrar hasta 3 grupos; los grupos con 0 publicaciones en 90 días se archivan automáticamente con aviso previo.
Los eventos con costo muestran el precio y el enlace externo de pago; Yugo no procesa cobros de eventos en el MVP.
8. Requerimientos no funcionales
Código
Requerimiento
RNF-01
Disponibilidad objetivo de 99.5% mensual; respaldo diario de base de datos con retención de 30 días.
RNF-02
Tiempo de respuesta de API menor a 400 ms en el percentil 95 para lectura de Descubrir y chat.
RNF-03
Soporte inicial para 50,000 usuarios registrados y 5,000 concurrentes en chat, con escalado horizontal de la API.
RNF-04
Cifrado en tránsito (TLS 1.2+) y en reposo; contraseñas con Argon2; URLs de fotos firmadas y con vencimiento.
RNF-05
Accesibilidad: contraste AA, tamaños de fuente escalables, etiquetas para lectores de pantalla.
RNF-06
Idioma español (RD) en el MVP con arquitectura lista para inglés y portugués.
RNF-07
Cumplimiento de políticas de App Store y Google Play para apps de citas: verificación de edad, reportes, eliminación de cuenta dentro de la app.
RNF-08
Observabilidad: logs centralizados, métricas y alertas (errores, latencia, colas de moderación atrasadas).
RNF-09
Pruebas: cobertura mínima 70% en la lógica de negocio del backend; pruebas end-to-end con Playwright en web y Maestro en móvil para flujos críticos (registro, interés, conexión, pago).
RNF-10
Ambientes separados (desarrollo, staging, producción) y despliegue continuo con aprobación manual a producción.

9. Modelo de datos (entidades principales)
Entidad
Campos clave
Relaciones
User
id, email, phone, passwordHash, role, status, birthDate, createdAt, deletedAt
1:1 Profile, 1:N Subscription, 1:N Report
Profile
userId, displayName, gender, city, province, location(geo), occupation, education, bio, testimony, verse, intention, openness, attendance, yearsInFaith, completeness, ageMin, ageMax, invisibleMode
N:1 Denomination, N:1 Church, N:M ServiceArea, 1:N Photo
Denomination
id, name, family (católica, evangélica, pentecostal, adventista, etc.), active
N:M DenominationAffinity
Church
id, name, denominationId, address, location, status, contactName, docs
1:N ChurchUser, 1:N Event, 1:1 Group (oficial), 1:N VerificationCode
Verification
userId, level, method, status, reviewedBy, evidenceUrl, churchId, expiresAt
N:1 User
Interest
fromUserId, toUserId, message, createdAt
Único por par; genera Match si es mutuo
Match
userAId, userBId, status, createdAt, endedAt, endedBy
1:1 Conversation
Conversation / Message
matchId, senderId, body, moderationStatus, deliveredAt, readAt
N:1 Match
Group / GroupMember / Post / Comment
name, category, type, city, ownerId, churchId, status; role; body, imageUrl, moderationStatus
Grupo N:M User; Post N:1 Group
Event / EventAttendance
churchId, title, type, startsAt, endsAt, location, capacity, cost, status; userId, status (asistiré/me interesa), checkedInAt
N:1 Church; N:M User
Report / ModerationCase / Sanction
reporterId, targetType, targetId, category, evidence; assigneeId, priority, decision; type, until, reason
Vinculadas a User o contenido
Subscription / Payment
userId, tier (PLUS | ORO), plan, channel, status, startsAt, endsAt, externalId; amount, currency, provider, status
N:1 User
ProfileView / TravelLocation
viewerId, viewedId, viewedAt; userId, location, activeUntil
Funciones Oro
AuditLog
actorId, action, targetType, targetId, before, after, ip, createdAt
Inmutable
Setting
key, value(json), updatedBy
Pesos del algoritmo, límites, umbrales

10. Mapa de pantallas
Los mockups interactivos entregados en el archivo HTML representan las pantallas marcadas con asterisco (*).
10.1 App móvil y web de usuario
Flujo
Pantallas
Bienvenida y registro
Splash · Bienvenida* · Registro (correo/teléfono/Google/Apple) · OTP · Fecha de nacimiento y género · Pacto de conducta* · Denominación e iglesia · Intención y apertura · Fotos · Testimonio y prácticas · Verificación (selfie) · Listo
Inicio
Pantalla principal* con eventos destacados, resumen del día (intereses disponibles, nuevas conexiones) y accesos rápidos
Descubrir
Lista de perfiles* · Detalle de perfil con desglose de afinidad* · Filtros · Te interesa a… · Guardados
Conexiones
Lista de conexiones* · Chat con rompehielos* · Perfil desde chat · Reportar / bloquear · Invitar a evento
Comunidad
Grupos sugeridos y mis grupos* · Detalle de grupo con muro · Crear publicación · Petición de oración · Actividad del grupo · Crear grupo
Eventos
Agenda (lista y mapa)* · Detalle de evento* · Mi agenda · Check-in QR
Perfil propio
Mi perfil* · Editar perfil · Verificación* · Preferencias de búsqueda (rango de edad) · Yugo Plus y Oro (paywall)* · Notificaciones · Privacidad y seguridad · Ayuda · Pausar / eliminar cuenta

10.2 Panel administrativo
Sección
Pantallas
Tablero
Indicadores principales*, gráficas de crecimiento, alertas de moderación
Miembros
Listado con filtros · Ficha del miembro* · Historial y sanciones
Verificaciones
Cola nivel 2 con comparación de fotos*
Moderación
Cola unificada* · Detalle del caso con evidencia · Apelaciones
Organizaciones
Iglesias y ministerios · Solicitudes pendientes* · Detalle
Comunidad
Grupos · Eventos* · Destacados
Suscripciones
Listado · Pagos · Reembolsos · Conciliación
Configuración
Algoritmo de afinidad* · Límites · Catálogos · Contenido legal · Roles · Auditoría

10.3 Portal de iglesias
Sección
Pantallas
Registro
Solicitud de registro · Estado de aprobación
Eventos
Mis eventos · Crear / editar evento · Código QR de check-in
Grupo oficial
Muro · Miembros · Moderación
Miembros
Códigos de verificación · Solicitudes de respaldo
Métricas
Asistencia, alcance y crecimiento del grupo

11. Identidad visual
La identidad evita los clichés del sector (rosados, corazones, fuegos) y la estética de "app religiosa" genérica. Se apoya en materiales sobrios y cálidos: tinta índigo, olivo, trigo dorado y lino.
Elemento
Definición
Nombre
Yugo — con el eslogan "Unidos en la misma fe".
Símbolo
Dos anillos unidos por un arco (el yugo). En la app aparece en el estado de conexión: dos avatares que se enlazan.
Paleta
Índigo #22315C (texto y estructura) · Olivo #7A8450 (acciones positivas, verificación) · Trigo #E0B25A (destacados, Plus) · Lino #FAF8F3 (fondos) · Vino #7B2D4B (alertas y moderación).
Tipografía
Fraunces (títulos, con ligera personalidad editorial) · DM Sans (interfaz y cuerpo).
Tono de voz
Cercano, sereno y respetuoso; sin lenguaje de "conquista"; usa "conexión" en lugar de "match" y "me interesa" en lugar de "like".
Micro-elementos
Insignias de verificación con nombre de iglesia; anillo de afinidad con porcentaje; reacciones "amén" y "oro por esto".

12. Plan de fases y estimación referencial
12.1 Fases
Fase
Duración
Entregables
0 · Descubrimiento y diseño
3 semanas
Validación con 20 entrevistas a solteros cristianos y 5 líderes; diseño UI final en Figma; arquitectura y modelo de datos aprobados.
1 · Núcleo
8 semanas
Registro, perfil, verificación niveles 1 y 2, Descubrir con afinidad, intereses, conexiones y chat moderado. Panel admin básico (miembros, verificaciones, moderación).
2 · Comunidad
6 semanas
Grupos, muro, actividades, eventos, portal de iglesias, verificación nivel 3, notificaciones completas.
3 · Monetización y lanzamiento
5 semanas
Yugo Plus con pagos en tiendas y web, paywalls, panel completo (finanzas, configuración, auditoría), pruebas de carga, publicación en tiendas, beta cerrada con 3 iglesias aliadas.
Total
22 semanas
Aproximadamente 5 meses y medio hasta lanzamiento público.

12.2 Equipo sugerido
1 líder técnico / arquitecto (medio tiempo)
2 desarrolladores full stack (React Native, Next.js, NestJS)
1 diseñador UI/UX (fases 0–1 tiempo completo, luego parcial)
1 QA (automatización con Playwright y Maestro; pruebas de pagos y moderación)
1 gestor de producto / comunidad (validación con iglesias, contenido, beta)
12.3 Estimación de inversión
Estimación referencial para el mercado dominicano con equipo mixto local y remoto. Debe ajustarse tras la fase 0.
Concepto
USD
RD$ (tasa referencial 62)
Diseño y descubrimiento (fase 0)
4,000 – 6,000
248,000 – 372,000
Desarrollo fases 1–3 (22 semanas)
38,000 – 58,000
2,356,000 – 3,596,000
QA y automatización
5,000 – 8,000
310,000 – 496,000
Publicación, legal (términos, Ley 172-13) y cuentas de tiendas
1,500 – 2,500
93,000 – 155,000
Total estimado del MVP
48,500 – 74,500
3,007,000 – 4,619,000
Infraestructura mensual (servidores, almacenamiento, IA de moderación, push, correo)
250 – 600 / mes
15,500 – 37,200 / mes

Nota: si el desarrollo se realiza con Claude Code y un equipo reducido (1–2 personas), el costo puede bajar sustancialmente, pero el tiempo de calendario se mantiene similar por las dependencias de tiendas, pagos y validación con iglesias.
13. Riesgos y mitigaciones
Riesgo
Impacto
Mitigación
Masa crítica insuficiente en el lanzamiento
Alto
Beta cerrada con 3–5 iglesias aliadas y ministerios de jóvenes; eventos como gancho aunque no haya muchos perfiles aún.
Perfiles falsos o intención engañosa
Alto
Verificación por iglesia, selfie en vivo, moderación previa y sanciones rápidas.
Percepción negativa de "citas" en sectores conservadores
Medio
Posicionar como plataforma de comunidad y relaciones con propósito; respaldo de líderes; el pacto de conducta como bandera.
Rechazo en tiendas de apps
Medio
Cumplir desde el diseño los requisitos para apps de citas: verificación de edad, reportes, eliminación de cuenta, moderación.
Conflictos interdenominacionales
Medio
Matriz de afinidad neutral y administrable; preferencias en manos del miembro; sin contenido doctrinal editorial.
Costos de moderación IA con volumen
Bajo
Cachear clasificaciones, umbrales por tipo de contenido, revisión humana solo en zona gris.

14. Métricas de éxito
Registro a perfil completo (≥60%): meta 70%.
Miembros verificados nivel 2 o superior: meta 50% a los 3 meses.
Conexiones por miembro activo por semana: meta 1.5.
Conversaciones con al menos 10 mensajes: meta 40% de las conexiones.
Retención a 30 días: meta 35%.
Conversión gratuito a Plus: meta 4% a los 6 meses; de Plus a Oro: meta 15% de los suscriptores.
Iglesias activas publicando eventos: meta 25 en el primer semestre.
15. Glosario
Término
Definición
Interés
Acción de indicar que un perfil te gusta; equivalente sobrio del "like".
Conexión
Vínculo creado cuando el interés es mutuo; habilita el chat.
Afinidad de fe
Puntaje de 0 a 100 que resume compatibilidad en denominación, intención, prácticas, cercanía y edad.
Pacto de conducta
Compromiso de respeto y pureza que todo miembro acepta; base de las sanciones.
Respaldo de iglesia
Verificación de nivel 3 otorgada por una congregación registrada.
Rompehielos
Preguntas sugeridas al iniciar una conversación, generadas a partir del perfil del otro.
Yugo Plus
Primer nivel de suscripción: amplía límites y filtros.
Yugo Oro
Segundo nivel de suscripción: modo invisible, posición preferente, deshacer, modo viaje, quién vio mi perfil y prioridad.
Modo invisible
Función de Oro por la que el perfil solo es visible para las personas a quienes el miembro marca interés.
