import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Expense } from "src/expenses/entities/expense.entity";
import { BalanceResponseDto } from "src/groups/dto/balance-response.dto";
import { MemberRemovalType } from "src/groups/dto/member-removal-type.enum";
import { Payment } from "src/payments/entities/payment.entity";
import { In, IsNull, Not, Repository, UpdateResult } from "typeorm";
import { User } from "../users/entities/user.entity";
import { AddGroupMemberDto } from "./dto/add-group-member.dto";
import { CreateGroupDto } from "./dto/create-group.dto";
import { UpdateGroupDto } from "./dto/update-group.dto";
import { GroupMember } from "./entities/group-member.entity";
import { Group } from "./entities/group.entity";

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepository: Repository<GroupMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>
  ) { }

  async isMember(groupId: string, userId: string): Promise<boolean> {
    const membership = await this.groupMemberRepository.findOneBy({
      group_id: groupId,
      user_id: userId,
    });
    return !!membership;
  }

  //* --- FIND Active Groups for User (Refined) ---
  async findAllForUser(userId: string): Promise<Group[]> {
    const activeMemberships = await this.groupMemberRepository.find({
      select: ["group_id"],
      where: {
        user_id: userId,
        deletedAt: IsNull(),
      },
    });

    if (!activeMemberships || activeMemberships.length === 0) {
      return [];
    }

    const groupIds = activeMemberships.map((m) => m.group_id);

    const activeGroups = await this.groupRepository.find({
      where: {
        id: In(groupIds),
        deletedAt: IsNull(),
      },
      order: {
        createdAt: "DESC",
      },
    });

    return activeGroups;
  }

  //* --- FIND One Group by ID (with Access Check) ---
  async findOneById(id: string, userId: string): Promise<Group> {
    const group = await this.groupRepository.findOneBy({ id });

    if (!group) {
      throw new NotFoundException(`Group with ID "${id}" not found.`);
    }

    const membership = await this.groupMemberRepository.findOneBy({
      group_id: id,
      user_id: userId,
    });

    if (!membership) {
      throw new ForbiddenException("You do not have access to this group.");
    }

    return group;
  }

  //* --- CREATE Group ---
  async create(createGroupDto: CreateGroupDto, userId: string): Promise<Group> {
    const group = this.groupRepository.create({
      ...createGroupDto,
      created_by_user_id: userId,
    });

    const savedGroup = await this.groupRepository.save(group);

    const creatorMembership = this.groupMemberRepository.create({
      user_id: userId,
      group_id: savedGroup.id,
    });
    await this.groupMemberRepository.save(creatorMembership);

    return savedGroup;
  }

  //* --- UPDATE Group ---
  async update(
    groupId: string,
    updateGroupDto: UpdateGroupDto,
    requestingUserId: string
  ): Promise<Group> {
    const group = await this.findOneById(groupId, requestingUserId);

    if (group.created_by_user_id !== requestingUserId) {
      throw new ForbiddenException(
        "Only the group creator can rename the group."
      );
    }

    if (updateGroupDto.name !== undefined) {
      if (!updateGroupDto.name.trim()) {
        throw new BadRequestException("Group name cannot be empty.");
      }
      group.name = updateGroupDto.name.trim();
    } else {
      return group;
    }

    try {
      return await this.groupRepository.save(group);
    } catch (error) {
      console.error("Error saving updated group:", error);
      throw new InternalServerErrorException("Could not update group name.");
    }
  }

  //* --- DELETE Group ---
  async deleteGroup(groupId: string, requestingUserId: string): Promise<void> {
    const group = await this.groupRepository.findOneBy({ id: groupId });
    if (!group) {
      throw new NotFoundException(`Group with ID "${groupId}" not found.`);
    }

    if (group.created_by_user_id !== requestingUserId) {
      throw new ForbiddenException(
        "Only the group creator can delete this group."
      );
    }

    const balances = await this.getGroupBalances(groupId, requestingUserId);
    const tolerance = 0.01;
    const isSettled = balances.every(
      (balance) => Math.abs(balance.netBalance) < tolerance
    );

    if (!isSettled) {
      throw new BadRequestException(
        "Cannot delete group. All members must be settled up (balances must be zero) first."
      );
    }

    try {
      await this.groupRepository.softRemove(group);
    } catch (error) {
      console.error(`Failed to soft delete group ${groupId}:`, error);
      throw new InternalServerErrorException("Could not delete group.");
    }
  }

  //* --- RESTORE Soft-Deleted Group (by Creator) ---
  async restoreGroup(groupId: string, requestingUserId: string): Promise<void> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      withDeleted: true,
    });

    if (!group) {
      throw new NotFoundException(`Group with ID "${groupId}" not found.`);
    }

    if (!group.deletedAt) {
      throw new BadRequestException(`Group "${groupId}" is already active.`);
    }

    if (group.created_by_user_id !== requestingUserId) {
      throw new ForbiddenException(
        "Only the group creator can restore this group."
      );
    }

    let restoreResult: UpdateResult;
    try {
      restoreResult = await this.groupRepository.restore({ id: groupId });
    } catch (error) {
      console.error(`Failed to restore group ${groupId}:`, error);
      throw new InternalServerErrorException("Could not restore group.");
    }
    if (restoreResult.affected === 0) {
      throw new InternalServerErrorException(
        `Group "${groupId}" could not be restored.`
      );
    }
  }

  //* --- ADD Group Member ---
  async addMember(
    groupId: string,
    addGroupMemberDto: AddGroupMemberDto,
    requestingUserId: string
  ): Promise<GroupMember> {
    const group = await this.groupRepository.findOneBy({ id: groupId });
    if (!group) throw new NotFoundException(`Group "${groupId}" not found.`);
    if (group.created_by_user_id !== requestingUserId) {
      throw new ForbiddenException("Only the group creator can add members.");
    }

    const userToAdd = await this.userRepository.findOneBy({
      email: addGroupMemberDto.email,
    });
    if (!userToAdd) {
      throw new NotFoundException(
        `User with email "${addGroupMemberDto.email}" not found.`
      );
    }

    if (userToAdd.id === requestingUserId) {
      throw new BadRequestException("Creator is already implicitly a member.");
    }

    const existingMembership = await this.groupMemberRepository.findOne({
      where: {
        group_id: groupId,
        user_id: userToAdd.id,
      },
      withDeleted: true,
    });

    if (existingMembership) {
      if (existingMembership.deletedAt === null) {
        throw new BadRequestException(
          `User "${addGroupMemberDto.email}" is already an active member of this group.`
        );
      } else {
        existingMembership.deletedAt = null;
        existingMembership.removalType = null;
        existingMembership.removedByUserId = null;

        try {
          return await this.groupMemberRepository.save(existingMembership);
        } catch (error) {
          console.error("Error reactivating member:", error);
          throw new InternalServerErrorException(
            "Could not reactivate member."
          );
        }
      }
    } else {
      const newMembership = this.groupMemberRepository.create({
        group_id: groupId,
        user_id: userToAdd.id,
      });
      try {
        return await this.groupMemberRepository.save(newMembership);
      } catch (error) {
        console.error("Error adding new member:", error);
        throw new InternalServerErrorException("Could not add new member.");
      }
    }
  }

  //* --- Find Group Members (Include Soft-Deleted) ---
  async findGroupMembers(
    groupId: string,
    requestingUserId: string
  ): Promise<GroupMember[]> {
    const requesterMembership = await this.groupMemberRepository.findOne({
      where: { group_id: groupId, user_id: requestingUserId },
      withDeleted: true,
    });
    if (!requesterMembership || requesterMembership.deletedAt) {
      throw new ForbiddenException(
        "You do not have access to view members of this group."
      );
    }

    return this.groupMemberRepository.find({
      where: { group_id: groupId },
      withDeleted: true,
      relations: ["user"],
      order: {
        deletedAt: "ASC",
        joinedAt: "ASC",
      },
    });
  }

  //* --- REMOVE Member from Group (by Creator) ---
  async removeMember(
    groupId: string,
    userIdToRemove: string,
    requestingUserId: string
  ): Promise<void> {
    const group = await this.groupRepository.findOneBy({ id: groupId });
    if (!group) {
      throw new NotFoundException(`Group with ID "${groupId}" not found.`);
    }

    if (group.created_by_user_id !== requestingUserId) {
      throw new ForbiddenException(
        "Only the group creator can remove members."
      );
    }

    if (userIdToRemove === requestingUserId) {
      throw new BadRequestException(
        "Creator cannot remove themselves using this method. Consider deleting the group."
      );
    }

    const membership = await this.groupMemberRepository.findOne({
      where: { group_id: groupId, user_id: userIdToRemove },
      withDeleted: true,
    });

    if (!membership)
      throw new NotFoundException(`User "${userIdToRemove}" is not a member.`);
    if (membership.deletedAt)
      throw new BadRequestException(
        `User "${userIdToRemove}" is already removed/inactive in this group.`
      );

    membership.deletedAt = new Date();
    membership.removalType = MemberRemovalType.REMOVED_BY_CREATOR;
    membership.removedByUserId = requestingUserId;

    try {
      await this.groupMemberRepository.save(membership);
    } catch (error) {
      console.error("Error soft deleting member:", error);
      throw new InternalServerErrorException("Could not remove member.");
    }
  }

  //* --- LEAVE Group (Soft Delete by Member) ---
  async leaveGroup(groupId: string, requestingUserId: string): Promise<void> {
    const group = await this.groupRepository.findOneBy({ id: groupId });
    if (!group) throw new NotFoundException(`Group "${groupId}" not found.`);

    if (group.created_by_user_id === requestingUserId) {
      throw new BadRequestException(
        "Group creator cannot leave the group. Please delete the group instead."
      );
    }

    const membership = await this.groupMemberRepository.findOne({
      where: { group_id: groupId, user_id: requestingUserId },
      withDeleted: true,
    });

    if (!membership)
      throw new NotFoundException(
        `You are not a member of group "${groupId}".`
      );
    if (membership.deletedAt)
      throw new BadRequestException(`You are already inactive in this group.`);

    membership.deletedAt = new Date();
    membership.removalType = MemberRemovalType.LEFT_VOLUNTARILY;
    membership.removedByUserId = null;

    try {
      await this.groupMemberRepository.save(membership);
    } catch (error) {
      console.error("Error leaving group:", error);
      throw new InternalServerErrorException("Could not leave group.");
    }
  }

  //* --- Calculate Group Balances (Based on Active Members) ---
  async getGroupBalances(
    groupId: string,
    requestingUserId: string
  ): Promise<BalanceResponseDto[]> {
    await this.findOneById(groupId, requestingUserId);

    const allMemberships = await this.groupMemberRepository.find({
      where: { group_id: groupId },
      relations: ["user"],
      withDeleted: true,
    });
    if (!allMemberships || allMemberships.length === 0) return [];

    const expenses = await this.expenseRepository.find({
      where: { group_id: groupId },
      withDeleted: true,
    });

    const expensesWithSplits = await this.expenseRepository.find({
      where: { group_id: groupId },
      relations: ["splits"],
    });
    const splits = expensesWithSplits.flatMap((e) => e.splits);
    const payments = await this.paymentRepository.find({
      where: { group_id: groupId },
    });
    const deletedExpenseIds = new Set(
      expenses.filter((e) => e.deletedAt !== null).map((e) => e.id)
    );

    const balances: { [userId: string]: number } = {};

    const involvedUserIds = new Set([
      ...expenses.map((e) => e.paid_by_user_id),
      ...splits.map((s) => s.owed_by_user_id),
      ...payments.map((p) => p.paid_by_user_id),
      ...payments.map((p) => p.paid_to_user_id),
    ]);
    involvedUserIds.forEach((id) => {
      balances[id] = 0;
    });

    expenses.forEach((expense) => {
      if (
        expense.deletedAt === null &&
        balances.hasOwnProperty(expense.paid_by_user_id)
      ) {
        balances[expense.paid_by_user_id] += Number(expense.amount);
      }
    });

    splits.forEach((split) => {
      if (
        !deletedExpenseIds.has(split.expense_id) &&
        balances.hasOwnProperty(split.owed_by_user_id)
      ) {
        balances[split.owed_by_user_id] -= Number(split.amount);
      }
    });

    payments.forEach((payment) => {
      const amount =
        typeof payment.amount === "string"
          ? parseFloat(payment.amount)
          : payment.amount;

      if (balances.hasOwnProperty(payment.paid_by_user_id)) {
        balances[payment.paid_by_user_id] -= amount;
      }

      if (balances.hasOwnProperty(payment.paid_to_user_id)) {
        balances[payment.paid_to_user_id] += amount;
      }
    });

    const balanceResponse: BalanceResponseDto[] = [];
    allMemberships.forEach((member) => {
      if (member.deletedAt === null) {
        const userId = member.user_id;
        const netBalance = Math.round((balances[userId] || 0) * 100) / 100;
        balanceResponse.push({
          user: member.user,
          netBalance: netBalance,
        });
      }
    });

    balanceResponse.sort((a, b) =>
      (a.user.name || a.user.email).localeCompare(b.user.name || b.user.email)
    );

    return balanceResponse;
  }

  //* --- Find Deleted Groups Created By User ---
  async findDeletedGroupsForCreator(
    requestingUserId: string
  ): Promise<Group[]> {
    return this.groupRepository.find({
      where: {
        created_by_user_id: requestingUserId,
        deletedAt: Not(IsNull()),
      },
      withDeleted: true,
      order: {
        deletedAt: "DESC",
      },
    });
  }
}
