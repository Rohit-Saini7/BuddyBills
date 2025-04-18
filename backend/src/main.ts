import { ClassSerializerInterceptor, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory, Reflector } from "@nestjs/core";
import { AppModule } from "./app.module";
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>("API_PORT") || 8000;
  const frontendUrl = configService.get<string>("FRONTEND_URL");

  app.setGlobalPrefix("api"); // Set API prefix

  // Enable CORS for your frontend origin
  app.enableCors({
    origin: frontendUrl,
  });

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      transform: true, // Transform payloads to DTO instances
    })
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Backend running on: http://localhost:${port}/api`);
}
void bootstrap();
