#!/usr/bin/env bash
#
# Auto-test del escáner de secretos.
#
# Una regla de seguridad que nadie ha visto dispararse no es una protección:
# es una creencia. Este script le pone delante a gitleaks un secreto falso de
# cada forma que Yugo maneja de verdad y falla si alguno pasa limpio.
#
# Existe porque las reglas de fábrica dejaban pasar tres de las más peligrosas
# —el URI de base de datos con contraseña, el de Redis y la clave de
# Anthropic—, y sin esta prueba nadie se habría enterado hasta la filtración.
#
# También comprueba lo contrario: que los valores de relleno que el repositorio
# sí debe contener (`.env.example`, la contraseña de la demo, el usuario de CI)
# no disparen nada. Un escáner que grita por todo se apaga en una semana, y un
# escáner apagado no protege nada.
#
#   Uso:  ./scripts/secret-scan-selftest.sh
#
# ┌──────────────────────────────────────────────────────────────────────────┐
# │  AQUÍ SOLO VAN VALORES INVENTADOS.                                       │
# │                                                                          │
# │  Este archivo está en el allowlist de `.gitleaks.toml` —tiene que        │
# │  estarlo, o no se podría ni commitear—, así que es el único sitio del    │
# │  repositorio donde un secreto de verdad pasaría sin que nadie lo note.   │
# │  Si necesitas un caso nuevo, invéntate el valor. Nunca copies uno real,  │
# │  ni siquiera «para probar rápido» y borrarlo después: para entonces ya   │
# │  estaría en el historial.                                                │
# └──────────────────────────────────────────────────────────────────────────┘
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG="$ROOT/.gitleaks.toml"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "gitleaks no está instalado. Instálalo con:"
  echo "  brew install gitleaks        # macOS"
  echo "  https://github.com/gitleaks/gitleaks/releases   # Linux/Windows"
  exit 127
fi

fallos=0
comprobaciones=0

# Corre gitleaks sobre un solo archivo y devuelve cuántos hallazgos hubo.
escanear() {
  rm -rf "${WORK:?}/caso"
  mkdir -p "$WORK/caso"
  printf '%s\n' "$2" > "$WORK/caso/$1"
  gitleaks detect --source "$WORK/caso" --no-git --config "$CONFIG" \
    --no-banner --report-format json --report-path "$WORK/salida.json" >/dev/null 2>&1 || true
  python3 -c "import json;print(len(json.load(open('$WORK/salida.json'))))" 2>/dev/null || echo 0
}

# Un secreto que TIENE que disparar.
debe_detectar() {
  comprobaciones=$((comprobaciones + 1))
  local n; n="$(escanear "$2" "$3")"
  if [ "$n" -gt 0 ]; then
    printf '  ok    detecta %s\n' "$1"
  else
    printf '  FALLO se le escapa %s\n' "$1"
    fallos=$((fallos + 1))
  fi
}

# Un valor de relleno que NO debe disparar.
debe_ignorar() {
  comprobaciones=$((comprobaciones + 1))
  local n; n="$(escanear "$2" "$3")"
  if [ "$n" -eq 0 ]; then
    printf '  ok    ignora %s\n' "$1"
  else
    printf '  FALLO grita por %s (falso positivo)\n' "$1"
    fallos=$((fallos + 1))
  fi
}

echo
echo "Secretos que tienen que disparar"

# Las tres que las reglas de fábrica dejaban pasar. Si alguien quita
# .gitleaks.toml, estas tres son las primeras en fallar, que es el punto.
debe_detectar 'URI de PostgreSQL con contraseña' 'conf.env' \
  'DATABASE_URL=postgresql://yugo:Xk9mQ2vLp7wRt4z@db.produccion.yugo.do:5432/yugo'
debe_detectar 'URI de Redis con contraseña' 'conf.env' \
  'REDIS_URL=redis://:Tp8xQ2mNv5Lw9Rz@cache.produccion.yugo.do:6379'
