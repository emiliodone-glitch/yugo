#!/usr/bin/env bash
# Copia de seguridad de la base de datos de Yugo (RNF-07).
#
# Uso:
#   scripts/backup-db.sh [carpeta-destino]
#   DATABASE_URL=postgresql://... scripts/backup-db.sh backups/
#
# Genera un archivo en formato "custom" de pg_dump (comprimido, restaurable por
# tablas con pg_restore) con la fecha en el nombre, y comprueba que se puede
# leer antes de dar por buena la copia. Una copia que nadie ha intentado abrir
# no es una copia.
set -euo pipefail

DEST="${1:-backups}"
if [ -z "${DATABASE_URL:-}" ]; then
  echo "Falta DATABASE_URL (en Railway: servicio Postgres → Variables → DATABASE_PUBLIC_URL)." >&2
  exit 1
fi
command -v pg_dump >/dev/null || { echo "Falta pg_dump (apt install postgresql-client)." >&2; exit 1; }

# Prisma añade `?schema=public` a la URL y libpq no lo entiende; se quita y se
# conserva el resto (sslmode, etc.).
PG_URL="$(printf '%s' "$DATABASE_URL" | sed -E 's/([?&])schema=[^&]*&?/\1/; s/[?&]$//')"

mkdir -p "$DEST"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
FILE="$DEST/yugo-$STAMP.dump"
# Una copia a medias es peor que ninguna: si algo falla, no queda el archivo.
trap 'rm -f "$FILE"' ERR

# Sin --clean ni owners: la restauración decide dónde y como quién.
pg_dump --format=custom --no-owner --no-privileges --file="$FILE" "$PG_URL"

# Verificación mínima: el archivo se puede listar y contiene la tabla User.
if ! pg_restore --list "$FILE" | grep -q 'TABLE DATA public "User"\|TABLE DATA public User'; then
  echo "La copia no contiene la tabla User; algo salió mal." >&2
  exit 1
fi

SIZE=$(du -h "$FILE" | cut -f1)
echo "Copia lista: $FILE ($SIZE)"
echo "Restaurar con: scripts/restore-backup.sh $FILE postgresql://... "
