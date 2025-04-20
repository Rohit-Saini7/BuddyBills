// backend/src/expenses/expenses.controller.ts
import {
  Body,
  Controller,
  Delete,
  HttpCode, // Import HttpCode
  HttpStatus, // Import Delete
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards
} from '@nestjs/common';
import { Request } from 'express';
import { ExpenseResponseDto } from 'src/expenses/dto/expense-response.dto';
import { UpdateExpenseDto } from 'src/expenses/dto/update-expense.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExpensesService } from './expenses.service';

// Assume AuthenticatedRequest interface is defined or imported
interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string; };
}

@UseGuards(JwtAuthGuard)
@Controller('expenses') // Base path /api/expenses
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) { }

  // --- DELETE /api/expenses/:expenseId ---
  @Delete(':expenseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    const requestingUserId = req.user.userId;
    await this.expensesService.softRemoveExpense(expenseId, requestingUserId);
  }

  // --- PATCH /api/expenses/:expenseId ---
  @Patch(':expenseId')
  async update(
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ExpenseResponseDto> { // Return updated expense DTO
    const requestingUserId = req.user.userId;
    // Service returns updated Expense entity, interceptor transforms it
    return this.expensesService.updateExpense(expenseId, requestingUserId, updateExpenseDto);
  }

  // --- Add GET /api/expenses/:expenseId for detail view later ---

}
