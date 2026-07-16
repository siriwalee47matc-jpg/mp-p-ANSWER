import { config as loadEnvironment } from 'dotenv';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';

loadEnvironment({ path: resolve(__dirname, '../.env') });

async function bootstrap() {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required in production.');
  }

  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  const allowedOrigins = [
    'http://localhost:3000',
    'https://sentinel-ads-ssk.vercel.app',
    ...(process.env.CORS_ORIGINS || '').split(','),
  ]
    .map((origin) => origin.trim())
    .filter(Boolean);

  const isProduction = process.env.NODE_ENV === 'production';

  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.startsWith('chrome-extension://') ||
        (!isProduction && /https?:\/\/localhost(:\d+)?$/.test(origin))
      ) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin is not allowed by CORS'));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
    optionsSuccessStatus: 204,
    maxAge: 86400,
    credentials: false,
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));

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
