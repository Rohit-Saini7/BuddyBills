import { Injectable, UnauthorizedException } from '@nestjs/common'; // Import UnauthorizedException
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20'; // No VerifyCallback needed
import { User } from '../../users/entities/user.entity'; // Import User
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') ?? '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') ?? '',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') ?? '',
      scope: ['profile', 'email'],
    });
  }

  // Corrected validate method for NestJS
  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<User> { // Return the User object directly
    try {
      // Use AuthService to find or create the user based on the Google profile
      const user = await this.authService.validateUserByGoogleProfile(profile);
      if (!user) {
        // Although authService should handle this, add a fallback check
        throw new UnauthorizedException('Could not validate or create user from Google profile.');
      }
      // Return the user object. NestJS/Passport attaches this to req.user
      return user;
    } catch (error) {
      // Log the original error for debugging if needed
      console.error("Error during Google strategy validation:", error);
      // Throw a standard NestJS exception
      throw new UnauthorizedException('Authentication failed during Google validation.');
    }
  }
}
