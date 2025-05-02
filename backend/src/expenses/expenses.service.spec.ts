import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, ObjectLiteral, Repository } from "typeorm";

import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { CreateExpenseDto } from "src/expenses/dto/create-expense.dto";
import { UpdateExpenseDto } from "src/expenses/dto/update-expense.dto";
import { GroupMember } from "src/groups/entities/group-member.entity";
import { Group } from "src/groups/entities/group.entity";
import { GroupsService } from "../groups/groups.service";
import { User } from "../users/entities/user.entity";
import { SplitType } from "./dto/expense-split.type";
import { ExpenseSplit } from "./entities/expense-split.entity";
import { Expense } from "./entities/expense.entity";
import { ExpensesService } from "./expenses.service";

type MockRepository<T extends ObjectLiteral = any> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;
const createMockRepository = <
  T extends ObjectLiteral = any,
>(): MockRepository<T> => ({
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  softRemove: jest.fn(),
  softDelete: jest.fn(),
  findOneOrFail: jest.fn(),
});

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
const createMockDataSource = () => ({
  createQueryRunner: jest.fn().mockReturnValue({
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      findOneOrFail: jest.fn(),
    },
  }),
});

describe("ExpensesService", () => {
  let service: ExpensesService;
  let mockExpenseRepository: MockRepository<Expense>;
  let mockGroupsService: Partial<Record<keyof GroupsService, jest.Mock>>;
  let mockDataSource: ReturnType<typeof createMockDataSource>;
  let mockQueryRunner: ReturnType<
    ReturnType<typeof createMockDataSource>["createQueryRunner"]
  >;
  let mockQueryRunnerManager: ReturnType<
    ReturnType<
      ReturnType<typeof createMockDataSource>["createQueryRunner"]
    >["manager"]
  >;

  const mockGroupId = "group-abc";
  const mockPayerId = "user-1";
  const mockMembers: GroupMember[] = [
    {
      group_id: mockGroupId,
      user_id: "user-1",
      joinedAt: new Date(),
      id: "1",
      user: {} as any,
      group: {} as any,
      removedBy: null,
    },
    {
      group_id: mockGroupId,
      user_id: "user-2",
      joinedAt: new Date(),
      id: "2",
      user: {} as any,
      group: {} as any,
      removedBy: null,
    },
    {
      group_id: mockGroupId,
      user_id: "user-3",
      joinedAt: new Date(),
      id: "3",
      user: {} as any,
      group: {} as any,
      removedBy: null,
    },
  ];

  beforeAll(() => {
    console.error = jest.fn();
  });

  beforeEach(async () => {
    //* --- Create mock service instance ---
    mockGroupsService = {
      findGroupMembers: jest.fn(),
      findOneById: jest.fn(),
      isMember: jest.fn(),
    };

    //* --- Create the mock runner and manager objects directly ---
    const manager = {
      save: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      findOneOrFail: jest.fn(),
    };

    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: manager,
    };
    mockQueryRunnerManager = manager;

    //* --- Configure the mockDataSource ---
    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        {
          provide: getRepositoryToken(Expense),
          useFactory: createMockRepository,
        },
        {
          provide: getRepositoryToken(ExpenseSplit),
          useFactory: createMockRepository,
        },
        { provide: getRepositoryToken(User), useFactory: createMockRepository },
        { provide: GroupsService, useValue: mockGroupsService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    //* --- Get instances ---
    service = module.get<ExpensesService>(ExpensesService);
    mockExpenseRepository = module.get(getRepositoryToken(Expense));
  });

  //* --- Clear mocks after each test ---
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  //* --- Tests for createExpense ---
  describe("createExpense", () => {
    //* --- Common Setup for createExpense ---
    const createExpenseDtoBase: CreateExpenseDto = {
      description: "Test Dinner",
      amount: 30.0,
      transaction_date: new Date().toString(),
      split_type: SplitType.EQUAL,
      splits: [],
    };

    //* --- Success Scenarios ---

    it("should successfully create an EQUAL split expense", async () => {
      const dto: CreateExpenseDto = {
        ...createExpenseDtoBase,
        amount: 30.0,
        split_type: SplitType.EQUAL,
      };
      const mockSavedExpense = {
        ...dto,
        id: "exp-1",
        group_id: mockGroupId,
        paid_by_user_id: mockPayerId,
      } as unknown as Expense;

      mockGroupsService.findGroupMembers!.mockResolvedValue(mockMembers);
      mockQueryRunnerManager.create.mockImplementation(
        (_entityType: any, data: any) => ({ ...data })
      );
      mockQueryRunnerManager.save.mockImplementation(
        async (entityType: typeof Expense, data: Expense) => {
          if (entityType === Expense)
            return { ...data, id: mockSavedExpense.id } as Expense;
          return { ...data, id: `split-${Math.random()}` };
        }
      );

      const result = await service.createExpense(dto, mockGroupId, mockPayerId);

      expect(mockGroupsService.findGroupMembers).toHaveBeenCalledWith(
        mockGroupId,
        mockPayerId
      );
      expect(mockDataSource.createQueryRunner).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.connect).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(1);

      //? Verify Expense creation
      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(
        Expense,
        expect.objectContaining({
          description: dto.description,
          amount: dto.amount,
          group_id: mockGroupId,
          paid_by_user_id: mockPayerId,
        })
      );
      expect(mockQueryRunnerManager.save).toHaveBeenCalledWith(
        Expense,
        expect.any(Object)
      );

      //? Verify ExpenseSplit creation (3 members, $10 each)
      expect(mockQueryRunnerManager.create).toHaveBeenCalledTimes(
        1 + mockMembers.length
      );
      expect(mockQueryRunnerManager.save).toHaveBeenCalledTimes(
        1 + mockMembers.length
      );

      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockSavedExpense.id,
        owed_by_user_id: "user-1",
        amount: 10.0,
      });
      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockSavedExpense.id,
        owed_by_user_id: "user-2",
        amount: 10.0,
      });
      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockSavedExpense.id,
        owed_by_user_id: "user-3",
        amount: 10.0,
      });

      //? Verify Transaction Management
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);

      //? Verify Return Value
      expect(result).toEqual(
        expect.objectContaining({ id: mockSavedExpense.id })
      );
    });

    it("should successfully create an EQUAL split expense with rounding", async () => {
      const dto: CreateExpenseDto = {
        ...createExpenseDtoBase,
        amount: 10.0,
        split_type: SplitType.EQUAL,
      };
      const mockSavedExpense = {
        ...dto,
        id: "exp-2",
        group_id: mockGroupId,
        paid_by_user_id: mockPayerId,
      } as unknown as Expense;

      mockGroupsService.findGroupMembers!.mockResolvedValue(mockMembers);
      mockQueryRunnerManager.create.mockImplementation(
        (_entityType: any, data: any) => ({ ...data })
      );
      mockQueryRunnerManager.save.mockImplementation(
        async (entityType: typeof Expense, data: Expense) => {
          if (entityType === Expense)
            return { ...data, id: mockSavedExpense.id } as Expense;
          return { ...data, id: `split-${Math.random()}` };
        }
      );

      await service.createExpense(dto, mockGroupId, mockPayerId);

      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockSavedExpense.id,
        owed_by_user_id: "user-1",
        amount: 3.34,
      });
      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockSavedExpense.id,
        owed_by_user_id: "user-2",
        amount: 3.33,
      });
      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockSavedExpense.id,
        owed_by_user_id: "user-3",
        amount: 3.33,
      });

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it("should successfully create an EXACT split expense", async () => {
      const dto: CreateExpenseDto = {
        ...createExpenseDtoBase,
        amount: 55.5,
        split_type: SplitType.EXACT,
        splits: [
          { user_id: "user-1", amount: 10.25 },
          { user_id: "user-2", amount: 20.0 },
          { user_id: "user-3", amount: 25.25 },
        ],
      };
      const mockSavedExpense = {
        ...dto,
        id: "exp-3",
        group_id: mockGroupId,
        paid_by_user_id: mockPayerId,
      } as unknown as Expense;

      mockGroupsService.findGroupMembers!.mockResolvedValue(mockMembers);
      mockQueryRunnerManager.create.mockImplementation(
        (_entityType: any, data: any) => ({ ...data })
      );
      mockQueryRunnerManager.save.mockImplementation(
        async (entityType: typeof Expense, data: Expense) => {
          if (entityType === Expense)
            return { ...data, id: mockSavedExpense.id } as Expense;
          return { ...data, id: `split-${Math.random()}` };
        }
      );

      await service.createExpense(dto, mockGroupId, mockPayerId);

      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockSavedExpense.id,
        owed_by_user_id: "user-1",
        amount: 10.25,
      });
      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockSavedExpense.id,
        owed_by_user_id: "user-2",
        amount: 20.0,
      });
      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockSavedExpense.id,
        owed_by_user_id: "user-3",
        amount: 25.25,
      });
      expect(mockQueryRunnerManager.create).toHaveBeenCalledTimes(
        1 + dto.splits!.length
      );
      expect(mockQueryRunnerManager.save).toHaveBeenCalledTimes(
        1 + dto.splits!.length
      );

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it("should successfully create a PERCENTAGE split expense", async () => {
      const dto: CreateExpenseDto = {
        ...createExpenseDtoBase,
        amount: 100.0,
        split_type: SplitType.PERCENTAGE,
        splits: [
          { user_id: "user-1", percentage: 30 },
          { user_id: "user-2", percentage: 50 },
          { user_id: "user-3", percentage: 20 },
        ],
      };
      const mockSavedExpense = {
        ...dto,
        id: "exp-4",
        group_id: mockGroupId,
        paid_by_user_id: mockPayerId,
      } as unknown as Expense;

      mockGroupsService.findGroupMembers!.mockResolvedValue(mockMembers);
      mockQueryRunnerManager.create.mockImplementation(
        (_entityType: any, data: any) => ({ ...data })
      );
      mockQueryRunnerManager.save.mockImplementation(
        async (entityType: typeof Expense, data: Expense) => {
          if (entityType === Expense)
            return { ...data, id: mockSavedExpense.id } as Expense;
          return { ...data, id: `split-${Math.random()}` };
        }
      );

      await service.createExpense(dto, mockGroupId, mockPayerId);

      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockSavedExpense.id,
        owed_by_user_id: "user-1",
        amount: 30.0,
      });
      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockSavedExpense.id,
        owed_by_user_id: "user-2",
        amount: 50.0,
      });
      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockSavedExpense.id,
        owed_by_user_id: "user-3",
        amount: 20.0,
      });
      expect(mockQueryRunnerManager.create).toHaveBeenCalledTimes(
        1 + dto.splits!.length
      );
      expect(mockQueryRunnerManager.save).toHaveBeenCalledTimes(
        1 + dto.splits!.length
      );

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it("should successfully create a PERCENTAGE split expense with rounding", async () => {
      const dto: CreateExpenseDto = {
        ...createExpenseDtoBase,
        amount: 10.0,
        split_type: SplitType.PERCENTAGE,
        splits: [
          { user_id: "user-1", percentage: 33.33 },
          { user_id: "user-2", percentage: 33.33 },
          { user_id: "user-3", percentage: 33.34 },
        ],
      };
      const mockSavedExpense = {
        ...dto,
        id: "exp-5",
        group_id: mockGroupId,
        paid_by_user_id: mockPayerId,
      } as unknown as Expense;

      mockGroupsService.findGroupMembers!.mockResolvedValue(mockMembers);
      mockQueryRunnerManager.create.mockImplementation(
        (_entityType: any, data: any) => ({ ...data })
      );
      mockQueryRunnerManager.save.mockImplementation(
        async (entityType: typeof Expense, data: Expense) => {
          if (entityType === Expense)
            return { ...data, id: mockSavedExpense.id } as Expense;
          return { ...data, id: `split-${Math.random()}` };
        }
      );

      await service.createExpense(dto, mockGroupId, mockPayerId);

      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockSavedExpense.id,
        owed_by_user_id: "user-3",
        amount: 3.34,
      });
      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockSavedExpense.id,
        owed_by_user_id: "user-1",
        amount: 3.33,
      });
      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockSavedExpense.id,
        owed_by_user_id: "user-2",
        amount: 3.33,
      });

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    });

    it("should successfully create a SHARE split expense", async () => {
      const dto: CreateExpenseDto = {
        ...createExpenseDtoBase,
        amount: 60.0,
        split_type: SplitType.SHARE,
        splits: [
          { user_id: "user-1", shares: 1 },
          { user_id: "user-2", shares: 2 },
          { user_id: "user-3", shares: 3 },
        ],
      };
      const mockSavedExpense = {
        ...dto,
        id: "exp-6",
        group_id: mockGroupId,
        paid_by_user_id: mockPayerId,
      } as unknown as Expense;

      mockGroupsService.findGroupMembers!.mockResolvedValue(mockMembers);
      mockQueryRunnerManager.create.mockImplementation(
        (_entityType: any, data: any) => ({ ...data })
      );
      mockQueryRunnerManager.save.mockImplementation(
        async (entityType: typeof Expense, data: Expense) => {
          if (entityType === Expense)
            return { ...data, id: mockSavedExpense.id } as Expense;
          return { ...data, id: `split-${Math.random()}` };
        }
      );

      await service.createExpense(dto, mockGroupId, mockPayerId);

      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockSavedExpense.id,
        owed_by_user_id: "user-1",
        amount: 10.0,
      });
      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockSavedExpense.id,
        owed_by_user_id: "user-2",
        amount: 20.0,
      });
      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockSavedExpense.id,
        owed_by_user_id: "user-3",
        amount: 30.0,
      });
      expect(mockQueryRunnerManager.create).toHaveBeenCalledTimes(
        1 + dto.splits!.length
      );
      expect(mockQueryRunnerManager.save).toHaveBeenCalledTimes(
        1 + dto.splits!.length
      );

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it("should successfully create a SHARE split expense with rounding", async () => {
      const dto: CreateExpenseDto = {
        ...createExpenseDtoBase,
        amount: 10.0,
        split_type: SplitType.SHARE,
        splits: [
          { user_id: "user-1", shares: 1 },
          { user_id: "user-2", shares: 1 },
          { user_id: "user-3", shares: 1 },
        ],
      };
      const mockSavedExpense = {
        ...dto,
        id: "exp-7",
        group_id: mockGroupId,
        paid_by_user_id: mockPayerId,
      } as unknown as Expense;

      mockGroupsService.findGroupMembers!.mockResolvedValue(mockMembers);
      mockQueryRunnerManager.create.mockImplementation(
        (_entityType: any, data: any) => ({ ...data })
      );
      mockQueryRunnerManager.save.mockImplementation(
        async (entityType: typeof Expense, data: Expense) => {
          if (entityType === Expense)
            return { ...data, id: mockSavedExpense.id } as Expense;
          return { ...data, id: `split-${Math.random()}` };
        }
      );

      await service.createExpense(dto, mockGroupId, mockPayerId);

      const savedSplits = mockQueryRunnerManager.create.mock.calls
        .filter((call: (typeof ExpenseSplit)[]) => call[0] === ExpenseSplit)
        .map((call: any[]) => call[1]);

      expect(savedSplits.length).toBe(3);
      const totalSplitAmount = savedSplits.reduce(
        (sum: any, split: { amount: any }) => sum + split.amount,
        0
      );
      expect(totalSplitAmount).toBeCloseTo(dto.amount, 2);

      expect(savedSplits).toContainEqual({
        expense_id: mockSavedExpense.id,
        owed_by_user_id: "user-1",
        amount: expect.closeTo(3.33, 1),
      });
      expect(savedSplits).toContainEqual({
        expense_id: mockSavedExpense.id,
        owed_by_user_id: "user-2",
        amount: expect.closeTo(3.33, 1),
      });
      expect(savedSplits).toContainEqual({
        expense_id: mockSavedExpense.id,
        owed_by_user_id: "user-3",
        amount: expect.closeTo(3.33, 1),
      });
      expect(
        savedSplits.filter((s: { amount: number }) => s.amount === 3.34).length
      ).toBe(1);
      expect(
        savedSplits.filter((s: { amount: number }) => s.amount === 3.33).length
      ).toBe(2);

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    });

    //* --- Error Scenarios ---

    it("should throw BadRequestException if group has no members", async () => {
      const dto: CreateExpenseDto = {
        ...createExpenseDtoBase,
        split_type: SplitType.EQUAL,
      };
      mockGroupsService.findGroupMembers!.mockResolvedValue([]);

      await expect(
        service.createExpense(dto, mockGroupId, mockPayerId)
      ).rejects.toThrow(
        new BadRequestException(
          "Cannot add expense to a group with no members."
        )
      );

      expect(mockGroupsService.findGroupMembers).toHaveBeenCalledWith(
        mockGroupId,
        mockPayerId
      );
      expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException for EXACT split with no splits array", async () => {
      const dto: CreateExpenseDto = {
        ...createExpenseDtoBase,
        amount: 30,
        split_type: SplitType.EXACT,
        splits: undefined,
      };
      mockGroupsService.findGroupMembers!.mockResolvedValue(mockMembers);

      await expect(
        service.createExpense(dto, mockGroupId, mockPayerId)
      ).rejects.toThrow(
        new BadRequestException(
          `Splits array is required for split type ${SplitType.EXACT}.`
        )
      );
      expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException for EXACT split if a user in splits is not in the group", async () => {
      const dto: CreateExpenseDto = {
        ...createExpenseDtoBase,
        amount: 30,
        split_type: SplitType.EXACT,
        splits: [
          { user_id: "user-1", amount: 15 },
          { user_id: "user-99", amount: 15 },
        ],
      };
      mockGroupsService.findGroupMembers!.mockResolvedValue(mockMembers);

      await expect(
        service.createExpense(dto, mockGroupId, mockPayerId)
      ).rejects.toThrow(
        new BadRequestException(
          `User with ID user-99 in splits is not a member of this group.`
        )
      );
      expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException for EXACT split with duplicate users", async () => {
      const dto: CreateExpenseDto = {
        ...createExpenseDtoBase,
        amount: 30,
        split_type: SplitType.EXACT,
        splits: [
          { user_id: "user-1", amount: 15 },
          { user_id: "user-1", amount: 15 },
        ],
      };
      mockGroupsService.findGroupMembers!.mockResolvedValue(mockMembers);

      await expect(
        service.createExpense(dto, mockGroupId, mockPayerId)
      ).rejects.toThrow(
        new BadRequestException(`Duplicate user ID user-1 found in splits.`)
      );
      expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException for EXACT split if split amounts do not sum to total amount", async () => {
      const dto: CreateExpenseDto = {
        ...createExpenseDtoBase,
        amount: 30.0,
        split_type: SplitType.EXACT,
        splits: [
          { user_id: "user-1", amount: 10.0 },
          { user_id: "user-2", amount: 10.0 },
          { user_id: "user-3", amount: 10.5 },
        ],
      };
      mockGroupsService.findGroupMembers!.mockResolvedValue(mockMembers);

      await expect(
        service.createExpense(dto, mockGroupId, mockPayerId)
      ).rejects.toThrow(
        new BadRequestException(
          `Sum of exact split amounts (30.50) does not equal the total expense amount (30.00).`
        )
      );
      expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException for PERCENTAGE split if percentages do not sum to 100", async () => {
      const dto: CreateExpenseDto = {
        ...createExpenseDtoBase,
        amount: 100.0,
        split_type: SplitType.PERCENTAGE,
        splits: [
          { user_id: "user-1", percentage: 30 },
          { user_id: "user-2", percentage: 50 },
          { user_id: "user-3", percentage: 21 },
        ],
      };
      mockGroupsService.findGroupMembers!.mockResolvedValue(mockMembers);

      await expect(
        service.createExpense(dto, mockGroupId, mockPayerId)
      ).rejects.toThrow(
        new BadRequestException(
          `Percentages must sum to 100 (currently 101.00%).`
        )
      );
      expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException for SHARE split with zero total shares", async () => {
      const dto: CreateExpenseDto = {
        ...createExpenseDtoBase,
        amount: 60.0,
        split_type: SplitType.SHARE,
        splits: [
          { user_id: "user-1", shares: 0 },
          { user_id: "user-2", shares: 0 },
        ],
      };
      mockGroupsService.findGroupMembers!.mockResolvedValue(mockMembers);

      await expect(
        service.createExpense(dto, mockGroupId, mockPayerId)
      ).rejects.toThrow(
        new BadRequestException(
          `Invalid shares for user ${dto.splits![0].user_id}.`
        )
      );
      expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException for unsupported split type", async () => {
      const dto: CreateExpenseDto = {
        ...createExpenseDtoBase,
        split_type: "INVALID_TYPE" as SplitType,
      };
      mockGroupsService.findGroupMembers!.mockResolvedValue(mockMembers);

      await expect(
        service.createExpense(dto, mockGroupId, mockPayerId)
      ).rejects.toThrow(
        new BadRequestException(
          `Split type "INVALID_TYPE" is not yet supported.`
        )
      );
      expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    //* --- Transaction Error Scenarios ---

    it("should rollback transaction and throw InternalServerErrorException if saving Expense fails", async () => {
      const dto: CreateExpenseDto = {
        ...createExpenseDtoBase,
        amount: 30.0,
        split_type: SplitType.EQUAL,
      };
      const saveError = new Error("Database unavailable");

      mockGroupsService.findGroupMembers!.mockResolvedValue(mockMembers);
      mockQueryRunnerManager.create.mockImplementation(
        (_entityType: any, data: any) => ({ ...data })
      );
      mockQueryRunnerManager.save.mockImplementation(
        async (entityType: typeof Expense, data: any) => {
          if (entityType === Expense) {
            throw saveError;
          }
          return { ...data, id: `split-${Math.random()}` };
        }
      );

      await expect(
        service.createExpense(dto, mockGroupId, mockPayerId)
      ).rejects.toThrow(
        new InternalServerErrorException(
          "Failed to create expense due to a transaction error."
        )
      );

      expect(mockQueryRunner.connect).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunnerManager.save).toHaveBeenCalledWith(
        Expense,
        expect.any(Object)
      );
      expect(mockQueryRunnerManager.save).not.toHaveBeenCalledWith(
        ExpenseSplit,
        expect.any(Object)
      );
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it("should rollback transaction and throw InternalServerErrorException if saving ExpenseSplit fails", async () => {
      const dto: CreateExpenseDto = {
        ...createExpenseDtoBase,
        amount: 30.0,
        split_type: SplitType.EQUAL,
      };
      const mockSavedExpense = {
        ...dto,
        id: "exp-fail",
        group_id: mockGroupId,
        paid_by_user_id: mockPayerId,
      } as unknown as Expense;
      const saveError = new Error("Constraint violation");

      mockGroupsService.findGroupMembers!.mockResolvedValue(mockMembers);
      mockQueryRunnerManager.create.mockImplementation(
        (_entityType: any, data: any) => ({ ...data })
      );
      mockQueryRunnerManager.save.mockImplementation(
        async (entityType: any, data: Expense) => {
          if (entityType === Expense)
            return { ...data, id: mockSavedExpense.id } as Expense;
          if (entityType === ExpenseSplit) throw saveError;
          return { ...data };
        }
      );

      await expect(
        service.createExpense(dto, mockGroupId, mockPayerId)
      ).rejects.toThrow(
        new InternalServerErrorException(
          "Failed to create expense due to a transaction error."
        )
      );

      expect(mockQueryRunner.connect).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunnerManager.save).toHaveBeenCalledWith(
        Expense,
        expect.any(Object)
      );
      expect(mockQueryRunnerManager.save).toHaveBeenCalledWith(
        ExpenseSplit,
        expect.any(Object)
      );
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });
  });

  //* --- Tests for updateExpense ---
  describe("updateExpense", () => {
    const mockExpenseId = "exp-existing-1";
    const mockRequestingUserId = "user-payer-1";
    const mockGroupId = "group-abc";
    const mockMembers: GroupMember[] = [
      {
        group_id: mockGroupId,
        user_id: "user-payer-1",
        joinedAt: new Date(),
        id: "1",
        user: {} as any,
        group: {} as any,
        removedBy: null,
      },
      {
        group_id: mockGroupId,
        user_id: "user-other-2",
        joinedAt: new Date(),
        id: "2",
        user: {} as any,
        group: {} as any,
        removedBy: null,
      },
      {
        group_id: mockGroupId,
        user_id: "user-other-3",
        joinedAt: new Date(),
        id: "3",
        user: {} as any,
        group: {} as any,
        removedBy: null,
      },
    ];
    let mockExistingExpense: Expense;

    beforeEach(() => {
      mockExistingExpense = {
        id: mockExpenseId,
        description: "Original Dinner",
        amount: 60.0,
        transaction_date: new Date("2025-04-20T12:00:00Z"),
        group_id: mockGroupId,
        paid_by_user_id: mockRequestingUserId,
        split_type: SplitType.EQUAL,
        deletedAt: null,
        createdAt: new Date("2025-04-20T12:00:00Z"),
        updatedAt: new Date("2025-04-20T12:00:00Z"),
        group: {
          id: mockGroupId,
          name: "Test Group",
          members: mockMembers,
        } as any,
        paidBy: { id: mockRequestingUserId, username: "payer" } as any,
        splits: [],
      } as unknown as Expense;

      mockQueryRunnerManager.findOne.mockResolvedValue(mockExistingExpense);
      mockGroupsService.findGroupMembers!.mockResolvedValue(mockMembers);
      mockQueryRunnerManager.update.mockResolvedValue({
        affected: 1,
        generatedMaps: [],
        raw: {},
      });
      mockQueryRunnerManager.delete.mockResolvedValue({ affected: 3, raw: {} });
      mockQueryRunnerManager.save.mockResolvedValue([]);
      mockQueryRunnerManager.create.mockImplementation(
        (_entity: any, data: any) => ({ ...data })
      );
    });

    //* --- Happy Path Tests ---

    it("should update only the description without touching splits", async () => {
      const updateDto: UpdateExpenseDto = {
        description: "Updated Dinner Description",
      };

      const expectedFinalExpense = {
        ...mockExistingExpense,
        description: updateDto.description,
        updatedAt: expect.any(Date),
      };

      mockExpenseRepository.findOneOrFail!.mockResolvedValue(
        expectedFinalExpense
      );

      const result = await service.updateExpense(
        mockExpenseId,
        mockRequestingUserId,
        updateDto
      );

      //? Verify initial fetch within transaction
      expect(mockQueryRunnerManager.findOne).toHaveBeenCalledWith(Expense, {
        where: { id: mockExpenseId },
        relations: ["group"],
      });
      //? Verify Authorization check passed (implicitly, as no ForbiddenException thrown)

      //? Verify NO split recalculation needed or performed
      expect(mockGroupsService.findGroupMembers).not.toHaveBeenCalled();
      expect(mockQueryRunnerManager.delete).not.toHaveBeenCalled();
      expect(mockQueryRunnerManager.create).not.toHaveBeenCalledWith(
        ExpenseSplit,
        expect.any(Object)
      );
      expect(mockQueryRunnerManager.save).not.toHaveBeenCalledWith(
        ExpenseSplit,
        expect.any(Object)
      );

      //? Verify update call within transaction
      expect(mockQueryRunnerManager.update).toHaveBeenCalledWith(
        Expense,
        mockExpenseId,
        { description: updateDto.description }
      );
      expect(mockQueryRunnerManager.update).toHaveBeenCalledTimes(1);

      //? Verify transaction committed
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();

      //? Verify final fetch AFTER commit
      expect(mockExpenseRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: mockExpenseId },
        relations: ["paidBy"],
      });

      //? Verify result
      expect(result).toEqual(expectedFinalExpense);
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it("should update amount and recalculate splits for original EQUAL type", async () => {
      const updateDto: UpdateExpenseDto = { amount: 90.0 };
      const expectedFinalExpense = {
        ...mockExistingExpense,
        amount: updateDto.amount,
        updatedAt: expect.any(Date),
      };
      mockExpenseRepository.findOneOrFail!.mockResolvedValue(
        expectedFinalExpense
      );

      const result = await service.updateExpense(
        mockExpenseId,
        mockRequestingUserId,
        updateDto
      );

      expect(mockQueryRunnerManager.findOne).toHaveBeenCalledTimes(1);
      //? Verify split recalculation WAS needed
      expect(mockGroupsService.findGroupMembers).toHaveBeenCalledWith(
        mockGroupId,
        mockRequestingUserId
      );
      //? Verify old splits deleted
      expect(mockQueryRunnerManager.delete).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockExpenseId,
      });
      //? Verify new splits created (90 / 3 members = 30 each)
      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockExpenseId,
        owed_by_user_id: "user-payer-1",
        amount: 30.0,
      });
      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockExpenseId,
        owed_by_user_id: "user-other-2",
        amount: 30.0,
      });
      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockExpenseId,
        owed_by_user_id: "user-other-3",
        amount: 30.0,
      });
      expect(mockQueryRunnerManager.save).toHaveBeenCalledWith(
        ExpenseSplit,
        expect.any(Array)
      );

      //? Verify expense update call (only amount updated)
      expect(mockQueryRunnerManager.update).toHaveBeenCalledWith(
        Expense,
        mockExpenseId,
        { amount: updateDto.amount }
      );
      expect(mockQueryRunnerManager.update).toHaveBeenCalledTimes(1);

      //? Verify transaction, final fetch, result
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockExpenseRepository.findOneOrFail).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedFinalExpense);
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it("should update amount, change type to EXACT, validate and save new splits", async () => {
      const updateDto: UpdateExpenseDto = {
        amount: 100.0,
        split_type: SplitType.EXACT,
        splits: [
          { user_id: "user-payer-1", amount: 40.0 },
          { user_id: "user-other-2", amount: 60.0 },
        ],
      };
      const expectedFinalExpense = {
        ...mockExistingExpense,
        amount: 100.0,
        split_type: SplitType.EXACT,
        updatedAt: expect.any(Date),
      };
      mockExpenseRepository.findOneOrFail!.mockResolvedValue(
        expectedFinalExpense
      );

      const result = await service.updateExpense(
        mockExpenseId,
        mockRequestingUserId,
        updateDto
      );

      expect(mockQueryRunnerManager.findOne).toHaveBeenCalledTimes(1);
      //? Verify split recalculation/validation occurred
      expect(mockGroupsService.findGroupMembers).toHaveBeenCalledWith(
        mockGroupId,
        mockRequestingUserId
      );
      expect(mockQueryRunnerManager.delete).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockExpenseId,
      });
      //? Verify new EXACT splits created (only the two provided)
      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockExpenseId,
        owed_by_user_id: "user-payer-1",
        amount: 40.0,
      });
      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockExpenseId,
        owed_by_user_id: "user-other-2",
        amount: 60.0,
      });
      expect(mockQueryRunnerManager.create).toHaveBeenCalledTimes(2);
      expect(mockQueryRunnerManager.save).toHaveBeenCalledWith(
        ExpenseSplit,
        expect.arrayContaining([
          expect.objectContaining({
            owed_by_user_id: "user-payer-1",
            amount: 40.0,
          }),
          expect.objectContaining({
            owed_by_user_id: "user-other-2",
            amount: 60.0,
          }),
        ])
      );
      //? Verify expense update call (amount and type updated)
      expect(mockQueryRunnerManager.update).toHaveBeenCalledWith(
        Expense,
        mockExpenseId,
        { amount: 100.0, split_type: SplitType.EXACT }
      );
      expect(mockQueryRunnerManager.update).toHaveBeenCalledTimes(1);

      //? Verify transaction, final fetch, result
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockExpenseRepository.findOneOrFail).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedFinalExpense);
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it("should update PERCENTAGE splits without changing amount/type", async () => {
      mockExistingExpense.split_type = SplitType.PERCENTAGE;
      mockExistingExpense.amount = 100.0;
      const updateDto: UpdateExpenseDto = {
        splits: [
          { user_id: "user-payer-1", percentage: 50 },
          { user_id: "user-other-2", percentage: 50 },
        ],
      };
      const expectedFinalExpense = {
        ...mockExistingExpense,
        updatedAt: expect.any(Date),
      };
      mockExpenseRepository.findOneOrFail!.mockResolvedValue(
        expectedFinalExpense
      );

      const result = await service.updateExpense(
        mockExpenseId,
        mockRequestingUserId,
        updateDto
      );

      expect(mockQueryRunnerManager.findOne).toHaveBeenCalledTimes(1);
      //? Verify split recalculation triggered because splits provided for non-equal type
      expect(mockGroupsService.findGroupMembers).toHaveBeenCalledTimes(1);
      expect(mockQueryRunnerManager.delete).toHaveBeenCalledTimes(1);
      //? Verify new splits created based on percentage
      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockExpenseId,
        owed_by_user_id: "user-payer-1",
        amount: 50.0,
      });
      expect(mockQueryRunnerManager.create).toHaveBeenCalledWith(ExpenseSplit, {
        expense_id: mockExpenseId,
        owed_by_user_id: "user-other-2",
        amount: 50.0,
      });
      expect(mockQueryRunnerManager.save).toHaveBeenCalledTimes(1);
      //? Verify expense update call (should be called with empty object as nothing basic changed)
      expect(mockQueryRunnerManager.update).toHaveBeenCalledWith(
        Expense,
        mockExpenseId,
        {}
      );
      expect(mockQueryRunnerManager.update).toHaveBeenCalledTimes(1);

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockExpenseRepository.findOneOrFail).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedFinalExpense);
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    //* --- Error Path Tests ---

    it("should throw NotFoundException if expense ID does not exist", async () => {
      mockQueryRunnerManager.findOne.mockResolvedValue(null);
      const updateDto: UpdateExpenseDto = { description: "Doesn't matter" };

      await expect(
        service.updateExpense(
          "non-existent-id",
          mockRequestingUserId,
          updateDto
        )
      ).rejects.toThrow(
        new NotFoundException(`Expense with ID "non-existent-id" not found.`)
      );

      //? Verify transaction started and rolled back
      expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it("should throw ForbiddenException if requesting user is not the payer", async () => {
      const updateDto: UpdateExpenseDto = { description: "Try to update" };
      const differentUserId = "user-imposter-99";

      await expect(
        service.updateExpense(mockExpenseId, differentUserId, updateDto)
      ).rejects.toThrow(
        new ForbiddenException(
          "Only the user who paid for the expense can edit it."
        )
      );

      //? Verify fetch happened, but no updates/commits occurred
      expect(mockQueryRunnerManager.findOne).toHaveBeenCalledTimes(1);
      expect(mockQueryRunnerManager.update).not.toHaveBeenCalled();
      expect(mockQueryRunnerManager.delete).not.toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it("should throw BadRequestException if changing to EXACT type without providing splits array", async () => {
      const updateDto: UpdateExpenseDto = {
        amount: 100.0,
        split_type: SplitType.EXACT,
        splits: undefined,
      };

      await expect(
        service.updateExpense(mockExpenseId, mockRequestingUserId, updateDto)
      ).rejects.toThrow(
        new BadRequestException(
          `Splits array is required when updating to split type ${SplitType.EXACT}.`
        )
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it("should throw BadRequestException for EXACT if provided splits sum does not match new amount", async () => {
      const updateDto: UpdateExpenseDto = {
        amount: 100.0,
        split_type: SplitType.EXACT,
        splits: [
          { user_id: "user-payer-1", amount: 40.0 },
          { user_id: "user-other-2", amount: 50.0 },
        ],
      };

      await expect(
        service.updateExpense(mockExpenseId, mockRequestingUserId, updateDto)
      ).rejects.toThrow(
        new BadRequestException(
          `Sum of exact splits (90.00) does not match new expense amount (100.00).`
        )
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it("should throw BadRequestException for PERCENTAGE if percentages do not sum to 100", async () => {
      const updateDto: UpdateExpenseDto = {
        amount: 100.0,
        split_type: SplitType.PERCENTAGE,
        splits: [
          { user_id: "user-payer-1", percentage: 50 },
          { user_id: "user-other-2", percentage: 51 },
        ],
      };
      await expect(
        service.updateExpense(mockExpenseId, mockRequestingUserId, updateDto)
      ).rejects.toThrow(
        new BadRequestException(`Percentages must sum to 100.`)
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it("should throw BadRequestException for SHARE if total shares is not positive", async () => {
      const updateDto: UpdateExpenseDto = {
        amount: 100.0,
        split_type: SplitType.SHARE,
        splits: [
          { user_id: "user-payer-1", shares: 0 },
          { user_id: "user-other-2", shares: 0 },
        ],
      };
      await expect(
        service.updateExpense(mockExpenseId, mockRequestingUserId, updateDto)
      ).rejects.toThrow(
        new BadRequestException(
          `Invalid shares for user ${updateDto.splits?.[0].user_id}.`
        )
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it("should throw BadRequestException if user in splits is not a group member", async () => {
      const updateDto: UpdateExpenseDto = {
        amount: 100.0,
        split_type: SplitType.EXACT,
        splits: [
          { user_id: "user-payer-1", amount: 50.0 },
          { user_id: "user-not-in-group-99", amount: 50.0 },
        ],
      };
      await expect(
        service.updateExpense(mockExpenseId, mockRequestingUserId, updateDto)
      ).rejects.toThrow(
        new BadRequestException(
          `User user-not-in-group-99 in splits is not a member.`
        )
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    //* --- Transaction Error Tests (Suppress console.error if needed) ---
    describe("Transaction Error Scenarios", () => {
      it("should rollback and throw InternalServerErrorException if expense update fails", async () => {
        const updateDto: UpdateExpenseDto = { description: "Updated Desc" };
        const updateError = new Error("DB Update failed");
        mockQueryRunnerManager.update.mockRejectedValue(updateError);

        await expect(
          service.updateExpense(mockExpenseId, mockRequestingUserId, updateDto)
        ).rejects.toThrow(InternalServerErrorException);

        //? Verify state
        expect(mockQueryRunnerManager.update).toHaveBeenCalledTimes(1);
        expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);

        expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
      });

      it("should rollback and throw InternalServerErrorException if old split deletion fails", async () => {
        const updateDto: UpdateExpenseDto = { amount: 90.0 };
        const deleteError = new Error("DB Delete failed");
        mockQueryRunnerManager.delete.mockRejectedValue(deleteError);

        await expect(
          service.updateExpense(mockExpenseId, mockRequestingUserId, updateDto)
        ).rejects.toThrow(InternalServerErrorException);

        //? Verify state
        expect(mockQueryRunnerManager.delete).toHaveBeenCalledWith(
          ExpenseSplit,
          { expense_id: mockExpenseId }
        );
        expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);

        expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
      });

      it("should rollback and throw InternalServerErrorException if new split saving fails", async () => {
        const updateDto: UpdateExpenseDto = { amount: 90.0 };
        const saveError = new Error("DB Save failed");
        mockQueryRunnerManager.save.mockImplementation(
          async (entityType: any) => {
            if (entityType === ExpenseSplit) throw saveError;
            return [];
          }
        );

        await expect(
          service.updateExpense(mockExpenseId, mockRequestingUserId, updateDto)
        ).rejects.toThrow(InternalServerErrorException);

        //? Verify state
        expect(mockQueryRunnerManager.save).toHaveBeenCalledWith(
          ExpenseSplit,
          expect.any(Array)
        );
        expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
        expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);

        expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
      });
    });
  });

  //* --- Tests for findAllForGroup ---
  describe("findAllForGroup", () => {
    const groupId = "group-uuid-for-find";
    const requestingUserId = "user-uuid-member";
    const mockExpenses: Partial<Expense>[] = [
      {
        id: "exp1",
        group_id: groupId,
        description: "Active Expense 1",
        deletedAt: null,
        paidBy: { id: "user1" } as User,
        createdAt: new Date(2025, 3, 20),
        transaction_date: "2025-04-20",
      },
      {
        id: "exp2",
        group_id: groupId,
        description: "Deleted Expense",
        deletedAt: new Date(),
        paidBy: { id: "user2" } as User,
        createdAt: new Date(2025, 3, 19),
        transaction_date: "2025-04-19",
      },
      {
        id: "exp3",
        group_id: groupId,
        description: "Active Expense 2",
        deletedAt: null,
        paidBy: { id: "user1" } as User,
        createdAt: new Date(2025, 3, 18),
        transaction_date: "2025-04-18",
      },
    ];

    it("should return expenses (including deleted) when user has access", async () => {
      //? Arrange

      mockGroupsService.findOneById!.mockResolvedValue({} as Group);

      mockExpenseRepository.find!.mockResolvedValue(mockExpenses as Expense[]);

      //? Act
      const result = await service.findAllForGroup(groupId, requestingUserId);

      //? Assert

      expect(mockGroupsService.findOneById).toHaveBeenCalledWith(
        groupId,
        requestingUserId
      );

      expect(mockExpenseRepository.find).toHaveBeenCalledWith({
        where: { group_id: groupId },
        withDeleted: true,
        relations: { paidBy: true },
        order: {
          deletedAt: "ASC",
          transaction_date: "DESC",
          createdAt: "DESC",
        },
      });

      expect(result).toEqual(mockExpenses);
    });

    it("should return an empty array if no expenses exist", async () => {
      //? Arrange
      mockGroupsService.findOneById!.mockResolvedValue({} as Group);
      mockExpenseRepository.find!.mockResolvedValue([]);

      //? Act
      const result = await service.findAllForGroup(groupId, requestingUserId);

      //? Assert
      expect(mockGroupsService.findOneById).toHaveBeenCalledWith(
        groupId,
        requestingUserId
      );
      expect(mockExpenseRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { group_id: groupId },
          withDeleted: true,
        })
      );
      expect(result).toEqual([]);
    });

    it("should throw ForbiddenException if user cannot access group", async () => {
      //? Arrange
      const forbiddenError = new ForbiddenException("Access Denied Test");
      mockGroupsService.findOneById!.mockRejectedValue(forbiddenError);

      //? Act & Assert
      await expect(
        service.findAllForGroup(groupId, requestingUserId)
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.findAllForGroup(groupId, requestingUserId)
      ).rejects.toThrow("Access Denied Test");

      expect(mockExpenseRepository.find).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException if group check throws NotFound", async () => {
      //? Arrange
      const notFoundError = new NotFoundException("Group Not Found Test");
      mockGroupsService.findOneById!.mockRejectedValue(notFoundError);

      //? Act & Assert
      await expect(
        service.findAllForGroup(groupId, requestingUserId)
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findAllForGroup(groupId, requestingUserId)
      ).rejects.toThrow("Group Not Found Test");

      expect(mockExpenseRepository.find).not.toHaveBeenCalled();
    });

    it("should throw InternalServerErrorException if group check throws unexpected error", async () => {
      //? Arrange
      const unexpectedError = new Error("Some random DB error");
      mockGroupsService.findOneById!.mockRejectedValue(unexpectedError);

      //? Act & Assert
      await expect(
        service.findAllForGroup(groupId, requestingUserId)
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.findAllForGroup(groupId, requestingUserId)
      ).rejects.toThrow("Could not verify group access.");

      expect(mockExpenseRepository.find).not.toHaveBeenCalled();
    });
  });

  //* --- Tests for softRemoveExpense ---
  describe("softRemoveExpense", () => {
    const expenseId = "expense-uuid-to-delete";
    const payerUserId = "user-uuid-payer";
    const otherUserId = "user-uuid-other";

    const mockExpense: Partial<Expense> = {
      id: expenseId,
      group_id: "group-uuid-1",
      paid_by_user_id: payerUserId,
    };

    it("should soft delete the expense if user is the payer", async () => {
      //? Arrange
      mockExpenseRepository.findOne!.mockResolvedValue(mockExpense as Expense);
      mockExpenseRepository.softDelete!.mockResolvedValue({
        affected: 1,
        raw: [],
      });

      //? Act & Assert
      await expect(
        service.softRemoveExpense(expenseId, payerUserId)
      ).resolves.toBeUndefined();

      //? Verify mocks
      expect(mockExpenseRepository.findOne).toHaveBeenCalledWith({
        where: { id: expenseId },
        select: ["id", "group_id", "paid_by_user_id"],
      });
      expect(mockExpenseRepository.softDelete).toHaveBeenCalledWith({
        id: expenseId,
      });
    });

    it("should throw ForbiddenException if user is not the payer", async () => {
      //? Arrange
      mockExpenseRepository.findOne!.mockResolvedValue(mockExpense as Expense);

      //? Act & Assert
      await expect(
        service.softRemoveExpense(expenseId, otherUserId)
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.softRemoveExpense(expenseId, otherUserId)
      ).rejects.toThrow(
        "Only the user who paid for the expense can delete it."
      );

      //? Verify softDelete was not called
      expect(mockExpenseRepository.softDelete).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException if expense is not found", async () => {
      //? Arrange
      mockExpenseRepository.findOne!.mockResolvedValue(null);

      //? Act & Assert
      await expect(
        service.softRemoveExpense(expenseId, payerUserId)
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.softRemoveExpense(expenseId, payerUserId)
      ).rejects.toThrow(`Expense with ID "${expenseId}" not found.`);

      //? Verify softDelete was not called
      expect(mockExpenseRepository.softDelete).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException if softDelete affects 0 rows", async () => {
      //? Arrange
      mockExpenseRepository.findOne!.mockResolvedValue(mockExpense as Expense);
      mockExpenseRepository.softDelete!.mockResolvedValue({
        affected: 0,
        raw: [],
      });

      //? Act & Assert
      await expect(
        service.softRemoveExpense(expenseId, payerUserId)
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.softRemoveExpense(expenseId, payerUserId)
      ).rejects.toThrow(
        `Expense with ID "${expenseId}" could not be soft-deleted.`
      );

      //? Verify softDelete *was* called
      expect(mockExpenseRepository.softDelete).toHaveBeenCalledWith({
        id: expenseId,
      });
    });
  });
});
