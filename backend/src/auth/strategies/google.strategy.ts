import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Profile, Strategy } from "passport-google-oauth20";
import { User } from "../../users/entities/user.entity";
import { AuthService } from "../auth.service";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService
  ) {
    super({
      clientID: configService.get<string>("GOOGLE_CLIENT_ID") ?? "",
      clientSecret: configService.get<string>("GOOGLE_CLIENT_SECRET") ?? "",
      callbackURL: configService.get<string>("GOOGLE_CALLBACK_URL") ?? "",
      scope: ["profile", "email"],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile
  ): Promise<User> {
    let user: User | null;

    try {
      user = await this.authService.validateUserByGoogleProfile(profile);
    } catch (error) {
      console.error(
        "Error calling authService.validateUserByGoogleProfile:",
        error
      );
      throw new UnauthorizedException(
        "Authentication failed during Google validation."
      );
    }
    if (!user) {
      throw new UnauthorizedException(
        "Could not validate or create user from Google profile."
      );
    }

    return user;
  }
}
