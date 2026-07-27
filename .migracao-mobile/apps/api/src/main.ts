import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http/http-exception.filter';

function resolveCorsOrigin(corsOrigin: string | undefined): boolean | string[] {
  if (!corsOrigin || corsOrigin.trim().length === 0 || corsOrigin.trim() === '*') {
    return true;
  }

  return corsOrigin
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: resolveCorsOrigin(process.env.CORS_ORIGIN),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}

void bootstrap();
