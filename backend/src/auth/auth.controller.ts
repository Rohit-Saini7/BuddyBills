import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /* ─── Google OAuth ─── */

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {
    // Passport redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: any) {
    const result = await this.authService.validateOAuthUser(req.user);
    // Redirect to frontend with token in query param
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(
      `${frontendUrl}/login?token=${result.accessToken}&id=${result.user.id}&name=${encodeURIComponent(result.user.name || '')}&email=${encodeURIComponent(result.user.email)}`,
    );
  }

  /* ─── GitHub OAuth ─── */

  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubLogin() {
    // Passport redirects to GitHub
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: any, @Res() res: any) {
    const result = await this.authService.validateOAuthUser(req.user);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(
      `${frontendUrl}/login?token=${result.accessToken}&id=${result.user.id}&name=${encodeURIComponent(result.user.name || '')}&email=${encodeURIComponent(result.user.email)}`,
    );
  }

  /* ─── Current User ─── */

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: any) {
    return req.user;
  }
}
