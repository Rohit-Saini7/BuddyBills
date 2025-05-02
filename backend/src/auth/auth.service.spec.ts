import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { Profile } from "passport-google-oauth20";
import { User } from "../users/entities/user.entity";
import { UsersService } from "../users/users.service";
import { AuthService } from "./auth.service";

//* --- Mocks ---
const mockUsersService = {
  findByGoogleId: jest.fn(),
  findByEmail: jest.fn(),
  createFromGoogleProfile: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
};

//* --- Mock Data ---
const mockUser: User = {
  id: "user-uuid-123",
  google_id: "google-profile-id-abc",
  email: "test@example.com",
  name: "Test User",
  avatar_url: "random-avatar-url",
  createdAt: new Date(),
  updatedAt: new Date(),
  createdGroups: [],
  groupMemberships: [],
  paidExpenses: [],
  paymentsMade: [],
  paymentsReceived: [],
};

const mockNewUser: User = {
  id: "user-uuid-456",
  google_id: "google-profile-id-xyz",
  email: "new.user@example.com",
  name: "New Google User",
  avatar_url: "http://new.avatar.url",
  createdAt: new Date(),
  updatedAt: new Date(),
  createdGroups: [],
  groupMemberships: [],
  paidExpenses: [],
  paymentsMade: [],
  paymentsReceived: [],
};

const mockProfileWithEmail: Profile = {
  id: "google-profile-id-abc",
  displayName: "Test User",
  emails: [{ value: "test@example.com", verified: true }],
  provider: "google",
  _raw: "",
  _json: {} as any,
  profileUrl: "",
};

const mockProfileWithoutEmail: Profile = {
  id: "google-profile-id-def",
  displayName: "No Email User",
  emails: [],
  provider: "google",
  _raw: "",
  _json: {} as any,
  profileUrl: "",
};

const mockProfileNewUser: Profile = {
  id: "google-profile-id-xyz",
  displayName: "New Google User",
  emails: [{ value: "new.user@example.com", verified: true }],
  photos: [{ value: "http://new.avatar.url" }],
  provider: "google",
  _raw: "",
  _json: {} as any,
  profileUrl: "",
};

