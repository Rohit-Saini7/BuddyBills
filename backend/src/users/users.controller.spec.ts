import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { User } from "./entities/user.entity";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

describe("UsersController", () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockUser = {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
    avatar_url: "http://avatar.com",
  } as User;

  const mockUsersService = {
    findById: jest.fn(),
  };

  const mockRequest = {
    user: {
      userId: "test-user-id",
      email: "test@example.com",
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("getMe()", () => {
    it("should return user when found", async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await controller.getMe(mockRequest as any);

      expect(usersService.findById).toHaveBeenCalledWith("test-user-id");
      expect(result).toEqual(mockUser);
    });

    it("should throw NotFoundException if user not found", async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(controller.getMe(mockRequest as any)).rejects.toThrow(
        NotFoundException
      );
      expect(usersService.findById).toHaveBeenCalledWith("test-user-id");
    });
  });
});
