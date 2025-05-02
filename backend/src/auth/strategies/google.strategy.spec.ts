import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { Profile } from "passport-google-oauth20";
import { User } from "../../users/entities/user.entity";
import { AuthService } from "../auth.service";
import { GoogleStrategy } from "./google.strategy";

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === "GOOGLE_CLIENT_ID") return "google-client-id";
    if (key === "GOOGLE_CLIENT_SECRET") return "google-client-secret";
    if (key === "GOOGLE_CALLBACK_URL")
      return "http://localhost/auth/google/callback";
    return null;
  }),
};

const mockAuthService = {
  validateUserByGoogleProfile: jest.fn(),
};

const mockUser: User = {
  id: "user-uuid-from-google",
  google_id: "google-profile-id-123",
  email: "google.user@example.com",
  name: "Google User",
  avatar_url: "http://avatar.url",
  createdAt: new Date(),
  updatedAt: new Date(),
  createdGroups: [],
  groupMemberships: [],
  paidExpenses: [],
  paymentsMade: [],
  paymentsReceived: [],
};

const mockProfile: Profile = {
  id: "google-profile-id-123",
  displayName: "Google User",
  name: { givenName: "Google", familyName: "User" },
  emails: [{ value: "google.user@example.com", verified: true }],
  photos: [{ value: "http://avatar.url" }],
  provider: "google",
  _raw: "{}",
  _json: {
    sub: "google-profile-id-123",
    name: "Google User",
    given_name: "Google",
    family_name: "User",
    picture: "http://avatar.url",
    email: "google.user@example.com",
    email_verified: true,
    locale: "en",
    iss: "",
    azp: undefined,
    aud: "",
    at_hash: undefined,
    iat: 0,
    exp: 0,
    hd: undefined,
    nonce: undefined,
    profile: undefined,
  },
  profileUrl: "",
};

describe("GoogleStrategy", () => {
  let strategy: GoogleStrategy;
  let authService: typeof mockAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
    authService = module.get(AuthService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(strategy).toBeDefined();
  });

  describe("validate", () => {
    const mockAccessToken = "mock-access-token";
    const mockRefreshToken = "mock-refresh-token";

    it("should call authService.validateUserByGoogleProfile and return the user on success", async () => {
      //? Arrange
      authService.validateUserByGoogleProfile.mockResolvedValue(mockUser);

      //? Act
      const result = await strategy.validate(
        mockAccessToken,
        mockRefreshToken,
        mockProfile
      );

      //? Assert
      expect(authService.validateUserByGoogleProfile).toHaveBeenCalledTimes(1);
      expect(authService.validateUserByGoogleProfile).toHaveBeenCalledWith(
        mockProfile
      );
      expect(result).toEqual(mockUser);
    });

    it("should throw UnauthorizedException if authService returns null", async () => {
      //? Arrange
      authService.validateUserByGoogleProfile.mockResolvedValue(null);

      //? Act & Assert
      await expect(
        strategy.validate(mockAccessToken, mockRefreshToken, mockProfile)
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        strategy.validate(mockAccessToken, mockRefreshToken, mockProfile)
      ).rejects.toThrow(
        "Could not validate or create user from Google profile."
      );

      //? Verify service call
      expect(authService.validateUserByGoogleProfile).toHaveBeenCalledTimes(2);
      expect(authService.validateUserByGoogleProfile).toHaveBeenCalledWith(
        mockProfile
      );
    });

    it("should catch errors from authService and throw UnauthorizedException", async () => {
      //? Arrange
      const dbError = new Error("Database connection error");
      authService.validateUserByGoogleProfile.mockRejectedValue(dbError);
      //* --- Add spy to suppress console.error JUST for this test ---
      const errorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => { });
      //? Act & Assert
      await expect(
        strategy.validate(mockAccessToken, mockRefreshToken, mockProfile)
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        strategy.validate(mockAccessToken, mockRefreshToken, mockProfile)
      ).rejects.toThrow("Authentication failed during Google validation.");

      errorSpy.mockRestore();
      //? Verify service call
      expect(authService.validateUserByGoogleProfile).toHaveBeenCalledTimes(2);
      expect(authService.validateUserByGoogleProfile).toHaveBeenCalledWith(
        mockProfile
      );
    });
  });
});
