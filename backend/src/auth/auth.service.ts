import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Profile } from 'passport-google-oauth20';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthResponseDto } from './dto/auth-response.dto'; // Import response DTO

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) { }

  // Called by GoogleStrategy's validate method
  async validateUserByGoogleProfile(profile: Profile): Promise<User> {
    const { id: googleId, emails/* , displayName, photos */ } = profile;
    if (!emails || emails.length === 0) {
      throw new UnauthorizedException('Google profile does not contain email.');
    }
    // const email = emails[0].value;

    let user = await this.usersService.findByGoogleId(googleId);
    if (user) {
      return user; // User found by Google ID
    }

    // Optional: Check if email exists from another provider (if adding more later)
    // user = await this.usersService.findByEmail(email);
    // if (user) {
    //   // Link Google ID to existing user or handle conflict
    // }

    // If no user found, create a new one
    if (!user) {
      user = await this.usersService.createFromGoogleProfile(profile);
    }

    if (!user) {
      // Handle case where creation failed unexpectedly
      throw new UnauthorizedException('Could not create or validate user.');
    }

    return user;
  }

  // Called by AuthController after Google callback validation
  async login(user: User): Promise<AuthResponseDto> {
    const payload = {
      sub: user.id, // 'sub' is standard JWT claim for subject (user ID)
      userId: user.id, // Include userId explicitly if preferred
      email: user.email,
      // Add other claims like roles if needed: roles: user.roles
    };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken }; // Return structure matches AuthResponseDto
  }
}
