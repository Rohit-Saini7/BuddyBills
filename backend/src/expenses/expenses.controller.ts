import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { ExpenseResponseDto } from "src/expenses/dto/expense-response.dto";
import { UpdateExpenseDto } from "src/expenses/dto/update-expense.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ExpensesService } from "./expenses.service";

interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string };
}

@UseGuards(JwtAuthGuard)
@Controller("expenses") //* /api/expenses
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) { }

  @Delete(":expenseId") //* /api/expenses/:expenseId
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("expenseId", ParseUUIDPipe) expenseId: string,
    @Req() req: AuthenticatedRequest
  ): Promise<void> {
    const requestingUserId = req.user.userId;
    await this.expensesService.softRemoveExpense(expenseId, requestingUserId);
  }

  @Patch(":expenseId") //* /api/expenses/:expenseId
  async update(
    @Param("expenseId", ParseUUIDPipe) expenseId: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @Req() req: AuthenticatedRequest
  ): Promise<ExpenseResponseDto> {
    const requestingUserId = req.user.userId;
    return this.expensesService.updateExpense(
      expenseId,
      requestingUserId,
      updateExpenseDto
    );
  }
}
