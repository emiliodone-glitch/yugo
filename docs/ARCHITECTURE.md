# Arquitectura y decisiones

## Visión general

Cuatro superficies sobre una única API NestJS y una base PostgreSQL 16 + PostGIS:

```
[App móvil Expo] ─┐
[Web usuario]     ─┼─► [API NestJS /v1] ─► [PostgreSQL + PostGIS]
[Panel admin]     ─┤        │  ├──► [Redis: límites diarios, caché Descubrir, settings]
[Portal iglesias] ─┘        │  ├──► [S3/MinIO: fotos con URL firmada]
                            │  └──► [Moderación: Anthropic (texto) + adaptador imagen]
                            └──► [Pagos: Stripe · Azul (stub) · recibos de tiendas]
```

- `packages/shared` es la fuente única de: tipos de dominio, validadores zod, límites,
  **motor de afinidad puro**, i18n es-DO y fixtures demo. API, web y móvil lo consumen.
- `packages/ui-tokens` fija la identidad (paleta, tipografía, radios) para web y móvil.

## Decisiones y sus porqués

1. **Regla mutua de edad en SQL (RF-DES-11).** La consulta de candidatos de
   `DiscoverService` filtra en ambas direcciones dentro del `$queryRaw`
   (`edad(candidato) BETWEEN rango(viewer)` **y** `edad(viewer) BETWEEN rango(candidato)`).
   El cliente nunca es la única barrera y ningún nivel de pago la relaja (RF-PLU-09).

2. **Geografía sin columnas `Unsupported`.** Guardamos `lat/lng` como `Float` y usamos
   funciones PostGIS (`ST_DistanceSphere(ST_MakePoint(...))`) en el SQL de Descubrir.
   El esquema Prisma queda portable y las migraciones simples; la extensión se crea en
   `0001_init`. Para eventos usamos Haversine en TypeScript (agenda corta).

3. **Motor de afinidad puro y compartido.** `computeAffinity` vive en `@yugo/shared`
   con 16 pruebas; el `AffinityService` de la API solo inyecta pesos (`Setting`),
   la matriz de denominaciones y la distancia. El desglose que ve el usuario es el
   mismo que ordena la lista.

4. **Moderación previa con degradación segura.** `TextModerationService` usa la API de
   Anthropic (modelo configurable por env) y un **stub determinista por palabras clave**
   cuando no hay API key — así el pipeline completo (aprobar/retener/rechazar, avisos
   educativos, escalada 3-en-7-días) se prueba en local y en CI. Si el clasificador
   falla, el mensaje queda **HELD**, nunca se entrega sin moderar.

5. **Contadores diarios en Redis con fallback en memoria.** `CacheService` usa ioredis
   si `REDIS_URL` responde y un Map en proceso si no (dev/tests). Las claves llevan la
   fecha local de Santo Domingo, de modo que el reinicio a las 00:00 AST es exacto
   aunque el TTL sea aproximado (RF-DES-05, 7.2).

6. **Caché de Descubrir con hash de preferencias.** La lista diaria se cachea por
   `usuario + fecha local + hash(filtros, rango, distancia, viaje)`; cambiar el rango
   de edad regenera la lista sin invalidación manual (7.2).

7. **Pagos detrás de una interfaz.** `PaymentProvider` con `StripeProvider` (real),
   `AzulProvider` (stub sobre la interfaz documentada de Azul RD),
   `StoreReceiptProvider` (App Store/Google Play) y `StubProvider` solo-dev.
   Prorrateo al subir de nivel y downgrade al fin de período en `SubscriptionsService`.

8. **Auditoría append-only.** `AuditService` solo inserta; ninguna ruta actualiza ni
   borra `AuditLog` (RF-ADM-11). Toda decisión administrativa exige motivo y se audita.

9. **Modo demo en las frontends.** Con `*_DEMO_MODE=true` la web y la app móvil rinden
   la experiencia completa con los fixtures de `@yugo/shared` (mismos datos de los
   mockups). Facilita revisar UI/UX sin infraestructura y sirve de base a los E2E.

10. **Móvil con StyleSheet + tokens (NativeWind diferido).** Las pantallas usan un
    puente `lib/theme.ts` sobre `@yugo/ui-tokens`. NativeWind puede añadirse después
    sin tocar pantallas; se prefirió el camino sin fricción de configuración para el MVP.

11. **Colas.** La clasificación de mensajes corre inline (latencia objetivo < 300 ms);
    la de imágenes es asíncrona best-effort. BullMQ queda declarado como dependencia
    para mover imagen/push/correo a colas dedicadas en el hito de observabilidad.

12. **OTP y correo.** Proveedor `console` en desarrollo (el código sale en el log);
    SMTP/Mailpit para correos locales. Twilio/Resend se conectan por env sin tocar código.

## Seguridad

- Argon2 para contraseñas; JWT corto + refresh con rotación y revocación server-side.
- 2FA obligatoria para roles administrativos (RF-AUT-07) vía OTP.
- Rate limit de OTP (5/hora por identificador) contra abuso (Hito 14).
- Fotos servidas solo con URL firmada y vencimiento (RNF-04).
- Reportes críticos (menor de edad / acoso): ocultamiento preventivo del perfil y SLA 12 h (7.3).

## Estructura de la API (módulos NestJS)

`auth`, `profiles`, `catalog`, `media`, `moderation`, `discover` (affinity, límites,
ranking), `interests`, `chat` (gateway Socket.IO + rompehielos), `community`, `events`,
`verification`, `churches` (portal), `admin`, `subscriptions`, `notifications`, más
`common` (Prisma, cache, settings, auditoría, guards y decoradores).
