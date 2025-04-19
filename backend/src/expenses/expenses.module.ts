// backend/src/expenses/expenses.module.ts
import { Module, forwardRef } from '@nestjs/common'; // Import forwardRef
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpensesController } from 'src/expenses.controller';
import { ExpensesService } from 'src/expenses/expenses.service';
import { GroupsModule } from '../groups/groups.module'; // Import GroupsModule
import { ExpenseSplit } from './entities/expense-split.entity';
import { Expense } from './entities/expense.entity';
// We might need UsersModule if directly interacting with users not via groups/members
// import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expense, ExpenseSplit]), // Provide Expense & ExpenseSplit repositories
    // We need GroupsModule to fetch group members for splitting and potentially check group access
    forwardRef(() => GroupsModule), // Use forwardRef if GroupsModule might also import ExpensesModule later
    // forwardRef(() => UsersModule), // If needed directly
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService] // Export service if needed by other modules later
})
export class ExpensesModule { }
