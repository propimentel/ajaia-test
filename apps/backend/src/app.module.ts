import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { PrismaModule } from './prisma/prisma.module';
import { DocumentsModule } from './documents/documents.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    // Serve the built SPA from /app/public. The static handler serves
    // files at the root and falls back to index.html for unknown paths
    // (so client-side routes work). /api/* is excluded so the controllers
    // below can handle the API.
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
      exclude: ['/api/(.*)'],
    }),
    PrismaModule,
    DocumentsModule,
    HealthModule,
  ],
})
export class AppModule {}
