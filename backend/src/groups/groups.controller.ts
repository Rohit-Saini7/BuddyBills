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
  Req,
  UseGuards,
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
import { AddGroupMemberDto } from "./dto/add-group-member.dto";
import { CreateGroupDto } from "./dto/create-group.dto";
import { GroupMemberResponseDto } from "./dto/group-member-response.dto";
import { GroupResponseDto } from "./dto/group-response.dto";
import { UpdateGroupDto } from "./dto/update-group.dto";
import { GroupsService } from "./groups.service";

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string };
}

@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
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
    const userId = req.user.userId;
    return this.groupsService.findOneById(id, userId);
  }

  @Patch(":id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateGroupDto: UpdateGroupDto,
    @Req() req: AuthenticatedRequest
  ): Promise<GroupResponseDto> {
    return this.groupsService.update(id, updateGroupDto, req.user.userId);
  }

  //* --- Group Members ---
  @Post(":groupId/members")
  async addMember(
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Body() addGroupMemberDto: AddGroupMemberDto,
    @Req() req: AuthenticatedRequest
  ): Promise<GroupMemberResponseDto> {
    return this.groupsService.addMember(
      groupId,
      addGroupMemberDto,
      req.user.userId
    );
  }

  @Get(":groupId/members")
  async findMembers(
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Req() req: AuthenticatedRequest
  ): Promise<GroupMemberResponseDto[]> {
    return this.groupsService.findGroupMembers(groupId, req.user.userId);
  }

  //* --- Method to DELETE a Group ---
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGroup(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest
  ): Promise<void> {
    const requestingUserId = req.user.userId;
    await this.groupsService.deleteGroup(id, requestingUserId);
  }

  //* --- Method to RESTORE a Soft-Deleted Group ---
  @Patch(":id/restore")
  @HttpCode(HttpStatus.NO_CONTENT)
  async restoreGroup(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest
  ): Promise<void> {
    const requestingUserId = req.user.userId;
    await this.groupsService.restoreGroup(id, requestingUserId);
  }

  //* --- DELETE /:groupId/members/me ---
  @Delete(":groupId/members/me")
  @HttpCode(HttpStatus.NO_CONTENT)
  async leaveGroup(
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Req() req: AuthenticatedRequest
  ): Promise<void> {
    await this.groupsService.leaveGroup(groupId, req.user.userId);
  }

  //* --- DELETE /:groupId/members/:userId ---
  @Delete(":groupId/members/:userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Param("userId", ParseUUIDPipe) userIdToRemove: string,
    @Req() req: AuthenticatedRequest
  ): Promise<void> {
    const requestingUserId = req.user.userId;
    await this.groupsService.removeMember(
      groupId,
      userIdToRemove,
      requestingUserId
    );
  }

  //* --- Method to CREATE Expense within a Group ---
  @Post(":groupId/expenses")
  async createExpense(
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Body() createExpenseDto: CreateExpenseDto,
    @Req() req: AuthenticatedRequest
  ): Promise<ExpenseResponseDto> {
    const paidByUserId = req.user.userId;

    return this.expensesService.createExpense(
      createExpenseDto,
      groupId,
      paidByUserId
    );
  }

  //* --- Method to GET all Expenses for a Group ---
  @Get(":groupId/expenses")
  async findAllExpensesForGroup(
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Req() req: AuthenticatedRequest
  ): Promise<ExpenseResponseDto[]> {
    const requestingUserId = req.user.userId;

    return this.expensesService.findAllForGroup(groupId, requestingUserId);
  }

  //* --- Method to GET Group Balances ---
  @Get(":groupId/balances")
  async getGroupBalances(
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Req() req: AuthenticatedRequest
  ): Promise<BalanceResponseDto[]> {
    const requestingUserId = req.user.userId;

    return this.groupsService.getGroupBalances(groupId, requestingUserId);
  }

  //* --- Method to CREATE Payment within a Group ---
  @Post(":groupId/payments")
  async createPayment(
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Body() createPaymentDto: CreatePaymentDto,
    @Req() req: AuthenticatedRequest
  ): Promise<PaymentResponseDto> {
    const paidByUserId = req.user.userId;

    return this.paymentsService.createPayment(
      createPaymentDto,
      groupId,
      paidByUserId
    );
  }

  //* --- Method to GET Soft-Deleted Groups created by the user ---
  @Get("deleted/mine")
  async findMyDeletedGroups(
    @Req() req: AuthenticatedRequest
  ): Promise<GroupResponseDto[]> {
    const requestingUserId = req.user.userId;

    return this.groupsService.findDeletedGroupsForCreator(requestingUserId);
  }
}
