import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode, HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req, // Add Patch, Delete
  UseGuards, // Add HttpCode, HttpStatus
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddGroupMemberDto } from './dto/add-group-member.dto'; // Import AddMember DTO
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupMemberResponseDto } from './dto/group-member-response.dto';
import { GroupResponseDto } from './dto/group-response.dto'; // Import Response DTOs
import { UpdateGroupDto } from './dto/update-group.dto'; // Import Update DTO
import { GroupsService } from './groups.service';

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string; /* other JWT payload fields */ };
}

@UseGuards(JwtAuthGuard) // Apply guard to all routes
@UseInterceptors(ClassSerializerInterceptor) // Ensure responses are serialized correctly
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) { }

  @Post()
  async create(
    @Body() createGroupDto: CreateGroupDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<GroupResponseDto> {
    const userId = req.user.userId;
    return this.groupsService.create(createGroupDto, userId);
  }

  @Get()
  async findAllMyGroups(@Req() req: AuthenticatedRequest): Promise<GroupResponseDto[]> {
    return this.groupsService.findAllForUser(req.user.userId);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<GroupResponseDto> { // Return single GroupResponseDto
    const userId = req.user.userId;
    return this.groupsService.findOneById(id, userId); // Interceptor transforms entity
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateGroupDto: UpdateGroupDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<GroupResponseDto> {
    return this.groupsService.update(id, updateGroupDto, req.user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // Return 204 No Content on success
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.groupsService.remove(id, req.user.userId);
  }

  // --- Group Members ---
  @Post(':groupId/members') // Route to add member
  async addMember(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() addGroupMemberDto: AddGroupMemberDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<GroupMemberResponseDto> { // Return the membership details
    return this.groupsService.addMember(groupId, addGroupMemberDto, req.user.userId);
  }

  @Get(':groupId/members') // Route to list members
  async findMembers(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<GroupMemberResponseDto[]> { // Return list of members
    return this.groupsService.findGroupMembers(groupId, req.user.userId);
  }

  // --- Add DELETE /:groupId/members/:userId later ---
}
