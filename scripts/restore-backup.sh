#!/usr/bin/env bash
# Restauración de una copia de la base de datos de Yugo (RNF-07).
#
# Uso:
#   scripts/restore-backup.sh <archivo.dump|archivo.sql> <DATABASE_URL destino> [--yes-production]
#
# Restaura sobre la base destino **borrando lo que haya**. Por eso:
#   - se niega a tocar una URL que parezca de producción (railway.app,
#     rlwy.net, o que contenga "prod") salvo con --yes-production;
#   - pide confirmación escribiendo el nombre de la base;
#   - al terminar aplica las migraciones pendientes (por si la copia es de una
#     versión anterior) y cuenta usuarios, para que se vea que hay datos.
#
# Ensayo recomendado una vez al mes contra una base vacía (ver docs/RAILWAY.md,
# «Copias de seguridad y restauración»). Una restauración que se ensaya por
# primera vez el día del desastre es una apuesta.
set -euo pipefail

FILE="${1:-}"
TARGET="${2:-}"
FORCE_PROD="${3:-}"

if [ -z "$FILE" ] || [ -z "$TARGET" ]; then
  echo "Uso: $0 <archivo.dump|archivo.sql> <DATABASE_URL destino> [--yes-production]" >&2
  exit 1
fi
[ -f "$FILE" ] || { echo "No existe $FILE" >&2; exit 1; }
command -v psql >/dev/null || { echo "Falta psql (apt install postgresql-client)." >&2; exit 1; }

# Protección contra el error más caro: restaurar una copia vieja encima de la
# base real por confundir una variable.
if echo "$TARGET" | grep -Eqi 'railway\.app|rlwy\.net|prod'; then
  if [ "$FORCE_PROD" != "--yes-production" ]; then
    echo "La URL destino parece de producción. Si de verdad quieres restaurar ahí, añade --yes-production." >&2
    exit 2
  fi
fi

DBNAME="$(echo "$TARGET" | sed -E 's#.*/([^/?]+)(\?.*)?$#\1#')"
# Prisma añade `?schema=public`; libpq no lo entiende. Para psql/pg_restore se
# quita; a Prisma se le pasa la URL tal cual.
PG_TARGET="$(printf '%s' "$TARGET" | sed -E 's/([?&])schema=[^&]*&?/\1/; s/[?&]$//')"
if [ -t 0 ]; then
  echo "Se va a BORRAR el contenido de la base «$DBNAME» y a restaurar $FILE."
  read -r -p "Escribe el nombre de la base para confirmar: " CONFIRM
  [ "$CONFIRM" = "$DBNAME" ] || { echo "No coincide; no se hizo nada." >&2; exit 3; }
fi

# Esquema limpio: la extensión PostGIS se recrea porque las migraciones la
# esperan; el resto lo trae la copia.
psql "$PG_TARGET" -v ON_ERROR_STOP=1 -q <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
CREATE EXTENSION IF NOT EXISTS postgis;
SQL

case "$FILE" in
  *.sql)
    psql "$PG_TARGET" -v ON_ERROR_STOP=1 -q -f "$FILE"
    ;;
  *)
    command -v pg_restore >/dev/null || { echo "Falta pg_restore." >&2; exit 1; }
    # --no-owner/--no-privileges: la copia puede venir de otro usuario.
    pg_restore --no-owner --no-privileges --exit-on-error --dbname="$PG_TARGET" "$FILE"
    ;;
esac

# Migraciones pendientes, si la copia es anterior al código desplegado.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [ -d "$ROOT/apps/api/prisma/migrations" ] && command -v pnpm >/dev/null; then
  (cd "$ROOT/apps/api" && DATABASE_URL="$TARGET" pnpm exec prisma migrate deploy)
fi

USERS=$(psql "$PG_TARGET" -tAc 'SELECT count(*) FROM "User";')
MIGRATIONS=$(psql "$PG_TARGET" -tAc 'SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL;' 2>/dev/null || echo '?')
echo "Restaurado en «$DBNAME»: $USERS usuarios, $MIGRATIONS migraciones aplicadas."
