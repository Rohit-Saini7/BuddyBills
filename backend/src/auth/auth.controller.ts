import {
  Body,
  ConflictException,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthGuard } from "@nestjs/passport";
import { Request, Response } from "express";
import { StrategyProfile } from "src/auth/strategies/base-oauth-strategy.factory";
import { AuthProvider } from "src/users/dto/auth-provider.enum";
import { AuthService } from "./auth.service";

interface AuthenticatedRequest extends Request {
  user?: StrategyProfile<AuthProvider>;
}

@Controller("auth") //* /api/auth
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) { }

  @Get("google") //* /api/auth/google
  @UseGuards(AuthGuard(AuthProvider.GOOGLE))
  googleAuth() {
    //? Passport automatically redirects to Google
  }

  @Get("google/callback") //* /api/auth/google/callback
  @UseGuards(AuthGuard(AuthProvider.GOOGLE))
  googleAuthRedirect(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    return this.handleAuthRedirect(req, res);
  }

  @Get("github") //* /api/auth/github
  @UseGuards(AuthGuard(AuthProvider.GITHUB))
  githubAuth() {
    //? Passport automatically redirects to Github
  }

  @Get("github/callback") //* /api/auth/github/callback
  @UseGuards(AuthGuard(AuthProvider.GITHUB))
  githubAuthRedirect(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    return this.handleAuthRedirect(req, res);
  }

  @Post("complete-linking")
  async completeLinking(@Body() linkAccountDto: { token: string }) {
    return this.authService.completeLinking(linkAccountDto.token);
  }

  private async handleAuthRedirect(req: AuthenticatedRequest, res: Response) {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL");

    if (!req.user) {
      return res.redirect(`${frontendUrl}/login/failure`);
    }

    try {
      const { accessToken } = await this.authService.login(req.user);
      return res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}`);
    } catch (error) {
      if (error instanceof ConflictException) {
        const { linkingToken, existingProviders } = error.getResponse() as any;

        const queryParams = new URLSearchParams({
          name: req.user.name,
          existingProviders,
          provider: req.user.provider,
          token: linkingToken,
        }).toString();

        return res.redirect(`${frontendUrl}/auth/link-account?${queryParams}`);
      }

      console.error("Unexpected error during login:", error);
      return res.redirect(`${frontendUrl}/login/failure`);
    }
  }
}
