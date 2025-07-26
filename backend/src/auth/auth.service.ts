import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { StrategyProfile } from "src/auth/strategies/base-oauth-strategy.factory";
import { AuthProvider } from "src/users/dto/auth-provider.enum";
import { User } from "../users/entities/user.entity";
import { UsersService } from "../users/users.service";
import { AuthResponseDto } from "./dto/auth-response.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) { }

  /**
   * Handles login or account creation via OAuth provider.
   * Throws ConflictException if provider needs linking.
   */
  async login(
    profile: StrategyProfile<AuthProvider>
  ): Promise<AuthResponseDto> {
    const user = await this.usersService.processProviderLogin(profile);
    return this.generateJwt(user);
  }

  /**
   * Completes provider-account linking via token verification.
   */
  async completeLinking(token: string): Promise<AuthResponseDto> {
    try {
      const {
        sub: userId,
        provider,
        providerId,
      } = this.jwtService.verify(token, {
        secret: this.configService.get<string>("JWT_LINKING_SECRET"),
      });

      const user = await this.usersService.linkProviderToUser({
        userId,
        provider,
        providerId,
      });
      return this.generateJwt(user);
    } catch (err) {
      console.error("Linking failed:", err?.message || err);
      throw new BadRequestException("Invalid or expired linking request.");
    }
  }

  /**
   * Generates JWT token for user.
   */
  private generateJwt(user: User): AuthResponseDto {
    const payload = {
      sub: user.id,
      userId: user.id,
      email: user.email,
    };

    return { accessToken: this.jwtService.sign(payload) };
  }
}
