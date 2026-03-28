import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as webPush from 'web-push';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const vapidPublicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const vapidEmail =
      this.config.get<string>('VAPID_EMAIL') || 'mailto:admin@buddybills.app';

    if (vapidPublicKey && vapidPrivateKey) {
      webPush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
    }
  }

  /**
   * Store a push subscription for a user
   */
  async subscribe(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }

  /**
   * Remove a push subscription
   */
  async unsubscribe(endpoint: string) {
    try {
      await this.prisma.pushSubscription.delete({
        where: { endpoint },
      });
    } catch {
      // Ignore if not found
    }
  }

  /**
   * Send push notification to all members of a group, excluding a specific user
   */
  async sendToGroup(
    groupId: string,
    title: string,
    body: string,
    excludeUserId?: string,
  ) {
    // Get all group members
    const members = await this.prisma.groupMember.findMany({
      where: { groupId, deleted: false },
      select: { userId: true },
    });

    const userIds = members
      .map((m) => m.userId)
      .filter((id) => id !== excludeUserId);

    if (userIds.length === 0) return;

    // Get all push subscriptions for these users
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId: { in: userIds } },
    });

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: { groupId },
    });

    // Send to all subscriptions, clean up invalid ones
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          );
        } catch (error: any) {
          // Remove expired/invalid subscriptions
          if (error?.statusCode === 404 || error?.statusCode === 410) {
            await this.prisma.pushSubscription.delete({
              where: { id: sub.id },
            });
          }
          throw error;
        }
      }),
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    return { sent, failed };
  }
}
