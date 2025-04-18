// backend/src/app.controller.ts
import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller() // Will be accessed via /api/ due to global prefix
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("/health") // Endpoint will be /api/health
  getHealth(): { status: string; time: string } {
    return { status: "ok", time: new Date().toISOString() };
  }
}
