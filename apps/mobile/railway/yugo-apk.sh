#!/bin/sh
# yugo-apk [perfil] — pide a EAS un build de Android de la app.
#
#   yugo-apk                 perfil de EAS_BUILD_PROFILE (preview por defecto)
#   yugo-apk preview         APK contra la API real (EXPO_PUBLIC_API_URL)
#   yugo-apk preview-demo    APK con datos de demo, sin servidor
#   yugo-apk production      AAB para Google Play
#
# Variables del servicio en Railway: EXPO_TOKEN (obligatoria),
# EXPO_PUBLIC_API_URL (URL de la API sin /v1; salvo en preview-demo) y
# EAS_PROJECT_ID (opcional: si falta, se enlaza o crea el proyecto «yugo» en la
# cuenta del token).
set -eu
PROFILE="${1:-${EAS_BUILD_PROFILE:-preview}}"
cd "${YUGO_MOBILE_DIR:-/app/apps/mobile}"

fail() { echo "ERROR: $1" >&2; exit 1; }

[ -n "${EXPO_TOKEN:-}" ] || fail "falta EXPO_TOKEN. Créalo en expo.dev → Account settings → Access tokens y ponlo en Variables del servicio."
case "$PROFILE" in
  preview|preview-demo|production) ;;
  *) fail "perfil desconocido «$PROFILE». Usa preview, preview-demo o production." ;;
esac
if [ "$PROFILE" != "preview-demo" ] && [ -z "${EXPO_PUBLIC_API_URL:-}" ]; then
  fail "el perfil $PROFILE necesita EXPO_PUBLIC_API_URL (la URL de la API en Railway, sin /v1)."
fi

# El build corre en la nube de Expo, que no ve las variables de este
# contenedor: la URL de la API y el projectId viajan dentro de app.json.
node -e '
  const fs = require("fs");
  const cfg = JSON.parse(fs.readFileSync("app.json", "utf8"));
  const extra = (cfg.expo.extra ??= {});
  const api = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "").replace(/\/v1$/, "");
  if (api) extra.apiUrl = api;
  if (process.env.EAS_PROJECT_ID) (extra.eas ??= {}).projectId = process.env.EAS_PROJECT_ID;
  fs.writeFileSync("app.json", JSON.stringify(cfg, null, 2) + "\n");
'
if ! grep -q '"projectId"' app.json; then
  echo "Enlazando la app con su proyecto en Expo (eas init)…"
  eas init --non-interactive --force
fi

git -c user.name=yugo -c user.email=build@yugo.do add -A
git -c user.name=yugo -c user.email=build@yugo.do commit -q -m "Configuración del build ($PROFILE)" || true

echo "Lanzando build de Android en EAS (perfil $PROFILE)…"
eas build --platform android --profile "$PROFILE" --non-interactive --no-wait
echo "Listo. Sigue el progreso y descarga el archivo en el enlace de arriba (o en expo.dev → Builds)."
