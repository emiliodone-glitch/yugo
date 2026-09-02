# Runbook de operación — Yugo

Guía para quien está de turno. Todo lo que aparece aquí es verificable desde
el panel administrativo o desde los endpoints de salud.

## Ambientes

| Ambiente | Web | API | Base de datos |
| --- | --- | --- | --- |
| Desarrollo | `localhost:3000` | `localhost:4000/v1` | Docker local (`infra/docker-compose.yml`) |
| Staging | `staging.yugo.do` | `staging.yugo.do/v1` | Postgres gestionado (staging) |
| Producción | `yugo.do` | `yugo.do/v1` | Postgres gestionado (producción, respaldo diario) |

El despliegue a staging es automático al fusionar en `main`; **producción
exige aprobación manual** en el entorno protegido de GitHub (RNF-10). Las
migraciones se aplican antes de que las imágenes nuevas reciban tráfico.

## Salud y métricas

```bash
curl https://yugo.do/v1/health            # público: base de datos, caché, uptime
curl -H "Authorization: Bearer <token>" \
     https://yugo.do/v1/health/metrics    # rol staff: colas, moderación, SLA
```

`/health/metrics` devuelve además una lista `alerts` ya evaluada. Conéctala al
sistema de alertas con estas reglas:

| Alerta | Umbral | Severidad | Acción |
| --- | --- | --- | --- |
| Casos fuera de SLA | `moderation.overdueCases > 0` | Crítica | Asignar moderador de turno; los reportes de menor de edad y acoso tienen SLA de 12 h (7.3) |
| Cola de IA creciendo | `moderation.heldMessages > 100` | Alta | Revisar si el clasificador responde; un fallo del clasificador retiene mensajes por diseño |
| Verificaciones atrasadas | `moderation.pendingVerifications > 50` | Alta | Refuerzo en la cola; los Oro tienen SLA de 4 h (6.9) |
| Cola de trabajos | `queues.* > 500` | Alta | Revisar Redis y los workers de BullMQ |
| `/health` degradado | `status != "ok"` | Crítica | Ver qué `check` falló (base de datos o caché) |
| Latencia p95 | `> 400 ms` en Descubrir o chat | Alta | RNF-02; revisar índices y caché de Descubrir |
| Disponibilidad | `< 99.5%` mensual | Crítica | RNF-01 |

Los logs de la API son una línea JSON por petición con `requestId`, ruta,
estado, `durationMs` y `userId`. **Nunca registran cuerpos**: un mensaje de
chat o un dato personal jamás aparece en los logs (RF-SEG-08).

## Incidentes frecuentes

### El clasificador de moderación no responde
El pipeline **retiene** (`HELD`) en lugar de entregar sin moderar — es el
comportamiento deseado, no un bug. Verifica `ANTHROPIC_API_KEY` y la cuota;
mientras tanto la cola crece y los moderadores pueden liberar manualmente
desde `/admin/moderacion → Retenidos por IA`.

### Descubrir devuelve listas vacías
1. ¿El perfil tiene `completeness ≥ 60`? Perfiles por debajo no aparecen ni
   ven (RF-PER-10).
2. ¿El rango de edad es demasiado estrecho? La regla es **mutua** (RF-DES-11):
   ambos rangos deben aceptarse.
3. ¿La lista del día ya se consumió? Se regenera a las 00:00 de Santo Domingo.
4. Para forzar regeneración: borrar las claves `discover:<userId>:*` en Redis.

### Un miembro reporta que "desapareció" de la app
Revisa en este orden: sanción activa (`/admin/miembros → ficha`), cuenta
pausada por el propio miembro, ocultamiento preventivo por un reporte crítico
(7.3), o inactividad > 60 días.

### Redis caído
La API sigue funcionando: `CacheService` degrada a memoria del proceso y las
colas ejecutan los trabajos en línea. Consecuencias: los contadores diarios
dejan de compartirse entre instancias (un miembro podría exceder sus 8
intereses) y la caché de Descubrir se recalcula. Restablecer Redis es
prioridad alta, no crítica.

## Tareas programadas

| Cron (UTC) | Qué hace | Dónde |
| --- | --- | --- |
| `0 * * * *` | Recordatorios push 24 h antes de eventos (RF-EVE-04) | `EventsController.reminders` |
| `0 3 * * *` | Vencimientos, downgrades y avisos de modo invisible (RF-PLU-08) | `SubscriptionsController.dailyMaintenance` |
| `0 4 * * *` | Borrado definitivo tras la gracia de 14 días (RF-AUT-08) | `PrivacyService.purgeExpiredDeletions` |

## Contenido que alguien tiene que producir

### El devocional del día
No es una tarea programada: es una persona. Cada día tiene que haber un
devocional publicado, y la app no lo genera. Cuando no lo hay, repite el último
y le dice a la gente que el de hoy todavía no está.

- Dónde se escribe: `/admin/devocionales` (roles `COMMUNITY_MANAGER` y
  `SUPERADMIN`).
- Qué mirar: la **reserva**, en grande al entrar. Son los días consecutivos
  programados a partir de hoy. El tablero avisa en alto con menos de una
  semana y en crítico cuando es cero.
- Ritmo recomendado: escribir con dos semanas de adelanto, una vez por semana.
  Es media hora; el costo de no hacerlo es que el producto pierda la única
  razón que tiene para abrirse un martes cualquiera.
