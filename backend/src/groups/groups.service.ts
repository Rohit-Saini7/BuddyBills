import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Expense } from 'src/expenses/entities/expense.entity';
import { BalanceResponseDto } from 'src/groups/dto/balance-response.dto';
import { MemberRemovalType } from 'src/groups/dto/member-removal-type.enum';
import { Payment } from 'src/payments/entities/payment.entity';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity'; // Import User entity
import { AddGroupMemberDto } from './dto/add-group-member.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupMember } from './entities/group-member.entity'; // Import GroupMember
import { Group } from './entities/group.entity';

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
    private readonly paymentRepository: Repository<Payment>,

  ) { }

  async isMember(groupId: string, userId: string): Promise<boolean> {
    const membership = await this.groupMemberRepository.findOneBy({
      group_id: groupId,
      user_id: userId,
    });
    return !!membership; // Return true if membership exists, false otherwise
  }

  // --- CREATE Group ---
  async create(createGroupDto: CreateGroupDto, userId: string): Promise<Group> {
    // Create the group entity instance
    const group = this.groupRepository.create({
      ...createGroupDto,
      created_by_user_id: userId,
    });
    // Save the group to the database
    const savedGroup = await this.groupRepository.save(group);

    // Automatically add the creator as the first member
    const creatorMembership = this.groupMemberRepository.create({
      user_id: userId,
      group_id: savedGroup.id,
      // role: 'admin' // If you add roles later
    });
    await this.groupMemberRepository.save(creatorMembership);

    return savedGroup; // Return the created group
  }

  // --- FIND Groups for User ---
  // (This should find groups the user is a MEMBER of, not just created)
  async findAllForUser(userId: string): Promise<Group[]> {
    // Find group memberships for the user
    const memberships = await this.groupMemberRepository.find({
      where: { user_id: userId },
      relations: ['group'], // Load the related group data for each membership
      order: { group: { createdAt: 'DESC' } } // Order by group creation date
    });

    // Extract the group objects from the memberships
    return memberships.map(member => member.group);
  }

  // --- FIND One Group by ID (with Access Check) ---
  async findOneById(id: string, userId: string): Promise<Group> {
    const group = await this.groupRepository.findOneBy({ id });

    if (!group) {
      throw new NotFoundException(`Group with ID "${id}" not found.`);
    }

    // Check if the requesting user is a member of this group
    const membership = await this.groupMemberRepository.findOneBy({
      group_id: id,
      user_id: userId
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this group.');
    }

    // Optionally load relations if needed for the response
    // const groupWithDetails = await this.groupRepository.findOne({
    //   where: { id },
    //   relations: ['members', 'members.user', 'createdBy'] // Example: Load members and creator
    // });
    // return groupWithDetails;

    return group;
  }

  // --- UPDATE Group ---
  async update(
    groupId: string, // Renamed parameter for clarity
    updateGroupDto: UpdateGroupDto,
    requestingUserId: string,
  ): Promise<Group> {
    // 1. Find group & check basic membership access first
    const group = await this.findOneById(groupId, requestingUserId);

    // 2. Authorization: Check if the requester is the original creator
    if (group.created_by_user_id !== requestingUserId) {
      throw new ForbiddenException('Only the group creator can rename the group.');
    }

    // 3. Apply updates from DTO (only 'name' in this case)
    // Using merge + save ensures @UpdateDateColumn works automatically
    if (updateGroupDto.name !== undefined) {
      // Optional: Add check here if name is empty string after trim if needed
      if (!updateGroupDto.name.trim()) {
        throw new BadRequestException('Group name cannot be empty.');
      }
      group.name = updateGroupDto.name.trim();
    } else {
      // If no relevant fields are provided in the DTO for update
      return group; // Return the unchanged group
    }


    // 4. Save the updated group entity
    try {
      return await this.groupRepository.save(group);
    } catch (error) {
      console.error("Error saving updated group:", error);
      throw new InternalServerErrorException('Could not update group name.');
    }
  }

  // --- DELETE Group ---
  async remove(id: string, userId: string): Promise<void> {
    const group = await this.findOneById(id, userId); // Use findOneById to ensure user has access

    // Basic check: Only allow the creator to delete the group (adjust logic as needed)
    if (group.created_by_user_id !== userId) {
      throw new ForbiddenException('Only the group creator can delete the group.');
    }

    await this.groupRepository.remove(group); // TypeORM handles cascading deletes based on entity relations/DB constraints
  }

  // --- ADD Group Member ---
  async addMember(
    groupId: string,
    addGroupMemberDto: AddGroupMemberDto,
    requestingUserId: string,
  ): Promise<GroupMember> {
    // 1. Find group and verify requester is the creator
    const group = await this.groupRepository.findOneBy({ id: groupId });
    if (!group) throw new NotFoundException(`Group "${groupId}" not found.`);
    if (group.created_by_user_id !== requestingUserId) {
      throw new ForbiddenException('Only the group creator can add members.');
    }

    // 2. Find the user to add by email
    const userToAdd = await this.userRepository.findOneBy({ email: addGroupMemberDto.email });
    if (!userToAdd) {
      throw new NotFoundException(`User with email "${addGroupMemberDto.email}" not found.`);
    }

    // Cannot add the creator (they are added automatically on group creation)
    if (userToAdd.id === requestingUserId) {
      throw new BadRequestException('Creator is already implicitly a member.');
    }

    // 3. Check for ANY existing membership (active or soft-deleted)
    const existingMembership = await this.groupMemberRepository.findOne({
      where: {
        group_id: groupId,
        user_id: userToAdd.id,
      },
      withDeleted: true,
    });

    // 4. Handle based on existing membership status
    if (existingMembership) {
      if (existingMembership.deletedAt === null) {
        // Membership exists and is ACTIVE
        throw new BadRequestException(`User "${addGroupMemberDto.email}" is already an active member of this group.`);
      } else {
        // Membership exists but is INACTIVE (soft-deleted) - Reactivate it!
        existingMembership.deletedAt = null;
        existingMembership.removalType = null;
        existingMembership.removedByUserId = null;
        // We keep the original joinedAt date

        try {
          // Save the existing record with nulled fields to reactivate
          return await this.groupMemberRepository.save(existingMembership);
        } catch (error) {
          console.error("Error reactivating member:", error);
          throw new InternalServerErrorException('Could not reactivate member.');
        }
      }
    } else {
      // No previous membership found - Create a new one
      const newMembership = this.groupMemberRepository.create({
        group_id: groupId,
        user_id: userToAdd.id,
        // joinedAt is set by default by the database/entity
      });
      try {
        return await this.groupMemberRepository.save(newMembership);
      } catch (error) {
        // Handle potential unique constraint violation if race condition happened (unlikely)
        console.error("Error adding new member:", error);
        throw new InternalServerErrorException('Could not add new member.');
      }
    }
  }

  // --- Find Group Members (Include Soft-Deleted) ---
  async findGroupMembers(groupId: string, requestingUserId: string): Promise<GroupMember[]> {
    // 1. Ensure requesting user is (or was) part of the group to view members
    //    (Or just check if they are currently active?) Let's allow viewing if ever a member.
    //    Need a check here - findOneById checks active membership. Let's check manually.
    const requesterMembership = await this.groupMemberRepository.findOne({
      where: { group_id: groupId, user_id: requestingUserId },
      withDeleted: true // Allow even inactive members to view member list? Or only active? Let's allow active only.
    });
    if (!requesterMembership || requesterMembership.deletedAt) { // Check active status
      throw new ForbiddenException('You do not have access to view members of this group.');
    }
    // NOTE: findOneById used previously also works if that's preferred

    // 2. Fetch all members (active and inactive) with user details
    return this.groupMemberRepository.find({
      where: { group_id: groupId },
      withDeleted: true,
      relations: ['user'],
      order: {
        deletedAt: 'ASC',
        joinedAt: 'ASC'
      }
    });
  }

  // --- REMOVE Member from Group (by Creator) ---
  async removeMember(
    groupId: string,
    userIdToRemove: string,
    requestingUserId: string,
  ): Promise<void> {

    // 1. Find the group first
    const group = await this.groupRepository.findOneBy({ id: groupId });
    if (!group) {
      throw new NotFoundException(`Group with ID "${groupId}" not found.`);
    }

    // 2. Authorization: Check if the requester is the group creator
    if (group.created_by_user_id !== requestingUserId) {
      throw new ForbiddenException('Only the group creator can remove members.');
    }

    // 3. Prevent creator from removing themselves via this method
    if (userIdToRemove === requestingUserId) {
      throw new BadRequestException('Creator cannot remove themselves using this method. Use "Leave Group" or "Delete Group" functionality.');
    }

    // 4. Find the specific membership record to delete
    const membership = await this.groupMemberRepository.findOne({
      where: { group_id: groupId, user_id: userIdToRemove },
      withDeleted: true // Check even if already deleted to prevent double action/give correct error
    });

    if (!membership) throw new NotFoundException(`User "${userIdToRemove}" is not a member.`);
    if (membership.deletedAt) throw new BadRequestException(`User "${userIdToRemove}" is already removed/inactive in this group.`); // Already deleted

    // 5. Delete the membership record
    membership.deletedAt = new Date();
    membership.removalType = MemberRemovalType.REMOVED_BY_CREATOR;
    membership.removedByUserId = requestingUserId;

    try {
      await this.groupMemberRepository.save(membership); // Save updates deletedAt automatically via decorator? Or sets it here. Let's assume save works.
      // If save doesn't trigger @DeleteDateColumn logic, use softRemove after save:
      // await this.groupMemberRepository.softRemove(membership); // This might overwrite deletedAt again
      // Let's rely on save() updating the deletedAt field we manually set.
    } catch (error) {
      console.error("Error soft deleting member:", error);
      throw new InternalServerErrorException('Could not remove member.');
    }

    // Note: This action doesn't automatically settle balances involving the removed user.
    // Their past contributions/splits will still exist until expenses are deleted/edited,
    // but they won't be included in *future* equal splits or balance calculations run after removal.
  }

  // --- LEAVE Group (Soft Delete by Member) ---
  async leaveGroup(groupId: string, requestingUserId: string): Promise<void> {
    // 1. Find group (needed for creator check)
    const group = await this.groupRepository.findOneBy({ id: groupId });
    if (!group) throw new NotFoundException(`Group "${groupId}" not found.`);

    // 2. Prevent creator from leaving (they should delete the group) - adjust rule if needed
    if (group.created_by_user_id === requestingUserId) {
      throw new BadRequestException('Group creator cannot leave the group. Please delete the group instead.');
      // Alternative: Allow leaving if not last member, but need logic to reassign creator or handle ownerless groups? Simpler to restrict for now.
    }

    // 3. Find the user's membership record
    const membership = await this.groupMemberRepository.findOne({
      where: { group_id: groupId, user_id: requestingUserId },
      withDeleted: true
    });

    if (!membership) throw new NotFoundException(`You are not a member of group "${groupId}".`);
    if (membership.deletedAt) throw new BadRequestException(`You are already inactive in this group.`);

    // 4. Perform SOFT delete
    membership.deletedAt = new Date();
    membership.removalType = MemberRemovalType.LEFT_VOLUNTARILY;
    membership.removedByUserId = null; // User initiated it themselves

    try {
      await this.groupMemberRepository.save(membership);
    } catch (error) {
      console.error("Error leaving group:", error);
      throw new InternalServerErrorException('Could not leave group.');
    }
  }

  // --- Calculate Group Balances (Based on Active Members) ---
  async getGroupBalances(groupId: string, requestingUserId: string): Promise<BalanceResponseDto[]> {
    // 1. Verify access (implicitly checks active membership via findOneById/isMember)
    await this.findOneById(groupId, requestingUserId); // Or use isMember check

    // 2. Get *ALL* members (active and inactive) to find their user IDs for filtering financial later if needed
    const allMemberships = await this.groupMemberRepository.find({
      where: { group_id: groupId },
      relations: ['user'], // Need user details for the final output
      withDeleted: true,
    });
    if (!allMemberships || allMemberships.length === 0) return [];

    // 3. Fetch relevant financial data
    const expenses = await this.expenseRepository.find({ where: { group_id: groupId }, withDeleted: true });
    // const splits = await this.expenseSplitRepository.find({ where: { group_id: groupId } }); // Assumes group_id is on splits - if not, join through expense
    // NOTE: If group_id isn't directly on ExpenseSplit, you'd fetch splits via expense relations:
    const expensesWithSplits = await this.expenseRepository.find({ where: { group_id: groupId }, relations: ['splits'] });
    const splits = expensesWithSplits.flatMap(e => e.splits);
    const payments = await this.paymentRepository.find({ where: { group_id: groupId } });
    const deletedExpenseIds = new Set(expenses.filter(e => e.deletedAt !== null).map(e => e.id));

    // 4. Calculate net balance for *ALL* users involved in financial for this group
    const balances: { [userId: string]: number } = {};

    // Initialize balances for involved users
    const involvedUserIds = new Set([
      ...expenses.map(e => e.paid_by_user_id),
      ...splits.map(s => s.owed_by_user_id),
      ...payments.map(p => p.paid_by_user_id),
      ...payments.map(p => p.paid_to_user_id)
    ]);
    involvedUserIds.forEach(id => { balances[id] = 0; });

    // Process NON-DELETED Expenses
    expenses.forEach(expense => {
      if (expense.deletedAt === null && balances.hasOwnProperty(expense.paid_by_user_id)) {
        balances[expense.paid_by_user_id] += Number(expense.amount);
      }
    });

    // Process NON-DELETED Expense Splits
    splits.forEach(split => {
      if (!deletedExpenseIds.has(split.expense_id) && balances.hasOwnProperty(split.owed_by_user_id)) {
        balances[split.owed_by_user_id] -= Number(split.amount);
      }
    });

    // Process Payments (Money Sent -> Decreases Balance; Money Received -> Increases Balance)
    payments.forEach(payment => {
      const amount = typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount;
      // Check if payer is relevant to current group balance context
      if (balances.hasOwnProperty(payment.paid_by_user_id)) {
        balances[payment.paid_by_user_id] -= amount;
      }
      // Check if payee is relevant to current group balance context
      if (balances.hasOwnProperty(payment.paid_to_user_id)) {
        balances[payment.paid_to_user_id] += amount;
      }
    });

    // 5. Format output ONLY for members who are CURRENTLY ACTIVE
    const balanceResponse: BalanceResponseDto[] = [];
    allMemberships.forEach(member => {
      // Include only if the member is currently active (not soft-deleted)
      if (member.deletedAt === null) {
        const userId = member.user_id;
        const netBalance = Math.round((balances[userId] || 0) * 100) / 100; // Default to 0 if user had no activity
        balanceResponse.push({
          user: member.user, // Pass the nested user object
          netBalance: netBalance,
        });
      }
    });

    // Optionally sort the final response
    balanceResponse.sort((a, b) => (a.user.name || a.user.email).localeCompare(b.user.name || b.user.email));

    return balanceResponse;
  }
}
