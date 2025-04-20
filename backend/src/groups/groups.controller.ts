import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req, // Add Patch, Delete
  UseGuards, // Add HttpCode, HttpStatus
  UseInterceptors,
} from "@nestjs/common";
import { Request } from "express";
import { CreateExpenseDto } from "src/expenses/dto/create-expense.dto";
import { ExpenseResponseDto } from "src/expenses/dto/expense-response.dto";
import { ExpensesService } from "src/expenses/expenses.service";
import { BalanceResponseDto } from "src/groups/dto/balance-response.dto";
import { CreatePaymentDto } from "src/payments/dto/create-payment.dto";
import { PaymentResponseDto } from "src/payments/dto/payment-response.dto";
import { PaymentsService } from "src/payments/payments.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AddGroupMemberDto } from "./dto/add-group-member.dto"; // Import AddMember DTO
import { CreateGroupDto } from "./dto/create-group.dto";
import { GroupMemberResponseDto } from "./dto/group-member-response.dto";
import { GroupResponseDto } from "./dto/group-response.dto"; // Import Response DTOs
import { UpdateGroupDto } from "./dto/update-group.dto"; // Import Update DTO
import { GroupsService } from "./groups.service";

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string /* other JWT payload fields */ };
}

@UseGuards(JwtAuthGuard) // Apply guard to all routes
@UseInterceptors(ClassSerializerInterceptor) // Ensure responses are serialized correctly
@Controller("groups")
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly expensesService: ExpensesService,
    private readonly paymentsService: PaymentsService
  ) { }

  @Post()
  async create(
    @Body() createGroupDto: CreateGroupDto,
    @Req() req: AuthenticatedRequest
  ): Promise<GroupResponseDto> {
    const userId = req.user.userId;
    return this.groupsService.create(createGroupDto, userId);
  }

  @Get()
  async findAllMyGroups(
    @Req() req: AuthenticatedRequest
  ): Promise<GroupResponseDto[]> {
    return this.groupsService.findAllForUser(req.user.userId);
  }

  @Get(":id")
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest
  ): Promise<GroupResponseDto> {
    // Return single GroupResponseDto
    const userId = req.user.userId;
    return this.groupsService.findOneById(id, userId); // Interceptor transforms entity
  }

  @Patch(":id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateGroupDto: UpdateGroupDto,
    @Req() req: AuthenticatedRequest
  ): Promise<GroupResponseDto> {
    return this.groupsService.update(id, updateGroupDto, req.user.userId);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT) // Return 204 No Content on success
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest
  ): Promise<void> {
    return this.groupsService.remove(id, req.user.userId);
  }

  // --- Group Members ---
  @Post(":groupId/members") // Route to add member
  async addMember(
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Body() addGroupMemberDto: AddGroupMemberDto,
    @Req() req: AuthenticatedRequest
  ): Promise<GroupMemberResponseDto> {
    // Return the membership details
    return this.groupsService.addMember(
      groupId,
      addGroupMemberDto,
      req.user.userId
    );
  }

  @Get(":groupId/members") // Route to list members
  async findMembers(
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Req() req: AuthenticatedRequest
  ): Promise<GroupMemberResponseDto[]> {
    // Return list of members
    return this.groupsService.findGroupMembers(groupId, req.user.userId);
  }

  @Delete(':groupId/members/me') // Use '/me' convention for self-action
  @HttpCode(HttpStatus.NO_CONTENT)
  async leaveGroup(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.groupsService.leaveGroup(groupId, req.user.userId);
  }

  // --- DELETE /:groupId/members/:userId ---
  @Delete(':groupId/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT) // Return 204 No Content on success
  async removeMember(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('userId', ParseUUIDPipe) userIdToRemove: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    const requestingUserId = req.user.userId;
    await this.groupsService.removeMember(groupId, userIdToRemove, requestingUserId);
  }

  // --- Method to CREATE Expense within a Group ---
  @Post(":groupId/expenses") // POST /api/groups/:groupId/expenses
  async createExpense(
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Body() createExpenseDto: CreateExpenseDto,
    @Req() req: AuthenticatedRequest
  ): Promise<ExpenseResponseDto> {
    // Return type uses Response DTO
    const paidByUserId = req.user.userId;
    // Service returns Expense entity, interceptor transforms it
    return this.expensesService.createExpense(
      createExpenseDto,
      groupId,
      paidByUserId
    );
  }

  // --- Method to GET all Expenses for a Group ---
  @Get(":groupId/expenses") // GET /api/groups/:groupId/expenses
  async findAllExpensesForGroup(
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Req() req: AuthenticatedRequest
  ): Promise<ExpenseResponseDto[]> {
    // Returns an array of Response DTOs
    const requestingUserId = req.user.userId;
    // Service returns array of Expense entities, interceptor transforms them
    return this.expensesService.findAllForGroup(groupId, requestingUserId);
  }

  // --- Method to GET Group Balances ---
  @Get(":groupId/balances") // GET /api/groups/:groupId/balances
  async getGroupBalances(
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Req() req: AuthenticatedRequest
  ): Promise<BalanceResponseDto[]> {
    // Returns array of BalanceResponseDto
    const requestingUserId = req.user.userId;
    // Service method calculates balances, interceptor formats response
    return this.groupsService.getGroupBalances(groupId, requestingUserId);
  }

  // --- Method to CREATE Payment within a Group ---
  @Post(":groupId/payments") // POST /api/groups/:groupId/payments
  async createPayment(
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Body() createPaymentDto: CreatePaymentDto,
    @Req() req: AuthenticatedRequest
  ): Promise<PaymentResponseDto> {
    // Return type uses Response DTO
    const paidByUserId = req.user.userId;
    // Service returns Payment entity, interceptor transforms it
    return this.paymentsService.createPayment(
      createPaymentDto,
      groupId,
      paidByUserId
    );
  }
}
