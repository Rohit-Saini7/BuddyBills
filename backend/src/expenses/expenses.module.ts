import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GroupsModule } from "../groups/groups.module";
import { ExpenseSplit } from "./entities/expense-split.entity";
import { Expense } from "./entities/expense.entity";
import { ExpensesController } from "./expenses.controller";
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
