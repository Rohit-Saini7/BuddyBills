import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  NotFoundException,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UserResponseDto } from "./dto/user-response.dto";
import { UsersService } from "./users.service";

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
  };
}

@Controller("users") //* /api/users
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @UseGuards(JwtAuthGuard)
  @Get("me") //* /api/users/me
  async getMe(@Req() req: AuthenticatedRequest): Promise<UserResponseDto> {
    const userId = req.user.userId;

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found.");
    }
    return user;
  }
}
