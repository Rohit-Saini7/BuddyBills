import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly config: ConfigService,
  ) {}

  @Get('vapid-key')
  @UseGuards(JwtAuthGuard)
  getVapidKey() {
    return { publicKey: this.config.get<string>('VAPID_PUBLIC_KEY') || '' };
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  async subscribe(
    @Body()
    body: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    },
    @Req() req: any,
  ) {
    const userId = req.user.id;
    await this.notificationService.subscribe(userId, body);
    return { success: true };
  }

  @Delete('subscribe')
  @UseGuards(JwtAuthGuard)
  async unsubscribe(@Body() body: { endpoint: string }) {
    await this.notificationService.unsubscribe(body.endpoint);
    return { success: true };
  }
}
