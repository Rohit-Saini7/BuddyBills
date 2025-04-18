import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Import your JWT Guard
import { UserResponseDto } from './dto/user-response.dto'; // Import the Response DTO
import { UsersService } from './users.service';

// Extend Request type to include the user from JWT payload
interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    // Add other fields from your JWT payload if needed
  };
}

@Controller('users') // Base route /api/users
// Apply interceptor here or rely on global one set in main.ts
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @UseGuards(JwtAuthGuard) // Protect this route - only logged-in users can access
  @Get('me') // Route will be GET /api/users/me
  async getMe(@Req() req: AuthenticatedRequest): Promise<UserResponseDto> {
    // req.user is populated by JwtStrategy.validate based on the JWT payload
    const userId = req.user.userId;
    // Service returns a User entity.
    // ClassSerializerInterceptor transforms it to UserResponseDto for the response.
    return this.usersService.findMeById(userId);
  }

  // --- Add other user-related endpoints later if needed (e.g., update profile) ---
}
