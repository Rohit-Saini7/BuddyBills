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

    @InjectRepository(GroupMember) // Inject GroupMember repository
    private readonly groupMemberRepository: Repository<GroupMember>,

    @InjectRepository(User) // Inject User repository (Needs UsersModule setup)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    // @InjectRepository(ExpenseSplit)
    // private readonly expenseSplitRepository: Repository<ExpenseSplit>,
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
    await this.findOneById(groupId, requestingUserId); // Check if requester has access to the group

    // Find the user to add by email
    const userToAdd = await this.userRepository.findOneBy({ email: addGroupMemberDto.email });
    if (!userToAdd) {
      throw new NotFoundException(`User with email "${addGroupMemberDto.email}" not found.`);
    }

    // Check if user is already a member
    const existingMembership = await this.groupMemberRepository.findOneBy({
      group_id: groupId,
      user_id: userToAdd.id
    });
    if (existingMembership) {
      throw new BadRequestException(`User "${addGroupMemberDto.email}" is already a member of this group.`);
    }

    // Add the new member
    const newMembership = this.groupMemberRepository.create({
      group_id: groupId,
      user_id: userToAdd.id,
    });
    return this.groupMemberRepository.save(newMembership);
  }

  // --- Find Group Members (Helper/Potential Endpoint) ---
  async findGroupMembers(groupId: string, requestingUserId: string): Promise<GroupMember[]> {
    // First, ensure the requesting user is part of the group
    await this.findOneById(groupId, requestingUserId);

    // Then, fetch all members with user details
    return this.groupMemberRepository.find({
      where: { group_id: groupId },
      relations: ['user'], // Load the nested user object for each member
    });
  }

  // --- Calculate Group Balances ---
  async getGroupBalances(groupId: string, requestingUserId: string): Promise<BalanceResponseDto[]> {
    // 1. Verify access and get members (includes user details)
    const members = await this.findGroupMembers(groupId, requestingUserId);
    if (!members || members.length === 0) {
      return []; // No members, no balances
    }
    members.map(m => m.user_id);

    // 2. Fetch relevant financial data for this group
    const expenses = await this.expenseRepository.find({ where: { group_id: groupId }, withDeleted: true });
    // const splits = await this.expenseSplitRepository.find({ where: { group_id: groupId } }); // Assumes group_id is on splits - if not, join through expense
    // NOTE: If group_id isn't directly on ExpenseSplit, you'd fetch splits via expense relations:
    const expensesWithSplits = await this.expenseRepository.find({ where: { group_id: groupId }, relations: ['splits'] });
    const splits = expensesWithSplits.flatMap(e => e.splits);

    const payments = await this.paymentRepository.find({ where: { group_id: groupId } });
    const deletedExpenseIds = new Set(
      expenses.filter(e => e.deletedAt !== null).map(e => e.id)
    );
    // 3. Calculate net balance for each member
    const balances: { [userId: string]: number } = {};
    members.forEach(member => {
      balances[member.user_id] = 0; // Initialize balance for all members
    });

    // Process Expenses (Money Paid Out By User -> Increases Balance)
    expenses.forEach(expense => {
      // Ensure payer is still considered part of the group context for balance calculation
      if (expense.deletedAt === null && balances.hasOwnProperty(expense.paid_by_user_id)) {
        // Convert amount back to number if necessary (depends on entity/transformer)
        const amount = typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount;
        balances[expense.paid_by_user_id] += amount;
      }
    });

    // Process Expense Splits (Share Owed By User -> Decreases Balance)
    splits.forEach(split => {
      // Ensure the person owing is still considered part of the group context
      if (!deletedExpenseIds.has(split.expense_id) && balances.hasOwnProperty(split.owed_by_user_id)) {
        const amount = typeof split.amount === 'string' ? parseFloat(split.amount) : split.amount;
        balances[split.owed_by_user_id] -= amount;
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

    // 4. Format the output using the DTO
    const balanceResponse: BalanceResponseDto[] = members.map(member => {
      // Round to 2 decimal places to avoid floating point representation issues in JSON
      const netBalance = Math.round(balances[member.user_id] * 100) / 100;
      return {
        user: member.user, // Pass the nested user object (ClassSerializerInterceptor handles transforming it)
        netBalance: netBalance,
      };
    });

    return balanceResponse;
  }
}
