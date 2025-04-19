// backend/src/groups/groups.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpensesModule } from '../expenses/expenses.module';
import { UsersModule } from '../users/users.module';
import { GroupMember } from './entities/group-member.entity';
import { Group } from './entities/group.entity';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
// Import entities needed for balance calculation
import { ExpenseSplit } from '../expenses/entities/expense-split.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Payment } from '../payments/entities/payment.entity'; // Assuming payment entity exists

@Module({
  imports: [
    // Make repositories for calculation available here
    TypeOrmModule.forFeature([
      Group,
      GroupMember,
      Expense, // Add Expense Repo
      ExpenseSplit, // Add ExpenseSplit Repo
      Payment, // Add Payment Repo
    ]),
    UsersModule, // Still needed for user lookups
    // Use forwardRef for ExpensesModule if GroupsService needs ExpensesService directly (less likely now)
    forwardRef(() => ExpensesModule),
    // forwardRef(() => PaymentsModule) // If PaymentsService is needed directly
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule { }
