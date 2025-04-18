import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
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
      scope: ['profile', 'email'], // Scopes we need from Google
      passReqToCallback: true, // Pass request to the callback
    });
  }

  // This method is called after successful Google authentication
  async validate(
    _accessToken: string,
    _refreshToken: string, // Usually not needed here
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      // Use AuthService to find or create the user based on the Google profile
      const user = await this.authService.validateUserByGoogleProfile(profile);
      // Pass the user object to Passport, which will attach it to req.user in the callback controller
      done(null, user);
    } catch (error) {
      // Handle errors during user validation/creation
      done(error, false);
    }
  }
}
