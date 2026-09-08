import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // La raíz queda fuera del prefijo para que abrir el dominio pelado diga
  // «la API está viva» en vez de un 404 (ver RootController).
  app.setGlobalPrefix('v1', { exclude: ['/'] });
  app.useGlobalInterceptors(new LoggingInterceptor());
  // La API autentica solo con tokens Bearer (nunca cookies), así que el
  // origen del navegador no es una frontera de seguridad: otro sitio no puede
  // leer los tokens guardados en el origen de Yugo. Restringirlo a WEB_URL
  // solo producía «no carga nada» cuando la variable no coincidía con el
  // dominio real de la web. Se refleja el origen, como ya hacía el gateway
  // del chat. WEB_URL sigue sirviendo para los enlaces que la API genera.
  app.enableCors({ origin: true });
  // Detrás del proxy de Railway, la IP real viene en X-Forwarded-For. Sin
  // esto, req.ip era la del proxy y el límite de intentos de entrada (10 por
  // hora) era un solo contador para todos los usuarios a la vez.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  // La validación de entrada es de zod, por controlador (ZodPipe), para que
  // el mismo esquema valide en la API, la web y el móvil. Un ValidationPipe
  // global aquí solo pedía class-validator, que el proyecto no usa.
  app.enableShutdownHooks();

  // Railway y la mayoría de las plataformas inyectan PORT; API_PORT queda
  // para desarrollo local. Escuchar en 0.0.0.0 es obligatorio en contenedor.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`Yugo API listening on http://localhost:${port}/v1`, 'Bootstrap');
  if (process.env.RAILWAY_ENVIRONMENT) {
    // Lo que más veces ha fallado en Railway es que el dominio público apunta
    // a un puerto distinto del que escucha la API. Dejarlo dicho en el log
    // ahorra adivinar.
    Logger.log(
      `En Railway, el dominio público de este servicio debe apuntar al puerto ${port} ` +
        `(Settings → Networking). Si no coincide, añade la variable PORT con el puerto del dominio.`,
      'Bootstrap',
    );
  }
}

void bootstrap();
