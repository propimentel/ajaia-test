import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const config = app.get(ConfigService);
  const port = Number.parseInt(config.get<string>('PORT', '3001'), 10);
  const frontendUrl = config.get<string>('FRONTEND_URL');

  // In production, the SPA is served from the same origin as the API
  // (single Cloud Run service), so the browser makes same-origin
  // requests and CORS does not apply. The allow-list is still
  // configurable for tooling and future cross-origin clients.
  app.enableCors({
    origin: frontendUrl ?? true,
    credentials: true,
  });

  // All controllers are mounted under /api so they don't collide with
  // the static SPA served at the root.
  app.setGlobalPrefix('api');

  // ValidationPipe is kept enabled so that future DTOs (declared as classes with
  // class-validator decorators, or registered at the backend) can be validated.
  // The shared types are interfaces today (no runtime metadata), so this is a
  // pass-through until a backend-local class DTO is introduced.
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: false,
      forbidNonWhitelisted: false,
    }),
  );

  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`Ajaia app listening on http://0.0.0.0:${port}`);
  if (frontendUrl) {
    logger.log(`CORS allow-list: ${frontendUrl}`);
  } else {
    logger.log('CORS: any origin');
  }
}

void bootstrap();
