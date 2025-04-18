import { ValidationPipe } from "@nestjs/common"; // Import ValidationPipe
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>("API_PORT") || 8000;
  const frontendUrl = configService.get<string>("FRONTEND_URL");

  app.setGlobalPrefix("api"); // Set API prefix

  app.enableCors({
    // Enable CORS for your frontend origin
    origin: frontendUrl,
  });

  app.useGlobalPipes(
    // Enable global validation
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      transform: true, // Transform payloads to DTO instances
    })
  );

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Backend running on: http://localhost:${port}/api`);
}
void bootstrap();
