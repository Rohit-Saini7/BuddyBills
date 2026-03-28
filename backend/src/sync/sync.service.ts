import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';

// Basic payload interfaces for RxDB HTTP replication
export interface PushRequestRow {
  assumedMasterState?: any;
  newDocumentState: any;
}

export interface PushMessage {
  pushRow: PushRequestRow[];
}

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notification: NotificationService,
  ) {}

  /**
   * Get the group IDs that a user belongs to
   */
  private async getUserGroupIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId, deleted: false },
      select: { groupId: true },
    });
    return memberships.map((m) => m.groupId);
  }

  /**
   * PULL endpoint: Fetches documents modified after `lastCheckpoint`
   * Filtered to only return data for groups the user belongs to.
   */
  async pull(
    collectionName: string,
    minTimestamp: number,
    limit: number,
    userId?: string,
  ) {
    const updatedAt = new Date(minTimestamp);
    const userGroupIds = userId ? await this.getUserGroupIds(userId) : [];

    let documents = [];

    switch (collectionName) {
      case 'groups':
        documents = await this.prisma.group.findMany({
          where: {
            updatedAt: { gt: updatedAt },
            ...(userId && { id: { in: userGroupIds } }),
          },
          orderBy: { updatedAt: 'asc' },
          take: limit,
        });
        break;
      case 'group_members': {
        const rawMembers = await this.prisma.groupMember.findMany({
          where: {
            updatedAt: { gt: updatedAt },
            ...(userId && { groupId: { in: userGroupIds } }),
          },
          orderBy: { updatedAt: 'asc' },
          take: limit,
        });

        // Determine which userIds might be valid UUIDs
        // (to fetch their display names from the users table)
        const possibleUserIds = rawMembers
          .map((m) => m.userId)
          .filter((id) => id.length === 36);

        let userMap = new Map<string, string>();
        if (possibleUserIds.length > 0) {
          const users = await this.prisma.user.findMany({
            where: { id: { in: possibleUserIds } },
            select: { id: true, name: true, email: true },
          });
          userMap = new Map(
            users.map((u) => [u.id, u.name || u.email || u.id])
          );
        }

        // Attach userName explicitly for the frontend payload
        documents = rawMembers.map((m) => ({
          ...m,
          userName: userMap.get(m.userId) || m.userId,
        }));
        break;
      }
      case 'expenses':
        documents = await this.prisma.expense.findMany({
          where: {
            updatedAt: { gt: updatedAt },
            ...(userId && { groupId: { in: userGroupIds } }),
          },
          orderBy: { updatedAt: 'asc' },
          take: limit,
        });
        break;
      case 'expense_splits':
        documents = await this.prisma.expenseSplit.findMany({
          where: {
            updatedAt: { gt: updatedAt },
            ...(userId && {
              expense: { groupId: { in: userGroupIds } },
            }),
          },
          orderBy: { updatedAt: 'asc' },
          take: limit,
        });
        break;
      case 'settlements':
        documents = await this.prisma.settlement.findMany({
          where: {
            updatedAt: { gt: updatedAt },
            ...(userId && { groupId: { in: userGroupIds } }),
          },
          orderBy: { updatedAt: 'asc' },
          take: limit,
        });
        break;
      default:
        throw new BadRequestException(
          `Collection ${collectionName} not supported`,
        );
    }

    // Format documents for RxDB
    const formattedDocs = documents.map((doc) => ({
      ...doc,
      updatedAt: doc.updatedAt.toISOString(),
    }));

    const lastDoc = documents[documents.length - 1];

    return {
      documents: formattedDocs,
      checkpoint: lastDoc
        ? { updatedAt: lastDoc.updatedAt.getTime() }
        : { updatedAt: minTimestamp },
    };
  }

  /**
   * PUSH endpoint: Accepts local modifications and merges them using Last-Write-Wins (LWW)
   */
  async push(
    collectionName: string,
    pushRows: PushRequestRow[],
    userId?: string,
  ) {
    const conflicts: any[] = [];

    for (const row of pushRows) {
      const doc = row.newDocumentState;
      const clientUpdatedAt = new Date(doc.updatedAt);

      try {
        switch (collectionName) {
          case 'groups':
            await this.prisma.group.upsert({
              where: { id: doc.id },
              update: {
                name: doc.name,
                description: doc.description,
                deleted: doc.deleted,
                updatedAt: clientUpdatedAt,
              },
              create: {
                id: doc.id,
                name: doc.name,
                description: doc.description,
                deleted: doc.deleted,
                updatedAt: clientUpdatedAt,
              },
            });
            break;

          case 'group_members':
            await this.prisma.groupMember.upsert({
              where: { id: doc.id },
              update: {
                groupId: doc.groupId,
                userId: doc.userId,
                role: doc.role,
                deleted: doc.deleted,
                updatedAt: clientUpdatedAt,
              },
              create: {
                id: doc.id,
                groupId: doc.groupId,
                userId: doc.userId,
                role: doc.role,
                deleted: doc.deleted,
                updatedAt: clientUpdatedAt,
              },
            });
            break;

          case 'expenses':
            await this.prisma.expense.upsert({
              where: { id: doc.id },
              update: {
                groupId: doc.groupId,
                paidById: doc.paidById,
                amount: doc.amount,
                description: doc.description,
                splitType: doc.splitType || 'EQUAL',
                deleted: doc.deleted,
                updatedAt: clientUpdatedAt,
              },
              create: {
                id: doc.id,
                groupId: doc.groupId,
                paidById: doc.paidById,
                amount: doc.amount,
                description: doc.description,
                splitType: doc.splitType || 'EQUAL',
                deleted: doc.deleted,
                updatedAt: clientUpdatedAt,
              },
            });
            break;

          case 'expense_splits':
            await this.prisma.expenseSplit.upsert({
              where: { id: doc.id },
              update: {
                expenseId: doc.expenseId,
                userId: doc.userId,
                amount: doc.amount,
                deleted: doc.deleted,
                updatedAt: clientUpdatedAt,
              },
              create: {
                id: doc.id,
                expenseId: doc.expenseId,
                userId: doc.userId,
                amount: doc.amount,
                deleted: doc.deleted,
                updatedAt: clientUpdatedAt,
              },
            });
            break;

          case 'settlements':
            await this.prisma.settlement.upsert({
              where: { id: doc.id },
              update: {
                groupId: doc.groupId,
                fromUserId: doc.fromUserId,
                toUserId: doc.toUserId,
                amount: doc.amount,
                note: doc.note,
                deleted: doc.deleted,
                updatedAt: clientUpdatedAt,
              },
              create: {
                id: doc.id,
                groupId: doc.groupId,
                fromUserId: doc.fromUserId,
                toUserId: doc.toUserId,
                amount: doc.amount,
                note: doc.note,
                deleted: doc.deleted,
                updatedAt: clientUpdatedAt,
              },
            });
            break;

          default:
            throw new BadRequestException(
              `Collection ${collectionName} not supported`,
            );
        }
      } catch (e) {
        console.error(`Error detected during push for item ${doc.id} in collection ${collectionName}:`, e);
        throw new BadRequestException(
          `Database error during push for item ${doc.id}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }

    // Send push notifications for expenses and settlements (fire-and-forget)
    if (userId && conflicts.length === 0) {
      for (const row of pushRows) {
        const doc = row.newDocumentState;
        if (doc.deleted) continue; // Skip deletions

        try {
          if (collectionName === 'expenses') {
            this.notification
              .sendToGroup(
                doc.groupId,
                'New Expense',
                `₹${doc.amount} — ${doc.description}`,
                userId,
              )
              .catch(() => {});
          } else if (collectionName === 'settlements') {
            this.notification
              .sendToGroup(
                doc.groupId,
                'Payment Recorded',
                `₹${doc.amount} settlement`,
                userId,
              )
              .catch(() => {});
          }
        } catch {
          // Notifications are best-effort
        }
      }
    }

    return conflicts;
  }
}
