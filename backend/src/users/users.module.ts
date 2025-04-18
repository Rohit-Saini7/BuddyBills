import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service'; // Import the service

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService], // Add UsersService to providers
  exports: [UsersService, TypeOrmModule], // Export UsersService
})
export class UsersModule { }
