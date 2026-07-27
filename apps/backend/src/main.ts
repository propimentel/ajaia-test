import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const config = app.get(ConfigService);
  const frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:5173');
  const port = Number.parseInt(config.get<string>('PORT', '3001'), 10);

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

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
  logger.log(`Backend listening on http://0.0.0.0:${port}`);
  logger.log(`CORS allow-list: ${frontendUrl}`);
}

void bootstrap();
