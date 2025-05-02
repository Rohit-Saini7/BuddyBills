import { ConfigService } from "@nestjs/config";
import { AuthGuard } from "@nestjs/passport";
import { Test, TestingModule } from "@nestjs/testing";
import { Request, Response } from "express";
import { User } from "../users/entities/user.entity";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthResponseDto } from "./dto/auth-response.dto";

//* --- Mocks ---
const mockAuthService = {
  login: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

//* Mock AuthGuard('google') - simple mock assuming it passes for controller logic tests
const mockGoogleAuthGuard = {
  canActivate: jest.fn().mockReturnValue(true),
};

interface AuthenticatedRequest extends Request {
  user?: User;
}

//* --- Mock Data ---
const mockUser: User = {
  id: "user-uuid-123",
  google_id: "google-profile-id-abc",
  email: "test@example.com",
  name: "Test User",
  avatar_url: "null",
  createdAt: new Date(),
  updatedAt: new Date(),
  createdGroups: [],
  groupMemberships: [],
  paidExpenses: [],
  paymentsMade: [],
  paymentsReceived: [],
};

const mockAccessToken = "mock.jwt.token.string";
const mockAuthResponse: AuthResponseDto = { accessToken: mockAccessToken };
const mockFrontendUrl = "http://localhost:3000";
const mockFailureRedirectUrl = `${mockFrontendUrl}/login/failure`;
const mockSuccessRedirectUrlBase = `${mockFrontendUrl}/auth/callback`;
const mockSuccessRedirectUrlWithToken = `${mockSuccessRedirectUrlBase}?token=${mockAccessToken}`;

describe("AuthController", () => {
  let controller: AuthController;
  let authService: typeof mockAuthService;
  let configService: typeof mockConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    })
      .overrideGuard(AuthGuard("google"))
      .useValue(mockGoogleAuthGuard)
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    configService = module.get(ConfigService);

    jest.clearAllMocks();

    configService.get.mockImplementation((key: string) => {
      if (key === "FRONTEND_URL") return mockFrontendUrl;
      return undefined;
    });
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  //* --- Test for googleAuth ---
  describe("googleAuth", () => {
    it("should exist (functionality relies on AuthGuard)", () => {
      expect(controller.googleAuth).toBeDefined();
    });
  });

  //* --- Tests for googleAuthRedirect ---
  describe("googleAuthRedirect", () => {
    let mockRequest: Partial<Request>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
      mockRequest = {};
      mockRes = {
        redirect: jest.fn(),
      };
    });

    it("should call authService.login and redirect with token if req.user exists", async () => {
      //? Arrange
      mockRequest.user = mockUser;
      authService.login.mockResolvedValue(mockAuthResponse);

      //? Act
      await controller.googleAuthRedirect(
        mockRequest as AuthenticatedRequest,
        mockRes as Response
      );

      //? Assert
      expect(configService.get).toHaveBeenCalledWith("FRONTEND_URL");

      expect(authService.login).toHaveBeenCalledTimes(1);
      expect(authService.login).toHaveBeenCalledWith(mockUser);

      expect(mockRes.redirect).toHaveBeenCalledTimes(1);
      expect(mockRes.redirect).toHaveBeenCalledWith(
        mockSuccessRedirectUrlWithToken
      );
    });

    it("should redirect to failure URL if req.user does not exist", async () => {
      //? Arrange
      mockRequest.user = undefined;

      //? Act
      await controller.googleAuthRedirect(
        mockRequest as AuthenticatedRequest,
        mockRes as Response
      );

      //? Assert
      expect(configService.get).toHaveBeenCalledWith("FRONTEND_URL");

      expect(authService.login).not.toHaveBeenCalled();

      expect(mockRes.redirect).toHaveBeenCalledTimes(1);
      expect(mockRes.redirect).toHaveBeenCalledWith(mockFailureRedirectUrl);
    });

    it("should propagate error if authService.login fails", async () => {
      //? Arrange
      mockRequest.user = mockUser;
      const loginError = new Error("Failed to sign JWT");
      authService.login.mockRejectedValue(loginError);

      //? Act & Assert
      await expect(
        controller.googleAuthRedirect(
          mockRequest as AuthenticatedRequest,
          mockRes as Response
        )
      ).rejects.toThrow(loginError);

      //? Verify service was called
      expect(authService.login).toHaveBeenCalledTimes(1);
      expect(authService.login).toHaveBeenCalledWith(mockUser);

      //? Verify redirect was NOT called
      expect(mockRes.redirect).not.toHaveBeenCalled();
    });
  });
});
