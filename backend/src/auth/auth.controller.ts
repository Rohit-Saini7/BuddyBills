import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express'; // Import Express types
import { User } from '../users/entities/user.entity'; // Import User entity
import { AuthService } from './auth.service';

// Extend Request to include the user property attached by Passport
interface AuthenticatedRequest extends Request {
  user?: User; // User object attached by GoogleStrategy's validate method
}

@Controller('auth') // Base route /api/auth
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) { }

  // --- Route to initiate Google Login ---
  // GET /api/auth/google
  @Get('google')
  @UseGuards(AuthGuard('google')) // Use the GoogleStrategy
  async googleAuth() {
    // Passport automatically redirects to Google
  }

  // --- Route Google redirects back to after authentication ---
  // GET /api/auth/google/callback
  @Get('google/callback')
  @UseGuards(AuthGuard('google')) // Use the GoogleStrategy again to process callback
  async googleAuthRedirect(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    if (!req.user) {
      // Handle case where user is not attached (e.g., user denied consent)
      res.redirect(`${this.configService.get<string>('FRONTEND_URL')}/login/failure`); // Redirect to a failure page
      return;
    }

    // User object (from DB) is attached by GoogleStrategy.validate -> done(null, user)
    const { accessToken } = await this.authService.login(req.user);

    // --- Redirect back to Frontend ---
    // Option 1: Redirect with token in query parameter (Simpler, less secure)
    const redirectUrl = `${this.configService.get<string>('FRONTEND_URL')}/auth/callback?token=${accessToken}`;

    // Option 2: Redirect and set HttpOnly cookie (More secure, more complex frontend handling)
    // res.cookie('auth_token', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 }); // 1 day expiry
    // const redirectUrl = `${this.configService.get<string>('FRONTEND_URL')}/auth/callback`;

    res.redirect(redirectUrl);
  }
}
