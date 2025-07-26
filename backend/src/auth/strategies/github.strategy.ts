import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Strategy as GitHubStrategyBase } from "passport-github2";
import { AuthProvider } from "src/users/dto/auth-provider.enum";
import { createOAuthStrategy } from "./base-oauth-strategy.factory";

const Base = createOAuthStrategy(GitHubStrategyBase, AuthProvider.GITHUB, {
  clientIdKey: "GITHUB_CLIENT_ID",
  clientSecretKey: "GITHUB_CLIENT_SECRET",
  callbackPathKey: "GITHUB_CALLBACK_URL",
  scope: ["user:email"],
});

@Injectable()
export class GithubStrategy extends Base {
  constructor(configService: ConfigService) {
    super(configService);
  }
}
