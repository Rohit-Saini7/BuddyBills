import { ClassSerializerInterceptor, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory, Reflector } from "@nestjs/core";
import { AppModule } from "./app.module";

export async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>("API_PORT") || 8000;
  const frontendUrl = configService.get<string>("FRONTEND_URL");

  app.setGlobalPrefix("api");

  app.enableCors({
    origin: frontendUrl,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  await app.listen(port);
  console.info(`Backend running on: http://localhost:${port}/api`);
}

if (require.main === module) {
  void bootstrap();
}
