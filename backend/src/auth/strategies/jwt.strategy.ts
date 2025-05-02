import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), //? Extract token from "Bearer <token>" header
      ignoreExpiration: false, //? Ensure expired tokens are rejected
      secretOrKey: configService.get<string>("JWT_SECRET") ?? "",
    });
  }

  //? This method is called after Passport verifies the JWT signature and expiration
  async validate(payload: any): Promise<any> {
    //? Payload contains the data we put into it during login (sub, userId, email, etc.)

    if (!payload.sub || !payload.userId) {
      throw new UnauthorizedException("Invalid token payload");
    }
    return {
      userId: payload.sub,
      email: payload.email,
    };
  }
}
