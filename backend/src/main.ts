import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api', {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });
  app.enableCors(); // Needed for frontend Next.js on port 3000 to interact
  const port = process.env.API_PORT ?? 8000;
  await app.listen(port);
  console.log(`\n🚀 BuddyBills API running at http://localhost:${port}`);
  console.log(`   Health: http://localhost:${port}/api/health\n`);
}
bootstrap();
