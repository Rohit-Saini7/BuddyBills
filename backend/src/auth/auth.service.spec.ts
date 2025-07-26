import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { AuthProvider } from "src/users/dto/auth-provider.enum";
import { User } from "../users/entities/user.entity";
import { UsersService } from "../users/users.service";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser: User = {
    id: "user-id-123",
    email: "test@example.com",
    name: "Test User",
    avatar_url: "http://example.com/avatar.png",
  } as User;

  beforeAll(() => {
    console.error = jest.fn();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            processProviderLogin: jest.fn(),
            linkProviderToUser: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = module.get(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  describe("login", () => {
    it("should return accessToken after successful login", async () => {
      usersService.processProviderLogin.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue("signed-jwt");

      const result = await authService.login({
        provider: AuthProvider.GOOGLE,
        providerId: "google-id-123",
        email: mockUser.email,
        name: mockUser.name,
        avatarUrl: mockUser.avatar_url,
      });

      expect(usersService.processProviderLogin).toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        userId: mockUser.id,
        email: mockUser.email,
      });
      expect(result).toEqual({ accessToken: "signed-jwt" });
    });
  });

  describe("completeLinking", () => {
    const linkingToken = "linking-jwt";
    const decodedPayload = {
      sub: "user-id-123",
      provider: AuthProvider.GITHUB,
      providerId: "github-123",
    };

    it("should complete linking and return accessToken", async () => {
      jwtService.verify.mockReturnValue(decodedPayload);
      configService.get.mockReturnValue("mock-secret");
      usersService.linkProviderToUser.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue("linked-jwt");

      const result = await authService.completeLinking(linkingToken);

      expect(jwtService.verify).toHaveBeenCalledWith(linkingToken, {
        secret: "mock-secret",
      });
      expect(usersService.linkProviderToUser).toHaveBeenCalledWith({
        userId: decodedPayload.sub,
        provider: decodedPayload.provider,
        providerId: decodedPayload.providerId,
      });
      expect(result).toEqual({ accessToken: "linked-jwt" });
    });

    it("should throw BadRequestException if JWT is invalid", async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error("Token invalid");
      });

      configService.get.mockReturnValue("mock-secret");

      await expect(authService.completeLinking(linkingToken)).rejects.toThrow(
        BadRequestException
      );

      expect(jwtService.verify).toHaveBeenCalledWith(linkingToken, {
        secret: "mock-secret",
      });
    });
  });
});
