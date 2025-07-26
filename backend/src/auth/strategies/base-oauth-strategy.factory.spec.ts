import { ConfigService } from "@nestjs/config";
import { Profile } from "passport";
import { AuthProvider } from "src/users/dto/auth-provider.enum";
import {
  createOAuthStrategy,
  StrategyProfile,
} from "./base-oauth-strategy.factory";

class MockPassportStrategy {
  constructor(config: any) {
    // Simulate what PassportStrategy constructor would receive
    (this as any).config = config;
  }
}

describe("createOAuthStrategy", () => {
  const mockConfigService = {
    get: jest.fn((key: string) => {
      const mockConfig: Record<string, string> = {
        GOOGLE_CLIENT_ID: "google-client-id",
        GOOGLE_CLIENT_SECRET: "google-client-secret",
        GOOGLE_CALLBACK_PATH: "/auth/google/callback",
        BACKEND_URL: "https://api.example.com",
      };
      return mockConfig[key];
    }),
  } as unknown as ConfigService;

  const oauthConfig = {
    clientIdKey: "GOOGLE_CLIENT_ID",
    clientSecretKey: "GOOGLE_CLIENT_SECRET",
    callbackPathKey: "GOOGLE_CALLBACK_PATH",
    scope: ["profile", "email"],
  };

  const provider = AuthProvider.GOOGLE;

  it("should return a class that extends PassportStrategy with correct config", () => {
    const Strategy = createOAuthStrategy(
      MockPassportStrategy as any,
      provider,
      oauthConfig
    );
    class TestStrategy extends Strategy { }
    const instance = new TestStrategy(mockConfigService);
    expect((instance as any).config).toEqual({
      clientID: "google-client-id",
      clientSecret: "google-client-secret",
      callbackURL: "https://api.example.com/auth/google/callback",
      scope: ["profile", "email"],
    });
  });

  it("should return a correct StrategyProfile from validate()", async () => {
    const Strategy = createOAuthStrategy(
      MockPassportStrategy as any,
      provider,
      oauthConfig
    );
    class TestStrategy extends Strategy { }
    const instance = new TestStrategy(mockConfigService);

    const mockProfile: Profile = {
      id: "123456",
      displayName: "John Doe",
      emails: [{ value: "john@example.com" }],
      photos: [{ value: "https://example.com/avatar.jpg" }],
      provider: "google",
    };

    const result = await instance.validate(
      "token",
      "refreshToken",
      mockProfile
    );

    const expected: StrategyProfile<AuthProvider.GOOGLE> = {
      provider: AuthProvider.GOOGLE,
      providerId: "123456",
      email: "john@example.com",
      name: "John Doe",
      avatarUrl: "https://example.com/avatar.jpg",
    };

    expect(result).toEqual(expected);
  });

  it("should handle missing email and photo fields in validate()", async () => {
    const Strategy = createOAuthStrategy(
      MockPassportStrategy as any,
      provider,
      oauthConfig
    );
    class TestStrategy extends Strategy { }
    const instance = new TestStrategy(mockConfigService);

    const mockProfile: Profile = {
      id: "789",
      displayName: "No Email User",
      emails: undefined,
      photos: undefined,
      provider: "google",
    };

    const result = await instance.validate("access", "refresh", mockProfile);

    expect(result).toEqual({
      provider: AuthProvider.GOOGLE,
      providerId: "789",
      email: "",
      name: "No Email User",
      avatarUrl: undefined,
    });
  });
});
