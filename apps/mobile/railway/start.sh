#!/bin/sh
# Arranque del servicio móvil en Railway. Por defecto solo queda en espera para
# usar la consola; con EAS_BUILD_ON_DEPLOY=true lanza además un build en cada
# despliegue (cada uno gasta cuota de EAS).
if [ "${EAS_BUILD_ON_DEPLOY:-false}" = "true" ]; then
  yugo-apk "${EAS_BUILD_PROFILE:-preview}" || echo "El build automático falló; revisa el mensaje de arriba."
fi
echo "Consola de Yugo móvil lista. Abre Console en Railway y ejecuta: yugo-apk [preview|preview-demo|production]"
exec sleep infinity
