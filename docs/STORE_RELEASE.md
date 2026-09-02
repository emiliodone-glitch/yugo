# Publicación en App Store y Google Play

Las apps de citas reciben una revisión más estricta que el resto. Esta guía
recoge lo que ambas tiendas exigen y **dónde está ya implementado** en Yugo,
para que la revisión no se caiga por un requisito olvidado (RNF-07).

## Requisitos obligatorios y su estado

| Requisito de tienda | Dónde está en Yugo |
| --- | --- |
| Verificación de edad; prohibido el acceso a menores de 18 | `AuthService.register` valida en backend y registra el intento en `AuditLog`; el onboarding bloquea el paso 2 |
| Mecanismo de reporte accesible desde el contenido | Menú del chat (`Reportar`), reporte de perfil, publicaciones y eventos |
| Bloquear a otro usuario | Menú del chat → `Bloquear` (`POST /v1/connections/block`) |
| **Eliminación de cuenta desde dentro de la app** | Perfil → Privacidad y seguridad → Eliminar mi cuenta (`DELETE /v1/auth/account`) |
| Moderación de contenido generado por usuarios | Clasificación previa de texto e imagen + cola humana (RF-SEG-02) |
| Política de privacidad accesible sin iniciar sesión | `https://yugo.do/legal/privacidad` (pública) |
| Términos accesibles sin iniciar sesión | `https://yugo.do/legal/terminos` |
| Sign in with Apple si hay otros inicios sociales | `POST /v1/auth/oauth` con `provider: "apple"` (RF-AUT-02) |
| Compras digitales por el sistema de la tienda | `StoreReceiptProvider` valida recibos de App Store y Google Play |
| Restaurar compras | Reconsultar recibo y sincronizar el estado único de la cuenta (RF-PLU-03) |

> **Regla dura**: las suscripciones vendidas dentro de la app móvil deben
> pasar por la tienda. El cobro con tarjeta (Stripe/Azul) se ofrece solo en la
> web. No enlaces al checkout web desde la app: es causa de rechazo.

## Ficha de la tienda

- **Nombre**: Yugo
- **Subtítulo**: Unidos en la misma fe
- **Categoría**: Estilo de vida (secundaria: Redes sociales)
- **Clasificación por edad**: 17+ / Adultos (citas y encuentros)
- **Descripción corta**: «Conoce a alguien que ya ora como tú. Citas con
  propósito, comunidad y eventos para cristianos de todas las denominaciones.»
- **Palabras clave**: cristianos, citas cristianas, matrimonio, iglesia,
  comunidad, República Dominicana, solteros cristianos
- **Capturas**: Bienvenida, Descubrir, Afinidad de fe, Conexiones/Chat,
  Comunidad, Eventos, Perfil con verificación.

## Notas para el revisor (plantilla)

```
Yugo es una plataforma de citas con propósito y comunidad para personas
cristianas mayores de 18 años, con foco en República Dominicana.

Cuenta de prueba:
  correo: revisor@yugo.do
  clave: <generada para la revisión>
La cuenta ya tiene el perfil completo, verificación de identidad aprobada y
una conexión activa para revisar el chat.

Puntos que suelen preguntarse:
- Verificación de edad: la fecha de nacimiento se valida en el servidor; los
  menores de 18 son rechazados y el intento queda registrado.
- Eliminación de cuenta: Perfil → Privacidad y seguridad → Eliminar mi cuenta.
- Reportar y bloquear: menú (⋯) dentro de cualquier conversación.
- Moderación: todo mensaje, publicación y foto pasa por clasificación
  automática antes de entregarse o publicarse; hay revisión humana.
- Compras: las suscripciones dentro de la app se procesan con el sistema de
  compras de la tienda.
```

## APK de prueba interna con EAS

Antes de las tiendas, un APK que se instala a mano en teléfonos de prueba.
Se construye en la nube de Expo (EAS Build); no hace falta Android Studio.

