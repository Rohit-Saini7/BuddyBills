import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { SplitType } from "src/expenses/dto/expense-split.type";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateExpenseDto } from "../expenses/dto/create-expense.dto";
import { Expense } from "../expenses/entities/expense.entity";
import { ExpensesService } from "../expenses/expenses.service";
import { CreatePaymentDto } from "../payments/dto/create-payment.dto";
import { Payment } from "../payments/entities/payment.entity";
import { PaymentsService } from "../payments/payments.service";
import { AddGroupMemberDto } from "./dto/add-group-member.dto";
import { BalanceResponseDto } from "./dto/balance-response.dto";
import { CreateGroupDto } from "./dto/create-group.dto";
import { UpdateGroupDto } from "./dto/update-group.dto";
import { GroupMember } from "./entities/group-member.entity";
import { Group } from "./entities/group.entity";
import { GroupsController } from "./groups.controller";
import { GroupsService } from "./groups.service";

//* --- Mocks ---
const mockGroupsService = {
  create: jest.fn(),
  findAllForUser: jest.fn(),
  findOneById: jest.fn(),
  update: jest.fn(),
  addMember: jest.fn(),
  findGroupMembers: jest.fn(),
  deleteGroup: jest.fn(),
  restoreGroup: jest.fn(),
  leaveGroup: jest.fn(),
  removeMember: jest.fn(),
  getGroupBalances: jest.fn(),
  findDeletedGroupsForCreator: jest.fn(),
};

const mockExpensesService = {
  createExpense: jest.fn(),
  findAllForGroup: jest.fn(),
};

const mockPaymentsService = {
  createPayment: jest.fn(),
};

const mockJwtAuthGuard = {
  canActivate: jest.fn().mockReturnValue(true),
};

