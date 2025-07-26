import { ConflictException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { Response } from "express";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

describe("AuthController", () => {
  let controller: AuthController;
  let authService: AuthService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let configService: ConfigService;

  const mockAuthService = {
    login: jest.fn(),
    completeLinking: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === "FRONTEND_URL") return "https://frontend.example.com";
      return null;
    }),
  };

  const mockResponse = () => {
    const res: Partial<Response> = {
      redirect: jest.fn(),
    };
    return res as Response;
  };

  const mockUser = {
    id: "123",
    name: "Test User",
    email: "test@example.com",
    provider: "google",
    providerId: "google-123",
  };

  beforeAll(() => {
    console.error = jest.fn();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("completeLinking", () => {
    it("should delegate to AuthService.completeLinking", async () => {
      const token = "some.jwt.token";
      const result = { accessToken: "abc" };

      mockAuthService.completeLinking.mockResolvedValue(result);

      expect(await controller.completeLinking({ token })).toBe(result);
      expect(authService.completeLinking).toHaveBeenCalledWith(token);
    });
  });

  describe("handleAuthRedirect", () => {
    it("should redirect to callback with access token on success", async () => {
      const req = { user: mockUser };
      const res = mockResponse();
      const token = "jwt-token";

      mockAuthService.login.mockResolvedValue({ accessToken: token });

      await controller["handleAuthRedirect"](req as any, res);

      expect(res.redirect).toHaveBeenCalledWith(
        `https://frontend.example.com/auth/callback?token=${token}`
      );
    });

    it("should redirect to link-account on ConflictException", async () => {
      const req = { user: mockUser };
      const res = mockResponse();

      const conflict = new ConflictException({
        linkingToken: "link-token",
        existingProviders: "github",
      });

      mockAuthService.login.mockRejectedValue(conflict);

      await controller["handleAuthRedirect"](req as any, res);

      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining(
          "https://frontend.example.com/auth/link-account?"
        )
      );

      const redirectUrl = (res.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl).toContain("token=link-token");
      expect(redirectUrl).toContain("provider=google");
      expect(redirectUrl).toContain("existingProviders=github");
      expect(redirectUrl).toContain("name=Test+User");
    });

    it("should redirect to login failure on unexpected error", async () => {
      const req = { user: mockUser };
      const res = mockResponse();

      mockAuthService.login.mockRejectedValue(new Error("something bad"));

      await controller["handleAuthRedirect"](req as any, res);

      expect(res.redirect).toHaveBeenCalledWith(
        "https://frontend.example.com/login/failure"
      );
    });

    it("should redirect to login failure if no user", async () => {
      const req = {}; // no user
      const res = mockResponse();

      await controller["handleAuthRedirect"](req as any, res);

      expect(res.redirect).toHaveBeenCalledWith(
        "https://frontend.example.com/login/failure"
      );
    });
  });

  describe("googleAuth & githubAuth", () => {
    it("should return undefined (passport will redirect)", () => {
      expect(controller.googleAuth()).toBeUndefined();
      expect(controller.githubAuth()).toBeUndefined();
    });
  });

  describe("googleAuthRedirect & githubAuthRedirect", () => {
    it("should call handleAuthRedirect for Google", async () => {
      const req = { user: mockUser };
      const res = mockResponse();

      const spy = jest
        .spyOn(controller as any, "handleAuthRedirect")
        .mockImplementation(() => Promise.resolve());

      await controller.googleAuthRedirect(req as any, res);
      expect(spy).toHaveBeenCalledWith(req, res);
    });

    it("should call handleAuthRedirect for GitHub", async () => {
      const req = { user: mockUser };
      const res = mockResponse();

      const spy = jest
        .spyOn(controller as any, "handleAuthRedirect")
        .mockImplementation(() => Promise.resolve());

      await controller.githubAuthRedirect(req as any, res);
      expect(spy).toHaveBeenCalledWith(req, res);
    });
  });
});
