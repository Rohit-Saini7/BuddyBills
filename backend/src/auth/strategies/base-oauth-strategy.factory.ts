// src/auth/strategies/base-oauth-strategy.factory.ts
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Profile } from "passport";
import { AuthProvider } from "src/users/dto/auth-provider.enum";

export interface ProviderProfile {
  providerId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export type StrategyProfile<T extends AuthProvider> = ProviderProfile & {
  provider: T;
};

type OAuthStrategyConfig = {
  clientIdKey: string;
  clientSecretKey: string;
  callbackPathKey: string;
  scope: string[];
};

export function createOAuthStrategy<T extends AuthProvider>(
  StrategyBase: new (...args: any[]) => any,
  provider: T,
  configKeys: OAuthStrategyConfig
) {
  abstract class OAuthStrategy extends PassportStrategy(
    StrategyBase,
    provider
  ) {
    constructor(configService: ConfigService) {
      super({
        clientID: configService.get<string>(configKeys.clientIdKey) ?? "",
        clientSecret:
          configService.get<string>(configKeys.clientSecretKey) ?? "",
        callbackURL:
          (configService.get<string>("BACKEND_URL") ?? "") +
          (configService.get<string>(configKeys.callbackPathKey) ?? ""),
        scope: configKeys.scope,
      });
    }

    async validate(
      _accessToken: string,
      _refreshToken: string,
      profile: Profile
    ): Promise<StrategyProfile<T>> {
      return {
        provider,
        providerId: profile.id,
        email: profile.emails?.[0]?.value ?? "",
        name: profile.displayName,
        avatarUrl: profile.photos?.[0]?.value,
      };
    }
  }

  return OAuthStrategy;
}