debe_detectar 'clave de la API de Anthropic' 'conf.env' \
  'ANTHROPIC_API_KEY=sk-ant-api03-xK9mQ2vLp7wRt4zNb8cVf1gH3jK6lM9nO2pQ5rS8tU1vW4xY7zA0bC3dE6fG9hI2jK5lM8nO1pQ4rS7tAA'

# Estas ya las atrapaban las reglas de fábrica; se prueban igual para que un
# cambio de versión de gitleaks no las pierda en silencio.
debe_detectar 'llave de autenticación de Azul' 'conf.env' \
  'AZUL_AUTH_KEY=9f8e7d6c5b4a39281706f5e4d3c2b1a0'
debe_detectar 'secreto de firma de JWT' 'conf.env' \
  'JWT_ACCESS_SECRET=8f3a91c7e42b6d05af18e93c7b2d64a0f5e81c93d7b64a2e0f'
# El de Stripe se arma en dos trozos y hay una razón concreta: escrito de
# corrido, la protección de push de GitHub lo detecta y **rechaza el push de
# este archivo**. Pasó de verdad, y la salida decía «Stripe API Key».
#
# La alternativa era el enlace de «permitir este secreto» que ofrece GitHub, y
# no se tomó a propósito: ese enlace enseña el reflejo de desbloquear la alerta,
# que es exactamente lo que este auto-test y el hook de pre-commit existen para
# evitar. Que un control externo haya atrapado un valor inventado no es un
# estorbo: es la señal de que funciona.
#
# Partirlo aquí no debilita nada. El valor se ensambla en memoria y se escribe
# completo en el archivo temporal que se escanea, así que gitleaks lo ve entero
# — el auto-test de abajo seguiría fallando si dejara de detectarlo.
stripe_falso="sk_live""_51H8xQ2KZvKuY3nRtP9wLmXcJdA4eB7fG2hI5jK8lM1nO3pQ6rS9tU2vW5xY8zA1bC4dE7fG0hI3jK6lM9nO"
debe_detectar 'clave secreta de Stripe' 'conf.env' \
  "STRIPE_SECRET_KEY=$stripe_falso"
debe_detectar 'bloque de clave privada' 'llave.json' \
  '{"private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg\n-----END PRIVATE KEY-----\n"}'

# Un secreto no deja de serlo por estar en TypeScript en vez de en un .env.
debe_detectar 'clave pegada dentro de código' 'config.ts' \
  "export const db = 'postgresql://yugo:Zq7wRt4vLp9mNx2@db.produccion.yugo.do:5432/yugo';"

echo
echo "Valores de relleno que no deben disparar"

debe_ignorar 'la línea de la plantilla .env.example' 'conf.env' \
  'DATABASE_URL=postgresql://yugo:yugo@localhost:5432/yugo?schema=public'
debe_ignorar 'Redis local sin contraseña' 'conf.env' \
  'REDIS_URL=redis://localhost:6379'
debe_ignorar 'los secretos de CI' 'conf.env' \
  'JWT_ACCESS_SECRET=ci-access-secret'
debe_ignorar 'los secretos de desarrollo' 'conf.env' \
  'JWT_REFRESH_SECRET=dev-refresh'
debe_ignorar 'la plantilla de Azul' 'conf.env' \
  'AZUL_AUTH_KEY=change-me'
debe_ignorar 'la contraseña de las cuentas de demo' 'seed.ts' \
  "const password = await argon2.hash('Yugo.demo1');"
debe_ignorar 'una variable interpolada' 'compose.yml' \
  'JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}'

echo
if [ "$fallos" -gt 0 ]; then
  echo "$((comprobaciones - fallos))/$comprobaciones — $fallos fallo(s)"
  exit 1
fi
echo "$comprobaciones/$comprobaciones comprobaciones correctas"
