import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.enableCors({
    origin: [process.env.WEB_URL ?? 'http://localhost:3000', /^http:\/\/localhost:\d+$/],
    credentials: true,
  });
  // La validación de entrada es de zod, por controlador (ZodPipe), para que
  // el mismo esquema valide en la API, la web y el móvil. Un ValidationPipe
  // global aquí solo pedía class-validator, que el proyecto no usa.
  app.enableShutdownHooks();

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
  Logger.log(`Yugo API listening on http://localhost:${port}/v1`, 'Bootstrap');
}

void bootstrap();
