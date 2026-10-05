import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import * as express from 'express';
import { resolve } from 'node:path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { HttpExceptionFilter } from './helpers/filters/http-exception.filter';
import { TransformInterceptor } from './helpers/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : false,
    credentials: true,
  });
  app.use((req: express.Request, _res: express.Response, next: express.NextFunction) => {
    const cookies: Record<string, string> = {};
    for (const part of (req.headers.cookie ?? '').split(';')) {
      const separator = part.indexOf('=');
      if (separator < 0) continue;
      const name = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      if (!name) continue;
      try {
        cookies[name] = decodeURIComponent(value);
      } catch {
        cookies[name] = value;
      }
    }
    (req as express.Request & { cookies: Record<string, string> }).cookies = cookies;
    next();
  });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.use(
    '/uploads',
    express.static(resolve(process.env.MEDIA_UPLOAD_DIR ?? 'uploads')),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const swagger = new DocumentBuilder()
    .setTitle('Church Website Management API')
    .setDescription(
      'API for church information, ministries, services, events, sermons, announcements, FAQs, and visitor engagement.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, swagger),
  );
  await app.listen(process.env.APP_PORT ?? 3000);
  const url = await app.getUrl();
  logger.log(`Church Website API is running at: ${url}/api`);
  logger.log(`Open the API documentation: ${url}/api/docs`);
  logger.log(
    'JWT protected routes accept: Authorization: Bearer <accessToken>',
  );
}
bootstrap().catch((error: unknown) => {
  console.error('Failed to start the Church Website API:', error);
  process.exit(1);
});
