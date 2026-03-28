import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SyncService, PushMessage } from './sync.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get(':collectionName')
  async pull(
    @Param('collectionName') collectionName: string,
    @Query('minTimestamp') minTimestamp: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    const timestamp = minTimestamp ? parseInt(minTimestamp, 10) : 0;
    const take = limit ? parseInt(limit, 10) : 50;
    const userId = req.user?.id;
    return this.syncService.pull(collectionName, timestamp, take, userId);
  }

  @Post(':collectionName')
  async push(
    @Param('collectionName') collectionName: string,
    @Body() pushMessage: PushMessage,
    @Req() req: any,
  ) {
    console.log(`\n\n[PUSH] Collection: ${collectionName}`);
    console.log('[PUSH] Payload:', JSON.stringify(pushMessage, null, 2));

    if (!pushMessage || !pushMessage.pushRow) {
      console.log('[PUSH] Malformed payload, returning empty array');
      return []; // Return empty conflicts if payload is malformed
    }
    const userId = req.user?.id;
    console.log(`[PUSH] Expected PushRows:`, pushMessage.pushRow.length);
    const conflicts = await this.syncService.push(
      collectionName,
      pushMessage.pushRow,
      userId,
    );
    console.log(`[PUSH] Conflicts:`, conflicts.length);
    return conflicts;
  }
}
