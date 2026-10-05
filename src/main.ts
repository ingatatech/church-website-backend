import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { HttpExceptionFilter } from './helpers/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors();
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  const swagger = new DocumentBuilder()
    .setTitle('Church Website Management API')
    .setDescription('API for church information, ministries, services, events, sermons, announcements, FAQs, and visitor engagement.')
    .setVersion('1.0.0')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));
  await app.listen(process.env.APP_PORT ?? 3000);
  const url = await app.getUrl();
  logger.log(`Church Website API is running at: ${url}/api`);
  logger.log(`Open the API documentation: ${url}/api/docs`);
}
bootstrap().catch((error: unknown) => {
  console.error('Failed to start the Church Website API:', error);
  process.exit(1);
});