describe("GroupsController", () => {
  let controller: GroupsController;
  let groupsService: typeof mockGroupsService;
  let expensesService: typeof mockExpensesService;
  let paymentsService: typeof mockPaymentsService;

  //* --- Mock Data ---
  const mockUserId = "user-controller-uuid-1";
  const mockUserEmail = "controller@test.com";
  const mockGroupId = "group-controller-uuid-1";
  const mockMemberId = "member-controller-uuid-1";
  const mockExpenseId = "expense-controller-uuid-1";
  const mockPaymentId = "payment-controller-uuid-1";
  const mockOtherUserId = "other-user-controller-uuid-1";

  const mockUserPayload: any = {
    id: mockUserId,
    userId: mockUserId,
    google_id: mockGroupId,
    email: mockUserEmail,
    name: "",
    avatar_url: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    createdGroups: [],
    groupMemberships: [],
    paidExpenses: [],
    paymentsMade: [],
    paymentsReceived: [],
  };
  const mockRequest: any = {
    user: mockUserPayload,
  };

  const mockGroup: Partial<Group> = {
    id: mockGroupId,
    name: "Test Group Ctrl",
    created_by_user_id: mockUserId,
  };
  const mockGroupMember: Partial<GroupMember> = {
    id: mockMemberId,
    group_id: mockGroupId,
    user_id: mockOtherUserId,
  };
  const mockExpense: Partial<Expense> = {
    id: mockExpenseId,
    group_id: mockGroupId,
    paid_by_user_id: mockUserId,
    amount: 100,
  };
  const mockPayment: Partial<Payment> = {
    id: mockPaymentId,
    group_id: mockGroupId,
    paid_by_user_id: mockUserId,
    paid_to_user_id: mockOtherUserId,
    amount: 50,
  };
  const mockBalance: BalanceResponseDto = {
    user: mockUserPayload as any,
    netBalance: 50,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupsController],
      providers: [
        { provide: GroupsService, useValue: mockGroupsService },
        { provide: ExpensesService, useValue: mockExpensesService },
        { provide: PaymentsService, useValue: mockPaymentsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)

      .compile();

    controller = module.get<GroupsController>(GroupsController);
    groupsService = module.get(GroupsService);
    expensesService = module.get(ExpensesService);
    paymentsService = module.get(PaymentsService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  //* --- Group CRUD ---
  describe("create", () => {
    it("should call groupsService.create and return the result", async () => {
      const createDto: CreateGroupDto = { name: "New Group Name" };
      mockGroupsService.create.mockResolvedValue(mockGroup);

      const result = await controller.create(createDto, mockRequest);

      expect(result).toEqual(mockGroup);
      expect(groupsService.create).toHaveBeenCalledTimes(1);
      expect(groupsService.create).toHaveBeenCalledWith(createDto, mockUserId);
    });
  });

  describe("findAllMyGroups", () => {
    it("should call groupsService.findAllForUser and return the result", async () => {
      const groups = [mockGroup];
      mockGroupsService.findAllForUser.mockResolvedValue(groups);

      const result = await controller.findAllMyGroups(mockRequest);

      expect(result).toEqual(groups);
      expect(groupsService.findAllForUser).toHaveBeenCalledTimes(1);
      expect(groupsService.findAllForUser).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe("findOne", () => {
    it("should call groupsService.findOneById and return the result", async () => {
      mockGroupsService.findOneById.mockResolvedValue(mockGroup);

      const result = await controller.findOne(mockGroupId, mockRequest);

      expect(result).toEqual(mockGroup);
      expect(groupsService.findOneById).toHaveBeenCalledTimes(1);
      expect(groupsService.findOneById).toHaveBeenCalledWith(
        mockGroupId,
        mockUserId
      );
    });

    it("should propagate NotFoundException from service", async () => {
      const error = new NotFoundException();
      mockGroupsService.findOneById.mockRejectedValue(error);

      await expect(
        controller.findOne(mockGroupId, mockRequest)
      ).rejects.toThrow(NotFoundException);
      expect(groupsService.findOneById).toHaveBeenCalledWith(
        mockGroupId,
        mockUserId
      );
    });
  });

  describe("update", () => {
    it("should call groupsService.update and return the result", async () => {
      const updateDto: UpdateGroupDto = { name: "Updated Name" };
      const updatedGroup = { ...mockGroup, name: "Updated Name" };
      mockGroupsService.update.mockResolvedValue(updatedGroup);

      const result = await controller.update(
        mockGroupId,
        updateDto,
        mockRequest
      );

      expect(result).toEqual(updatedGroup);
      expect(groupsService.update).toHaveBeenCalledTimes(1);
      expect(groupsService.update).toHaveBeenCalledWith(
        mockGroupId,
        updateDto,
        mockUserId
      );
    });
  });

  describe("deleteGroup", () => {
    it("should call groupsService.deleteGroup", async () => {
      mockGroupsService.deleteGroup.mockResolvedValue(undefined);

      await controller.deleteGroup(mockGroupId, mockRequest);

      expect(groupsService.deleteGroup).toHaveBeenCalledTimes(1);
      expect(groupsService.deleteGroup).toHaveBeenCalledWith(
        mockGroupId,
        mockUserId
      );
    });

    it("should propagate ForbiddenException from service", async () => {
      const error = new ForbiddenException();
      mockGroupsService.deleteGroup.mockRejectedValue(error);

      await expect(
        controller.deleteGroup(mockGroupId, mockRequest)
      ).rejects.toThrow(ForbiddenException);
      expect(groupsService.deleteGroup).toHaveBeenCalledWith(
        mockGroupId,
        mockUserId
      );
    });
  });

  describe("restoreGroup", () => {
    it("should call groupsService.restoreGroup", async () => {
      mockGroupsService.restoreGroup.mockResolvedValue(undefined);

      await controller.restoreGroup(mockGroupId, mockRequest);

      expect(groupsService.restoreGroup).toHaveBeenCalledTimes(1);
      expect(groupsService.restoreGroup).toHaveBeenCalledWith(
        mockGroupId,
        mockUserId
      );
    });
  });

  //* --- Member Management ---
  describe("addMember", () => {
    it("should call groupsService.addMember and return the result", async () => {
      const addDto: AddGroupMemberDto = { email: "member@test.com" };
      mockGroupsService.addMember.mockResolvedValue(mockGroupMember);

      const result = await controller.addMember(
        mockGroupId,
        addDto,
        mockRequest
      );

      expect(result).toEqual(mockGroupMember);
      expect(groupsService.addMember).toHaveBeenCalledTimes(1);
      expect(groupsService.addMember).toHaveBeenCalledWith(
        mockGroupId,
        addDto,
        mockUserId
      );
    });
  });

  describe("findMembers", () => {
    it("should call groupsService.findGroupMembers and return the result", async () => {
      const members = [mockGroupMember];
      mockGroupsService.findGroupMembers.mockResolvedValue(members);

      const result = await controller.findMembers(mockGroupId, mockRequest);

      expect(result).toEqual(members);
      expect(groupsService.findGroupMembers).toHaveBeenCalledTimes(1);
      expect(groupsService.findGroupMembers).toHaveBeenCalledWith(
        mockGroupId,
        mockUserId
      );
    });
  });

  describe("leaveGroup", () => {
    it("should call groupsService.leaveGroup", async () => {
      mockGroupsService.leaveGroup.mockResolvedValue(undefined);

      await controller.leaveGroup(mockGroupId, mockRequest);

      expect(groupsService.leaveGroup).toHaveBeenCalledTimes(1);
      expect(groupsService.leaveGroup).toHaveBeenCalledWith(
        mockGroupId,
        mockUserId
      );
    });
  });

  describe("removeMember", () => {
    it("should call groupsService.removeMember", async () => {
      mockGroupsService.removeMember.mockResolvedValue(undefined);

      await controller.removeMember(mockGroupId, mockOtherUserId, mockRequest);

      expect(groupsService.removeMember).toHaveBeenCalledTimes(1);
      expect(groupsService.removeMember).toHaveBeenCalledWith(
        mockGroupId,
        mockOtherUserId,
        mockUserId
      );
    });
  });

  //* --- Related Entities (Expenses, Payments, Balances) ---
  describe("createExpense", () => {
    it("should call expensesService.createExpense and return the result", async () => {
      const createDto: CreateExpenseDto = {
        description: "Test Exp",
        amount: 10,
        transaction_date: "2025-05-01",
        split_type: SplitType.EQUAL,
      };
      mockExpensesService.createExpense.mockResolvedValue(mockExpense);

      const result = await controller.createExpense(
        mockGroupId,
        createDto,
        mockRequest
      );

      expect(result).toEqual(mockExpense);
      expect(expensesService.createExpense).toHaveBeenCalledTimes(1);
      expect(expensesService.createExpense).toHaveBeenCalledWith(
        createDto,
        mockGroupId,
        mockUserId
      );
    });
  });

  describe("findAllExpensesForGroup", () => {
    it("should call expensesService.findAllForGroup and return the result", async () => {
      const expenses = [mockExpense];
      mockExpensesService.findAllForGroup.mockResolvedValue(expenses);

      const result = await controller.findAllExpensesForGroup(
        mockGroupId,
        mockRequest
      );

      expect(result).toEqual(expenses);
      expect(expensesService.findAllForGroup).toHaveBeenCalledTimes(1);
      expect(expensesService.findAllForGroup).toHaveBeenCalledWith(
        mockGroupId,
        mockUserId
      );
    });
  });

  describe("getGroupBalances", () => {
    it("should call groupsService.getGroupBalances and return the result", async () => {
      const balances = [mockBalance];
      mockGroupsService.getGroupBalances.mockResolvedValue(balances);

      const result = await controller.getGroupBalances(
        mockGroupId,
        mockRequest
      );

      expect(result).toEqual(balances);
      expect(groupsService.getGroupBalances).toHaveBeenCalledTimes(1);
      expect(groupsService.getGroupBalances).toHaveBeenCalledWith(
        mockGroupId,
        mockUserId
      );
    });
  });

  describe("createPayment", () => {
    it("should call paymentsService.createPayment and return the result", async () => {
      const createDto: CreatePaymentDto = {
        paid_to_user_id: mockOtherUserId,
        amount: 50,
        payment_date: "2025-05-01",
      };
      mockPaymentsService.createPayment.mockResolvedValue(mockPayment);

      const result = await controller.createPayment(
        mockGroupId,
        createDto,
        mockRequest
      );

      expect(result).toEqual(mockPayment);
      expect(paymentsService.createPayment).toHaveBeenCalledTimes(1);
      expect(paymentsService.createPayment).toHaveBeenCalledWith(
        createDto,
        mockGroupId,
        mockUserId
      );
    });
  });

  //* --- Deleted Groups ---
  describe("findMyDeletedGroups", () => {
    it("should call groupsService.findDeletedGroupsForCreator and return the result", async () => {
      const deletedGroups = [mockGroup];
      mockGroupsService.findDeletedGroupsForCreator.mockResolvedValue(
        deletedGroups
      );

      const result = await controller.findMyDeletedGroups(mockRequest);

      expect(result).toEqual(deletedGroups);
      expect(groupsService.findDeletedGroupsForCreator).toHaveBeenCalledTimes(
        1
      );
      expect(groupsService.findDeletedGroupsForCreator).toHaveBeenCalledWith(
        mockUserId
      );
    });
  });
});
