#!/usr/bin/env bash
#
# RNF-01: respaldo diario de PostgreSQL con retención de 30 días.
#
# Pensado para correr desde cron o un job programado del proveedor:
#   0 2 * * *  /opt/yugo/infra/scripts/backup-postgres.sh >> /var/log/yugo-backup.log 2>&1
#
# Variables:
#   DATABASE_URL      obligatoria; la misma que usa la API.
#   BACKUP_DIR        destino local (por defecto /var/backups/yugo).
#   BACKUP_RETENTION  días a conservar (por defecto 30).
#   BACKUP_S3_URI     opcional; si está, sube el archivo con `aws s3 cp`.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL es obligatoria}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/yugo}"
BACKUP_RETENTION="${BACKUP_RETENTION:-30}"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive="${BACKUP_DIR}/yugo-${stamp}.dump"

mkdir -p "$BACKUP_DIR"

# Formato custom: permite restauración selectiva y se comprime solo.
# --no-owner mantiene el volcado restaurable en un rol distinto (staging).
pg_dump --format=custom --no-owner --compress=9 --file="$archive" "$DATABASE_URL"

# Un volcado vacío o truncado es peor que ninguno: se verifica antes de rotar.
if ! pg_restore --list "$archive" > /dev/null 2>&1; then
  echo "ERROR: el volcado ${archive} no es legible; se conserva y NO se rota nada." >&2
  exit 1
fi
echo "OK: ${archive} ($(du -h "$archive" | cut -f1))"

if [[ -n "${BACKUP_S3_URI:-}" ]]; then
  aws s3 cp "$archive" "${BACKUP_S3_URI%/}/yugo-${stamp}.dump"
  echo "OK: subido a ${BACKUP_S3_URI%/}/yugo-${stamp}.dump"
fi

# La rotación va después de verificar, para no borrar el histórico bueno
# cuando el volcado de hoy salió mal.
deleted="$(find "$BACKUP_DIR" -name 'yugo-*.dump' -type f -mtime "+${BACKUP_RETENTION}" -print -delete | wc -l)"
echo "Retención ${BACKUP_RETENTION} días: ${deleted} archivo(s) eliminados."
