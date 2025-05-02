import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { SplitType } from "src/expenses/dto/expense-split.type";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UpdateExpenseDto } from "./dto/update-expense.dto";
import { Expense } from "./entities/expense.entity";
import { ExpensesController } from "./expenses.controller";
import { ExpensesService } from "./expenses.service";

//* --- Mocks ---
const mockExpensesService = {
  softRemoveExpense: jest.fn(),
  updateExpense: jest.fn(),
};

const mockJwtAuthGuard = {
  canActivate: jest.fn().mockReturnValue(true),
};

interface MockUserPayload {
  userId: string;
  email: string;
}

describe("ExpensesController", () => {
  let controller: ExpensesController;
  let expensesService: typeof mockExpensesService;

  //* --- Mock Data ---
  const mockUserId = "user-expenses-ctrl-uuid-1";
  const mockUserEmail = "exp-ctrl@test.com";
  const mockExpenseId = "expense-ctrl-uuid-1";

  const mockUserPayload: MockUserPayload = {
    userId: mockUserId,
    email: mockUserEmail,
  };
  const mockRequest: any = { user: mockUserPayload };

  const mockExpense: Expense = {
    id: mockExpenseId,
    description: "Original Description",
    amount: 100,
    paid_by_user_id: mockUserId,
    group_id: "group-expenses-ctrl-uuid-1",
    transaction_date: "",
    split_type: SplitType.EQUAL,
    createdAt: new Date(),
    updatedAt: new Date(),
    group: {} as any,
    paidBy: {} as any,
    splits: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpensesController],
      providers: [{ provide: ExpensesService, useValue: mockExpensesService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<ExpensesController>(ExpensesController);
    expensesService = module.get(ExpensesService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  //* --- remove Tests ---
  describe("remove", () => {
    it("should call expensesService.softRemoveExpense with correct arguments", async () => {
      //? Arrange
      expensesService.softRemoveExpense.mockResolvedValue(undefined);

      //? Act
      await controller.remove(mockExpenseId, mockRequest);

      expect(expensesService.softRemoveExpense).toHaveBeenCalledTimes(1);
      expect(expensesService.softRemoveExpense).toHaveBeenCalledWith(
        mockExpenseId,
        mockUserId
      );
    });

    it("should propagate NotFoundException from service", async () => {
      //? Arrange
      const error = new NotFoundException("Expense not found");
      expensesService.softRemoveExpense.mockRejectedValue(error);

      //? Act & Assert
      await expect(
        controller.remove(mockExpenseId, mockRequest)
      ).rejects.toThrow(NotFoundException);
      expect(expensesService.softRemoveExpense).toHaveBeenCalledWith(
        mockExpenseId,
        mockUserId
      );
    });

    it("should propagate ForbiddenException from service", async () => {
      //? Arrange
      const error = new ForbiddenException("Cannot delete this expense");
      expensesService.softRemoveExpense.mockRejectedValue(error);

      //? Act & Assert
      await expect(
        controller.remove(mockExpenseId, mockRequest)
      ).rejects.toThrow(ForbiddenException);
      expect(expensesService.softRemoveExpense).toHaveBeenCalledWith(
        mockExpenseId,
        mockUserId
      );
    });

    it("should propagate other errors from service", async () => {
      //? Arrange
      const error = new Error("Some internal error");
      expensesService.softRemoveExpense.mockRejectedValue(error);

      //? Act & Assert
      await expect(
        controller.remove(mockExpenseId, mockRequest)
      ).rejects.toThrow(Error);
      expect(expensesService.softRemoveExpense).toHaveBeenCalledWith(
        mockExpenseId,
        mockUserId
      );
    });
  });

  //* --- update Tests ---
  describe("update", () => {
    const mockUpdateDto: UpdateExpenseDto = {
      description: "Updated Description",
      amount: 150.5,
    };
    const mockUpdatedExpense: any = {
      ...mockExpense,
      ...mockUpdateDto,
      updatedAt: new Date(),
    };

    it("should call expensesService.updateExpense and return the result", async () => {
      //? Arrange
      expensesService.updateExpense.mockResolvedValue(
        mockUpdatedExpense as Expense
      );

      //? Act
      const result = await controller.update(
        mockExpenseId,
        mockUpdateDto,
        mockRequest
      );

      expect(result).toEqual(mockUpdatedExpense);
      expect(expensesService.updateExpense).toHaveBeenCalledTimes(1);
      expect(expensesService.updateExpense).toHaveBeenCalledWith(
        mockExpenseId,
        mockUserId,
        mockUpdateDto
      );
    });

    it("should propagate NotFoundException from service", async () => {
      //? Arrange
      const error = new NotFoundException("Expense not found for update");
      expensesService.updateExpense.mockRejectedValue(error);

      //? Act & Assert
      await expect(
        controller.update(mockExpenseId, mockUpdateDto, mockRequest)
      ).rejects.toThrow(NotFoundException);
      expect(expensesService.updateExpense).toHaveBeenCalledWith(
        mockExpenseId,
        mockUserId,
        mockUpdateDto
      );
    });

    it("should propagate ForbiddenException from service", async () => {
      //? Arrange
      const error = new ForbiddenException("Cannot update this expense");
      expensesService.updateExpense.mockRejectedValue(error);

      //? Act & Assert
      await expect(
        controller.update(mockExpenseId, mockUpdateDto, mockRequest)
      ).rejects.toThrow(ForbiddenException);
      expect(expensesService.updateExpense).toHaveBeenCalledWith(
        mockExpenseId,
        mockUserId,
        mockUpdateDto
      );
    });

    it("should propagate BadRequestException from service", async () => {
      //? Arrange
      const error = new BadRequestException("Invalid update data");
      expensesService.updateExpense.mockRejectedValue(error);

      //? Act & Assert
      await expect(
        controller.update(mockExpenseId, mockUpdateDto, mockRequest)
      ).rejects.toThrow(BadRequestException);
      expect(expensesService.updateExpense).toHaveBeenCalledWith(
        mockExpenseId,
        mockUserId,
        mockUpdateDto
      );
    });

    it("should propagate other errors from service", async () => {
      //? Arrange
      const error = new Error("Some internal update error");
      expensesService.updateExpense.mockRejectedValue(error);

      //? Act & Assert
      await expect(
        controller.update(mockExpenseId, mockUpdateDto, mockRequest)
      ).rejects.toThrow(Error);
      expect(expensesService.updateExpense).toHaveBeenCalledWith(
        mockExpenseId,
        mockUserId,
        mockUpdateDto
      );
    });
  });
});
