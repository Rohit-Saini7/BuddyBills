// backend/src/expenses/expenses.controller.ts
import {
  Controller,
  Delete,
  HttpCode, // Import HttpCode
  HttpStatus, // Import Delete
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExpensesService } from './expenses.service';

// Assume AuthenticatedRequest interface is defined or imported
interface AuthenticatedRequest extends Request {
  user: { userId: string; email: string; };
}

@UseGuards(JwtAuthGuard) // Protect all routes in this controller
// Apply interceptor if needed globally or here
// @UseInterceptors(ClassSerializerInterceptor)
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

  // --- Add PATCH /api/expenses/:expenseId for editing later ---
  // --- Add GET /api/expenses/:expenseId for detail view later ---

}
