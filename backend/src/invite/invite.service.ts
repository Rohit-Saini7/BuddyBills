import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class InviteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new invite for a group.
   * Uses crypto.randomBytes(32) for a 64-char hex token — cryptographically unguessable.
   */
  async createInvite(groupId: string, createdBy: string) {
    // Verify the group exists
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, name: true, deleted: true },
    });

    if (!group || group.deleted) {
      throw new NotFoundException('Group not found');
    }

    // Verify the user is a member of the group
    const membership = await this.prisma.groupMember.findFirst({
      where: { groupId, userId: createdBy, deleted: false },
    });

    if (!membership) {
      throw new BadRequestException('You are not a member of this group');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

    const invite = await this.prisma.groupInvite.create({
      data: {
        groupId,
        token,
        createdBy,
        expiresAt,
      },
    });

    return {
      token: invite.token,
      expiresAt: invite.expiresAt,
      groupName: group.name,
    };
  }

  /**
   * Get invite info (public — no auth required).
   * Only reveals group name, not members or other sensitive data.
   */
  async getInviteInfo(token: string) {
    const invite = await this.prisma.groupInvite.findUnique({
      where: { token },
      include: {
        group: { select: { name: true, description: true, deleted: true } },
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.group.deleted) {
      throw new BadRequestException('This group no longer exists');
    }

    if (invite.usedAt) {
      return {
        groupName: invite.group.name,
        description: invite.group.description,
        status: 'used' as const,
        expired: false,
      };
    }

    const expired = invite.expiresAt ? new Date() > invite.expiresAt : false;

    return {
      groupName: invite.group.name,
      description: invite.group.description,
      status: expired ? ('expired' as const) : ('valid' as const),
      expired,
    };
  }

  /**
   * Accept an invite — adds the user as a group member.
   */
  async acceptInvite(token: string, userId: string) {
    const invite = await this.prisma.groupInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.usedAt) {
      throw new BadRequestException('This invite has already been used');
    }

    if (invite.expiresAt && new Date() > invite.expiresAt) {
      throw new BadRequestException('This invite has expired');
    }

    // Check if user is already a member
    const existing = await this.prisma.groupMember.findFirst({
      where: { groupId: invite.groupId, userId, deleted: false },
    });

    if (existing) {
      return { groupId: invite.groupId, alreadyMember: true };
    }

    // Add user as member + mark invite used (in a transaction)
    await this.prisma.$transaction([
      this.prisma.groupMember.create({
        data: {
          groupId: invite.groupId,
          userId,
          role: 'MEMBER',
        },
      }),
      this.prisma.groupInvite.update({
        where: { id: invite.id },
        data: {
          usedAt: new Date(),
          usedBy: userId,
        },
      }),
    ]);

    return { groupId: invite.groupId, alreadyMember: false };
  }
}
