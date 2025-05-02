import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "./entities/user.entity";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

interface MockUserPayload {
  userId: string;
  email: string;
}

interface MockRequest extends Request {
  user: MockUserPayload;
}

//* --- Mocks ---
const mockUsersService = {
  findMeById: jest.fn(),
};

const mockJwtAuthGuard = {
  canActivate: jest.fn(),
};

describe("UsersController", () => {
  let controller: UsersController;
  let service: typeof mockUsersService;

  //* --- Mock Data ---
  const mockUserId = "test-user-uuid-12345";
  const mockUserEmail = "test@example.com";

  const mockUserPayload: MockUserPayload = {
    userId: mockUserId,
    email: mockUserEmail,
  };

  const mockRequest: Partial<MockRequest> = {
    user: mockUserPayload,
  };

  const mockUserEntity: User = {
    id: mockUserId,
    google_id: "google-123",
    email: mockUserEmail,
    name: "Test User",
    avatar_url: "https://example.com/avatar/testuser.png",
    createdAt: new Date(),
    updatedAt: new Date(),

    createdGroups: [],
    groupMemberships: [],
    paidExpenses: [],
    paymentsMade: [],
    paymentsReceived: [],
  };
  //* --- End Mock Data ---

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })

      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<UsersController>(UsersController);

    service = module.get(UsersService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  //* --- Test Suite for getMe method ---
  describe("getMe", () => {
    it("should call usersService.findMeById with correct userId and return the user", async () => {
      //? Arrange

      mockJwtAuthGuard.canActivate.mockReturnValue(true);

      service.findMeById.mockResolvedValue(mockUserEntity);

      //? Act
      const result = await controller.getMe(mockRequest as any);

      //? Assert

      expect(service.findMeById).toHaveBeenCalledTimes(1);
      expect(service.findMeById).toHaveBeenCalledWith(mockUserId);

      expect(result).toEqual(mockUserEntity);
    });

    it("should throw NotFoundException if usersService.findMeById throws it", async () => {
      //? Arrange
      const expectedError = new NotFoundException("User not found.");
      service.findMeById.mockRejectedValue(expectedError);

      //? Act & Assert
      await expect(controller.getMe(mockRequest as any)).rejects.toThrow(
        NotFoundException
      );

      //? Verify service interaction
      expect(service.findMeById).toHaveBeenCalledTimes(1);
      expect(service.findMeById).toHaveBeenCalledWith(mockUserId);
    });

    //[]: fix this test
    /* it("should throw UnauthorizedException if JwtAuthGuard rejects", async () => {
      //? Arrange
      const authError = new UnauthorizedException();
      mockJwtAuthGuard.canActivate.mockImplementation(() => {
        throw authError;
      });

      //? Act & Assert
      await expect(controller.getMe(mockRequest as any)).rejects.toThrow(
        UnauthorizedException
      );

      //? Verify guard was called but service method was NOT
      expect(service.findMeById).not.toHaveBeenCalled();
    }); */

    it("should throw an error if req.user or req.user.userId is missing (though guard should prevent this)", async () => {
      //? Arrange: Guard passes, but request is malformed (hypothetical)
      mockJwtAuthGuard.canActivate.mockReturnValue(true);
      const malformedRequest: any = {};

      //? Act & Assert: Accessing req.user.userId will throw a TypeError
      await expect(controller.getMe(malformedRequest)).rejects.toThrow(
        TypeError
      );

      //? Verify service was not called
      expect(service.findMeById).not.toHaveBeenCalled();
    });
  });
});
