import { forwardRef, Module } from '@nestjs/common'; // Import forwardRef if needed
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpensesModule } from 'src/expenses/expenses.module';
import { UsersModule } from '../users/users.module'; // Import UsersModule
import { GroupMember } from './entities/group-member.entity';
import { Group } from './entities/group.entity';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, GroupMember]), // Make repositories available
    UsersModule, // Import UsersModule to access UserRepository/UserService
    forwardRef(() => ExpensesModule),
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService], // Export service if needed elsewhere
})
export class GroupsModule { }
