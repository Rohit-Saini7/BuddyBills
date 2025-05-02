import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthGuard } from "@nestjs/passport";
import { Request, Response } from "express";
import { User } from "../users/entities/user.entity";
import { AuthService } from "./auth.service";

interface AuthenticatedRequest extends Request {
  user?: User;
}

@Controller("auth") //* /api/auth
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) { }

  //* --- Route to initiate Google Login ---
  @Get("google") //* /api/auth/google
  @UseGuards(AuthGuard("google"))
  async googleAuth() {
    //? Passport automatically redirects to Google
  }

  //* --- Route Google redirects back to after authentication ---

  @Get("google/callback") //* /api/auth/google/callback
  @UseGuards(AuthGuard("google"))
  async googleAuthRedirect(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response
  ) {
    if (!req.user) {
      res.redirect(
        `${this.configService.get<string>("FRONTEND_URL")}/login/failure`
      );
      return;
    }

    const { accessToken } = await this.authService.login(req.user);

    //* --- Redirect back to Frontend ---
    const redirectUrl = `${this.configService.get<string>("FRONTEND_URL")}/auth/callback?token=${accessToken}`;

    //[]: Redirect and set HttpOnly cookie (More secure, more complex frontend handling)
    //* res.cookie('auth_token', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 28 * 24 * 60 * 60 * 1000 }); //? 28 days expiry
    //* const redirectUrl = `${this.configService.get<string>('FRONTEND_URL')}/auth/callback`;

    res.redirect(redirectUrl);
  }
}
