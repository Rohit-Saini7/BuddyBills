import {
  ClassSerializerInterceptor,
  Controller,
  Get,
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
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get("me") //* /api/users/me
  async getMe(@Req() req: AuthenticatedRequest): Promise<UserResponseDto> {
    const userId = req.user.userId;

    return this.usersService.findMeById(userId);
  }
}