- Lo que no se puede: reescribir o borrar uno que alguien ya leyó. Lo que esa
  persona leyó fue lo que leyó.

### La cola de retenidos
Lo que la moderación automática para queda esperando a una persona:
mensajes, publicaciones, fotos, peticiones de oración, testimonios y
reflexiones. Las peticiones y reflexiones **nunca se rechazan solas** —si el
clasificador dice «rechazar», entran con prioridad alta— así que la cola vacía
no es opcional: a cada persona que espera se le prometió una respuesta.

- Dónde: `/admin/moderacion`, pestaña «Retenidos», que es la que abre.
- Cuándo: al menos dos veces al día. Una petición de oración escrita un
  domingo por la noche no debería esperar al lunes al mediodía.

## Respaldos y recuperación

- Respaldo diario de PostgreSQL con retención de 30 días (RNF-01):
  `infra/scripts/backup-postgres.sh`, pensado para cron o el job programado del
  proveedor:

  ```cron
  0 2 * * * /opt/yugo/infra/scripts/backup-postgres.sh >> /var/log/yugo-backup.log 2>&1
  ```

  Variables: `DATABASE_URL` (obligatoria), `BACKUP_DIR` (por defecto
  `/var/backups/yugo`), `BACKUP_RETENTION` (30) y `BACKUP_S3_URI` (opcional,
  copia el volcado fuera del servidor). El script **verifica el volcado con
  `pg_restore --list` antes de rotar**: si el respaldo de hoy salió mal, sale
  con error y conserva el histórico en vez de borrarlo.
- Probar la restauración en staging al menos una vez por trimestre.
- Los objetos de S3/R2 (fotos, selfies) tienen versionado activado; una
  eliminación accidental se recupera desde la versión anterior.
- Orden de restauración: base de datos → aplicar migraciones pendientes →
  levantar API → verificar `/health` → levantar web.

## Gestión de secretos

Ningún secreto vive en el repositorio. `.env.example` documenta cada variable.
En producción se inyectan desde el gestor de secretos del proveedor.
Rotación recomendada: `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` cada 90 días
(rotar el de refresco invalida todas las sesiones: avisar antes).

### Detección automática

Dos redes, y hacen cosas distintas:

| | Dónde | Si falta gitleaks | Qué revisa |
| --- | --- | --- | --- |
| `.husky/pre-commit` | Tu máquina, antes del commit | **Avisa y deja pasar** | Lo que está en el índice |
| Trabajo `secretos` en CI | GitHub Actions, antes del merge | No aplica: lo instala | **Toda la historia** |

Que el hook local no bloquee cuando falta la herramienta es una decisión, no un
descuido: bloquear enseña a escribir `--no-verify`, y quien aprende ese reflejo
se lo salta también el día que sí había un secreto. La red que no se puede
saltar es la de CI. El costo es real y conviene decirlo: si haces push con un
secreto, CI lo detiene antes del merge, pero para entonces ya está en el
historial remoto y **hay que rotarlo igual**.

Instalar la herramienta localmente:

```bash
brew install gitleaks                          # macOS
# Linux/Windows: https://github.com/gitleaks/gitleaks/releases
```

```bash
pnpm scan:secrets     # revisa toda la historia
pnpm scan:selftest    # comprueba que el escáner detecta lo que dice detectar
```

Las reglas están en `.gitleaks.toml`. Existen porque **las de fábrica dejaban
pasar las tres fugas más probables de este repositorio**: un `DATABASE_URL` de
producción con contraseña, un `REDIS_URL` igual y una `ANTHROPIC_API_KEY`. Se
comprobó corriéndolo, no leyendo la documentación. Además hay reglas propias
para Azul (procesador dominicano que gitleaks no conoce), los secretos de firma
de JWT y los bloques de clave privada.

`scripts/secret-scan-selftest.sh` le pone delante un secreto falso de cada
forma y falla si alguno pasa limpio; también comprueba que los valores de
relleno del repositorio no disparen nada, porque un escáner que grita por todo
se apaga en una semana. CI lo corre **antes** del escaneo: sin ese paso, una
regla rota se vería exactamente igual que un repositorio limpio.

### Si se filtró un secreto

Por este orden, y el primer paso no es borrar el archivo:

1. **Rotar la credencial.** Ya está comprometida. Borrarla del repositorio no
   la desfiltra: sigue en el objeto de git anterior y en cualquier copia que
   alguien haya clonado.
2. Revisar accesos con esa credencial desde la fecha del commit que la
   introdujo (`git log -S` sobre el valor para encontrarlo).
3. Sacarla del código y ponerla en el gestor de secretos.
4. Si es `DATABASE_URL` o una clave de almacenamiento, esto es un incidente de
   datos personales: aplica el procedimiento de la Ley 172-13 y hay que
   notificar. No es solo un problema técnico.
5. Reescribir la historia solo después de lo anterior, y coordinado: obliga a
   todo el mundo a reclonar.

## Contactos de escalada

| Tema | Responsable |
| --- | --- |
| Moderación y seguridad de miembros | Equipo de moderación (turno) |
| Infraestructura y base de datos | Líder técnico |
| Pagos y conciliación | Finanzas |
| Datos personales (Ley 172-13) | privacidad@yugo.do |
