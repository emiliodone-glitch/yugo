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

## Contactos de escalada

| Tema | Responsable |
| --- | --- |
| Moderación y seguridad de miembros | Equipo de moderación (turno) |
| Infraestructura y base de datos | Líder técnico |
| Pagos y conciliación | Finanzas |
| Datos personales (Ley 172-13) | privacidad@yugo.do |
