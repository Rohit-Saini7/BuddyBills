import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') { // Use 'jwt' as the default name
  constructor(
    private readonly configService: ConfigService,
    // private readonly usersService: UsersService // Inject if you need to fetch user data
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Extract token from "Bearer <token>" header
      ignoreExpiration: false, // Ensure expired tokens are rejected
      secretOrKey: configService.get<string>('JWT_SECRET') ?? '',
    });
  }

  // This method is called after Passport verifies the JWT signature and expiration
  async validate(payload: any): Promise<any> {
    // Payload contains the data we put into it during login (sub, userId, email, etc.)
    // Optional: Fetch full user object from DB if needed for permissions, etc.
    // const user = await this.usersService.findById(payload.sub);
    // if (!user) {
    //   throw new UnauthorizedException();
    // }
    // return user; // If returning full user object

    // For simplicity, just return the validated payload.
    // This payload will be attached to req.user in protected routes.
    // Ensure payload includes necessary info like userId.
    if (!payload.sub || !payload.userId) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return { userId: payload.sub, email: payload.email /* , roles: payload.roles */ };
  }
}
