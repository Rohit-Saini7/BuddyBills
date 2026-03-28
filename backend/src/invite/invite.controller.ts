import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { InviteService } from './invite.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('invites')
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  /**
   * Create a new invite (auth required)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createInvite(@Body() body: { groupId: string }, @Req() req: any) {
    const userId = req.user.id;
    return this.inviteService.createInvite(body.groupId, userId);
  }

  /**
   * Get invite info (public — no auth required)
   * Only reveals group name, does NOT leak member info
   */
  @Get(':token')
  async getInviteInfo(@Param('token') token: string) {
    return this.inviteService.getInviteInfo(token);
  }

  /**
   * Accept an invite (auth required)
   */
  @Post(':token/accept')
  @UseGuards(JwtAuthGuard)
  async acceptInvite(@Param('token') token: string, @Req() req: any) {
    const userId = req.user.id;
    return this.inviteService.acceptInvite(token, userId);
  }
}