describe("AuthService", () => {
  let service: AuthService;
  let usersService: typeof mockUsersService;
  let jwtService: typeof mockJwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);

    //? Reset mocks before each test
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  //* --- Tests for validateUserByGoogleProfile ---
  describe("validateUserByGoogleProfile", () => {
    it("should throw UnauthorizedException if profile has no email", async () => {
      //? Arrange
      const profile = mockProfileWithoutEmail;

      //? Act & Assert
      await expect(
        service.validateUserByGoogleProfile(profile)
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.validateUserByGoogleProfile(profile)
      ).rejects.toThrow("Google profile does not contain email.");

      //? Verify
      expect(usersService.findByGoogleId).not.toHaveBeenCalled();
      expect(usersService.createFromGoogleProfile).not.toHaveBeenCalled();
    });

    it("should return existing user if found by Google ID", async () => {
      //? Arrange
      const profile = mockProfileWithEmail;
      usersService.findByGoogleId.mockResolvedValue(mockUser);

      //? Act
      const result = await service.validateUserByGoogleProfile(profile);

      //? Assert
      expect(result).toEqual(mockUser);
      expect(usersService.findByGoogleId).toHaveBeenCalledTimes(1);
      expect(usersService.findByGoogleId).toHaveBeenCalledWith(profile.id);
      expect(usersService.createFromGoogleProfile).not.toHaveBeenCalled();
    });

    it("should create and return a new user if not found by Google ID", async () => {
      //? Arrange
      const profile = mockProfileNewUser;
      usersService.findByGoogleId.mockResolvedValue(null);
      usersService.createFromGoogleProfile.mockResolvedValue(mockNewUser);

      //? Act
      const result = await service.validateUserByGoogleProfile(profile);

      //? Assert
      expect(result).toEqual(mockNewUser);
      expect(usersService.findByGoogleId).toHaveBeenCalledTimes(1);
      expect(usersService.findByGoogleId).toHaveBeenCalledWith(profile.id);
      expect(usersService.createFromGoogleProfile).toHaveBeenCalledTimes(1);
      expect(usersService.createFromGoogleProfile).toHaveBeenCalledWith(
        profile
      );
    });

    it("should throw UnauthorizedException if user not found and creation fails", async () => {
      //? Arrange
      const profile = mockProfileNewUser;
      usersService.findByGoogleId.mockResolvedValue(null);
      usersService.createFromGoogleProfile.mockResolvedValue(null);

      //? Act & Assert
      await expect(
        service.validateUserByGoogleProfile(profile)
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.validateUserByGoogleProfile(profile)
      ).rejects.toThrow("Could not create or validate user.");

      //? Verify
      expect(usersService.findByGoogleId).toHaveBeenCalledTimes(2);
      expect(usersService.findByGoogleId).toHaveBeenCalledWith(profile.id);
      expect(usersService.createFromGoogleProfile).toHaveBeenCalledTimes(2);
      expect(usersService.createFromGoogleProfile).toHaveBeenCalledWith(
        profile
      );
    });

    it("should propagate error from findByGoogleId", async () => {
      //? Arrange
      const profile = mockProfileWithEmail;
      const dbError = new Error("DB Find Error");
      usersService.findByGoogleId.mockRejectedValue(dbError);

      //? Act & Assert
      await expect(
        service.validateUserByGoogleProfile(profile)
      ).rejects.toThrow(dbError);

      //? Verify
      expect(usersService.findByGoogleId).toHaveBeenCalledTimes(1);
      expect(usersService.findByGoogleId).toHaveBeenCalledWith(profile.id);
      expect(usersService.createFromGoogleProfile).not.toHaveBeenCalled();
    });

    it("should propagate error from createFromGoogleProfile", async () => {
      //? Arrange
      const profile = mockProfileNewUser;
      const createError = new Error("DB Create Error");
      usersService.findByGoogleId.mockResolvedValue(null);
      usersService.createFromGoogleProfile.mockRejectedValue(createError);

      //? Act & Assert
      await expect(
        service.validateUserByGoogleProfile(profile)
      ).rejects.toThrow(createError);

      //? Verify
      expect(usersService.findByGoogleId).toHaveBeenCalledTimes(1);
      expect(usersService.findByGoogleId).toHaveBeenCalledWith(profile.id);
      expect(usersService.createFromGoogleProfile).toHaveBeenCalledTimes(1);
      expect(usersService.createFromGoogleProfile).toHaveBeenCalledWith(
        profile
      );
    });
  });

  //* --- Tests for login method ---
  describe("login", () => {
    it("should generate and return an access token", async () => {
      //? Arrange
      const mockAccessToken = "mock.jwt.token.string";
      const expectedPayload = {
        sub: mockUser.id,
        userId: mockUser.id,
        email: mockUser.email,
      };
      jwtService.sign.mockReturnValue(mockAccessToken);

      //? Act
      const result = await service.login(mockUser);

      //? Assert
      expect(jwtService.sign).toHaveBeenCalledTimes(1);
      //? Verify
      expect(jwtService.sign).toHaveBeenCalledWith(expectedPayload);
      expect(result).toBeInstanceOf(Object);
      expect(result).toEqual({ accessToken: mockAccessToken });
    });

    it("should handle user object with missing email (if possible)", async () => {
      //? Arrange
      const userWithoutEmail = { ...mockUser, email: undefined };
      const mockAccessToken = "mock.jwt.token.no.email";
      const expectedPayload = {
        sub: userWithoutEmail.id,
        userId: userWithoutEmail.id,
        email: undefined,
      };
      jwtService.sign.mockReturnValue(mockAccessToken);

      //? Act
      const result = await service.login(userWithoutEmail as unknown as User);
      //? Assert
      expect(jwtService.sign).toHaveBeenCalledTimes(1);
      expect(jwtService.sign).toHaveBeenCalledWith(expectedPayload);
      expect(result).toEqual({ accessToken: mockAccessToken });
    });
  });
});
