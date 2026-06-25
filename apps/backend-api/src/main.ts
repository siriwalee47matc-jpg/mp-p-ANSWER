import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // Enable CORS for dashboard (3000) and extensions
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Illegal Health Ad Surveillance API')
    .setDescription('Backend API for managing illegal health product ads, WHOIS domain checking, Oryor license checks, and AI recommendations')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Backend API is running on: http://localhost:${port}`);
  console.log(`Swagger documentation is available at: http://localhost:${port}/docs`);
}
bootstrap();
