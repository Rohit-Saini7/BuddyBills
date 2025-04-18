import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller'; // Import the controller
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController], // Add UsersController here
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule], // Ensure UsersService is exported
})
export class UsersModule { }