```bash
npm i -g eas-cli
cd apps/mobile
eas login                      # cuenta de Expo del proyecto
eas init                       # una sola vez: crea el proyecto y su projectId

# APK contra la API desplegada (Railway):
EXPO_PUBLIC_API_URL=https://<dominio-de-la-api> \
  eas build --platform android --profile preview

# APK en modo demo (sin servidor, con las fixtures), para enseñar el producto:
eas build --platform android --profile preview-demo
```

Al terminar, EAS da un enlace de descarga y un código QR. El archivo se instala
en Android activando «Instalar apps de origen desconocido» para el navegador o
el gestor de archivos.

Los perfiles están en `eas.json`:

| Perfil | Produce | Apunta a | Para qué |
| --- | --- | --- | --- |
| `preview` | APK | `EXPO_PUBLIC_API_URL` | Pruebas con la API real |
| `preview-demo` | APK | Fixtures (`EXPO_PUBLIC_DEMO_MODE=true`) | Enseñar la app sin infraestructura |
| `production` | AAB | `EXPO_PUBLIC_API_URL` | Google Play |

`EXPO_PUBLIC_API_URL` se lee **al construir**; para cambiar de servidor hay que
volver a construir. Sin `/v1` al final: la app lo añade.

### Antes de lanzar el build

Lo que se puede comprobar sin un teléfono, y se comprueba en CI:

```bash
cd apps/mobile
pnpm typecheck                                  # tipos
pnpm test                                       # cada pantalla se monta sin lanzar
npx expo export --platform android              # el bundle resuelve todos los módulos
npx expo-doctor                                 # versiones compatibles con el SDK
```

La suite de `pnpm test` monta las 32 rutas en modo demo con los proveedores de
producción y falla si alguna lanza o escribe un error de React en la consola.
Es la prueba más barata contra una app que se cierra al abrirla. `expo export`
es la que atrapó, en la primera corrida, un módulo que faltaba por la
estructura del monorepo y habría roto el build en EAS.

Lo que solo se puede comprobar en un dispositivo: los flujos de Maestro
(`maestro test apps/mobile/.maestro`) contra el APK instalado.

## Pasos de publicación

### iOS (App Store)

1. Crear el App ID `do.yugo.app` y habilitar Sign in with Apple y Push.
2. `eas build --platform ios --profile production`.
3. `eas submit --platform ios` → App Store Connect.
4. Configurar productos de suscripción (Plus y Oro; mensual, trimestral,
   anual) en un grupo de suscripción con nivel de servicio: Oro por encima de
   Plus, para que el cambio de nivel funcione con prorrateo (RF-PLU-07).
5. Completar el cuestionario de privacidad («nutrition labels») declarando:
   datos de contacto, ubicación aproximada, fotos, mensajes, identificadores y
   datos de uso; ninguno se usa para rastreo publicitario.
6. Enviar con las notas para el revisor y la cuenta de prueba.

### Android (Google Play)

1. Crear la aplicación con el paquete `do.yugo.app`.
2. `eas build --platform android --profile production` y `eas submit`.
3. Declarar en el formulario de contenido: apps de citas, contenido generado
   por usuarios con moderación, sin anuncios personalizados.
4. Completar la sección de Seguridad de los datos con las mismas categorías
   que iOS.
5. Configurar las suscripciones en Play Console con los mismos planes.
6. Publicar primero en **prueba cerrada** con las 3 iglesias aliadas de la
   beta antes de producción.

## Antes de cada envío

```bash
pnpm lint && pnpm typecheck && pnpm test   # calidad
pnpm --filter @yugo/web e2e                # flujos críticos
maestro test apps/mobile/.maestro          # flujos móviles
```

Verificar además: la versión del pacto de conducta en producción coincide con
la que muestra la app, `/legal/*` responde sin sesión, y la cuenta de prueba
del revisor sigue activa y verificada.
