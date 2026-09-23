# Yugo móvil — consola para lanzar builds de la app en EAS desde Railway.
#
# No sirve nada: la app se compila en la nube de Expo (EAS Build). Este
# contenedor tiene el monorepo, las dependencias y eas-cli listos para que,
# desde Railway → servicio → Console, baste con `yugo-apk` para pedir un APK.
# Ver docs/RAILWAY.md, «La app móvil desde la consola de Railway».
FROM node:22-bookworm-slim
# git: EAS empaqueta el proyecto a partir del repositorio git.
RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable \
 && npm i -g eas-cli@latest
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .gitignore ./
COPY packages ./packages
COPY apps/mobile ./apps/mobile
# Solo la app y lo que importa (ui-tokens, shared, app-core). eas-cli las
# necesita para leer app.json con sus plugins de configuración.
RUN pnpm install --frozen-lockfile --filter "@yugo/mobile..." --ignore-scripts

# .git no entra en el contexto de Docker; EAS necesita un repositorio, así que
# se crea uno local con lo copiado (respeta .gitignore: sin node_modules).
RUN git init -q \
 && git -c user.name=yugo -c user.email=build@yugo.do add -A \
 && git -c user.name=yugo -c user.email=build@yugo.do commit -q -m "Yugo móvil (imagen de Railway)"

RUN install -m 755 apps/mobile/railway/yugo-apk.sh /usr/local/bin/yugo-apk
ENV EAS_BUILD_PROFILE=preview
CMD ["sh", "/app/apps/mobile/railway/start.sh"]
