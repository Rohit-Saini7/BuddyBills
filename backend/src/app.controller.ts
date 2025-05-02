import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  constructor() { }

  @Get("/health") //* /api/health
  getHealth(): { status: string; time: string } {
    return { status: "ok", time: new Date().toISOString() };
  }
}
