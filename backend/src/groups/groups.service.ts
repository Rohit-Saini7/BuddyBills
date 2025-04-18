import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
  ) { }

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
    id: string,
    updateGroupDto: UpdateGroupDto,
    userId: string,
  ): Promise<Group> {
    const group = await this.findOneById(id, userId); // Use findOneById to ensure user has access first

    // Basic check: Only allow the creator to update the group name (adjust logic as needed)
    if (group.created_by_user_id !== userId) {
      throw new ForbiddenException('Only the group creator can rename the group.');
    }

    // Merge existing group with updated data and save
    this.groupRepository.merge(group, updateGroupDto);
    return this.groupRepository.save(group);
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
    const group = await this.findOneById(groupId, requestingUserId); // Check if requester has access to the group

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
}
