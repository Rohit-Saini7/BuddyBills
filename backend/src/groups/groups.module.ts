import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from 'src/expenses/entities/expense.entity';
import { Payment } from 'src/payments/entities/payment.entity';
import { ExpensesModule } from '../expenses/expenses.module';
import { PaymentsModule } from '../payments/payments.module'; // Keep this import
import { UsersModule } from '../users/users.module';
import { GroupMember } from './entities/group-member.entity';
import { Group } from './entities/group.entity';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Group,
      GroupMember,
      Expense,
      Payment,
    ]),
    UsersModule,
    forwardRef(() => ExpensesModule),
    forwardRef(() => PaymentsModule),
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule { }
