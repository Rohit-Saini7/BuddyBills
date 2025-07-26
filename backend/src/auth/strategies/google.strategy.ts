import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Strategy as GoogleStrategyBase } from "passport-google-oauth20";
import { AuthProvider } from "src/users/dto/auth-provider.enum";
import { createOAuthStrategy } from "./base-oauth-strategy.factory";

const Base = createOAuthStrategy(GoogleStrategyBase, AuthProvider.GOOGLE, {
  clientIdKey: "GOOGLE_CLIENT_ID",
  clientSecretKey: "GOOGLE_CLIENT_SECRET",
  callbackPathKey: "GOOGLE_CALLBACK_URL",
  scope: ["profile", "email"],
});

@Injectable()
export class GoogleStrategy extends Base {
  constructor(configService: ConfigService) {
    super(configService);
  }
}
