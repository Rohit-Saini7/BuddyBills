import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Profile } from "passport-google-oauth20";
import { User } from "../users/entities/user.entity";
import { UsersService } from "../users/users.service";
import { AuthResponseDto } from "./dto/auth-response.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService
  ) { }

  async validateUserByGoogleProfile(profile: Profile): Promise<User> {
    const { id: googleId, emails /* , displayName, photos */ } = profile;
    if (!emails || emails.length === 0) {
      throw new UnauthorizedException("Google profile does not contain email.");
    }

    let user = await this.usersService.findByGoogleId(googleId);
    if (user) {
      return user;
    }

    if (!user) {
      user = await this.usersService.createFromGoogleProfile(profile);
    }

    if (!user) {
      throw new UnauthorizedException("Could not create or validate user.");
    }

    return user;
  }

  async login(user: User): Promise<AuthResponseDto> {
    const payload = {
      sub: user.id, //? 'sub' is standard JWT claim for subject (user ID)
      userId: user.id,
      email: user.email,
    };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken };
  }
}
