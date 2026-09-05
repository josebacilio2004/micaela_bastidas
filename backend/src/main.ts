import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, Idempotency-Key',
  });

  // Global Exception Filter & Validation
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('MERCADO DE ABASTOS MICAELA BASTIDAS - API')
    .setDescription('API REST profesional para gestión de padrón, cobros de alcabala, agua, servicios higiénicos, caja y rendiciones.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Micaela Bastidas API Docs',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`🚀 Servidor iniciado exitosamente en http://localhost:${port}/api`);
  logger.log(`📚 Swagger OpenAPI disponible en http://localhost:${port}/api/docs`);
  logger.log(`🩺 Healthcheck disponible en http://localhost:${port}/api/health`);
}
bootstrap();
