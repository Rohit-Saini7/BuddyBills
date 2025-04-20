// backend/src/expenses/expenses.module.ts
import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GroupsModule } from "../groups/groups.module"; // Still needed for GroupsService injection
import { ExpenseSplit } from "./entities/expense-split.entity";
import { Expense } from "./entities/expense.entity";
import { ExpensesController } from "./expenses.controller"; // Import controller
import { ExpensesService } from "./expenses.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Expense, ExpenseSplit]),
    forwardRef(() => GroupsModule),
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule { }
