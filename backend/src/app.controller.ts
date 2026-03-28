import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  private healthResponse() {
    return {
      status: 'ok',
      service: 'BuddyBills API',
      version: '2.0.0',
      serverTime: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }

  /** GET / — root health check (excluded from /api prefix) */
  @Get()
  root() {
    return this.healthResponse();
  }

  /** GET /api/health — explicit health endpoint */
  @Get('health')
  health() {
    return this.healthResponse();
  }
}
