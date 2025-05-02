import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ObjectLiteral, Repository } from "typeorm";
import { User } from "./entities/user.entity";
import { UsersService } from "./users.service";

type MockRepository<T extends ObjectLiteral = any> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const createMockRepository = <
  T extends ObjectLiteral = any,
>(): MockRepository<T> => ({
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

type MockGoogleProfile = {
  id: string;
  emails?: { value: string; verified: boolean }[];
  displayName: string;
  photos?: { value: string }[];
};

describe("UsersService", () => {
  let service: UsersService;
  let userRepository: MockRepository<User>;

  //* --- Mock Data Setup ---
  const mockUserId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
  const mockGoogleId = "google-unique-id-12345";
  const mockEmail = "test.user@example.com";
  const mockDisplayName = "Test User";
  const mockAvatarUrl = "https://example.com/avatar/testuser.png";

  const mockUser: User = {
    id: mockUserId,
    google_id: mockGoogleId,
    email: mockEmail,
    name: mockDisplayName,
    avatar_url: mockAvatarUrl,
    createdAt: new Date("2023-10-26T10:00:00.000Z"),
    updatedAt: new Date("2023-10-26T11:30:00.000Z"),
    createdGroups: [],
    groupMemberships: [],
    paidExpenses: [],
    paymentsMade: [],
    paymentsReceived: [],
  };

  const mockProfileFull: MockGoogleProfile = {
    id: mockGoogleId,
    emails: [{ value: mockEmail, verified: true }],
    displayName: mockDisplayName,
    photos: [{ value: mockAvatarUrl }],
  };

  const mockProfileMinimal: MockGoogleProfile = {
    id: "google-minimal-id-67890",
    displayName: "Minimal User",
  };

  const mockProfileNoPhotos: MockGoogleProfile = {
    id: "google-no-photo-id-11223",
    emails: [{ value: "nophoto@example.com", verified: true }],
    displayName: "No Photo User",
  };
  //* --- End Mock Data Setup ---

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository<User>(),
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<MockRepository<User>>(getRepositoryToken(User));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
    expect(userRepository).toBeDefined();
  });

  //* --- Test Suite for findMeById method ---
  describe("findMeById", () => {
    it("should find and return a user by id when the user exists", async () => {
      //? Arrange: Configure the mock repository findOneBy method

      userRepository.findOneBy?.mockResolvedValue(mockUser);

      //? Act: Call the service method being tested
      const result = await service.findMeById(mockUserId);

      //? Assert: Verify the outcome

      expect(result).toEqual(mockUser);

      expect(userRepository.findOneBy).toHaveBeenCalledTimes(1);

      expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: mockUserId });
    });

    it("should throw NotFoundException if the user does not exist", async () => {
      //? Arrange: Configure the mock repository findOneBy method

      userRepository.findOneBy?.mockResolvedValue(null);

      //? Act & Assert: Use Jest's .rejects.toThrow() to verify that the promise rejects

      await expect(service.findMeById(mockUserId)).rejects.toThrow(
        NotFoundException
      );

      await expect(service.findMeById(mockUserId)).rejects.toThrow(
        "User not found."
      );

      //? Assert: Verify repository interaction (called twice due to two awaits above)
      expect(userRepository.findOneBy).toHaveBeenCalledTimes(2);
      expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: mockUserId });
    });

    it("should propagate errors thrown by the repository", async () => {
      //? Arrange: Configure the mock repository to simulate a database error
      const dbError = new Error("Database connection error");
      userRepository.findOneBy?.mockRejectedValue(dbError);

      //? Act & Assert: Expect the service method to reject with the exact same error
      await expect(service.findMeById(mockUserId)).rejects.toThrow(dbError);

      //? Assert: Verify repository interaction
      expect(userRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: mockUserId });
    });
  });

  //* --- Test Suite for findByGoogleId method ---
  describe("findByGoogleId", () => {
    it("should return a user when found by google_id", async () => {
      //? Arrange
      userRepository.findOneBy?.mockResolvedValue(mockUser);

      //? Act
      const result = await service.findByGoogleId(mockGoogleId);

      //? Assert
      expect(result).toEqual(mockUser);
      expect(userRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneBy).toHaveBeenCalledWith({
        google_id: mockGoogleId,
      });
    });

    it("should return null when user is not found by google_id", async () => {
      //? Arrange
      userRepository.findOneBy?.mockResolvedValue(null);

      //? Act
      const result = await service.findByGoogleId(mockGoogleId);

      //? Assert
      expect(result).toBeNull();
      expect(userRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneBy).toHaveBeenCalledWith({
        google_id: mockGoogleId,
      });
    });

    it("should propagate errors thrown by the repository (findByGoogleId)", async () => {
      //? Arrange
      const dbError = new Error("Database query failed");
      userRepository.findOneBy?.mockRejectedValue(dbError);

      //? Act & Assert
      await expect(service.findByGoogleId(mockGoogleId)).rejects.toThrow(
        dbError
      );
      expect(userRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneBy).toHaveBeenCalledWith({
        google_id: mockGoogleId,
      });
    });
  });

  //* --- Test Suite for findByEmail method ---
  describe("findByEmail", () => {
    it("should return a user when found by email", async () => {
      //? Arrange
      userRepository.findOneBy?.mockResolvedValue(mockUser);

      //? Act
      const result = await service.findByEmail(mockEmail);

      //? Assert
      expect(result).toEqual(mockUser);
      expect(userRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneBy).toHaveBeenCalledWith({
        email: mockEmail,
      });
    });

    it("should return null when user is not found by email", async () => {
      //? Arrange
      userRepository.findOneBy?.mockResolvedValue(null);

      //? Act
      const result = await service.findByEmail(mockEmail);

      //? Assert
      expect(result).toBeNull();
      expect(userRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneBy).toHaveBeenCalledWith({
        email: mockEmail,
      });
    });

    it("should propagate errors thrown by the repository (findByEmail)", async () => {
      //? Arrange
      const dbError = new Error("Another database error");
      userRepository.findOneBy?.mockRejectedValue(dbError);

      //? Act & Assert
      await expect(service.findByEmail(mockEmail)).rejects.toThrow(dbError);
      expect(userRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneBy).toHaveBeenCalledWith({
        email: mockEmail,
      });
    });
  });

  //* --- Test Suite for createFromGoogleProfile method ---
  describe("createFromGoogleProfile", () => {
    it("should create and save a new user from a full google profile", async () => {
      //? Arrange

      const createdUserData = {
        google_id: mockProfileFull.id,
        email: mockProfileFull.emails?.[0].value,
        name: mockProfileFull.displayName,
        avatar_url: mockProfileFull.photos?.[0].value,
      };

      const createdUserEntity = { ...createdUserData } as User;
      userRepository.create?.mockReturnValue(createdUserEntity);

      const savedUserEntity = {
        ...createdUserEntity,
        id: "new-user-id-abcde",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;
      userRepository.save?.mockResolvedValue(savedUserEntity);

      //? Act
      const result = await service.createFromGoogleProfile(mockProfileFull);

      //? Assert

      expect(userRepository.create).toHaveBeenCalledTimes(1);
      expect(userRepository.create).toHaveBeenCalledWith(createdUserData);

      expect(userRepository.save).toHaveBeenCalledTimes(1);
      expect(userRepository.save).toHaveBeenCalledWith(createdUserEntity);

      expect(result).toEqual(savedUserEntity);
    });

    it("should create and save a user with missing email and photo", async () => {
      //? Arrange
      const createdUserData = {
        google_id: mockProfileMinimal.id,
        email: "",
        name: mockProfileMinimal.displayName,
        avatar_url: undefined,
      };
      const createdUserEntity = { ...createdUserData } as unknown as User;
      const savedUserEntity = {
        ...createdUserEntity,
        id: "minimal-user-id",
      } as User;

      userRepository.create?.mockReturnValue(createdUserEntity);
      userRepository.save?.mockResolvedValue(savedUserEntity);

      //? Act
      const result = await service.createFromGoogleProfile(mockProfileMinimal);

      //? Assert
      expect(userRepository.create).toHaveBeenCalledTimes(1);
      expect(userRepository.create).toHaveBeenCalledWith(createdUserData);
      expect(userRepository.save).toHaveBeenCalledTimes(1);
      expect(userRepository.save).toHaveBeenCalledWith(createdUserEntity);
      expect(result).toEqual(savedUserEntity);
    });

    it("should create and save a user with missing photo only", async () => {
      //? Arrange
      const createdUserData = {
        google_id: mockProfileNoPhotos.id,
        email: mockProfileNoPhotos.emails?.[0].value,
        name: mockProfileNoPhotos.displayName,
        avatar_url: undefined,
      };
      const createdUserEntity = { ...createdUserData } as unknown as User;
      const savedUserEntity = {
        ...createdUserEntity,
        id: "no-photo-user-id",
      } as User;

      userRepository.create?.mockReturnValue(createdUserEntity);
      userRepository.save?.mockResolvedValue(savedUserEntity);

      //? Act
      const result = await service.createFromGoogleProfile(mockProfileNoPhotos);

      //? Assert
      expect(userRepository.create).toHaveBeenCalledTimes(1);
      expect(userRepository.create).toHaveBeenCalledWith(createdUserData);
      expect(userRepository.save).toHaveBeenCalledTimes(1);
      expect(userRepository.save).toHaveBeenCalledWith(createdUserEntity);
      expect(result).toEqual(savedUserEntity);
    });

    it("should propagate errors from userRepository.save", async () => {
      //? Arrange
      const createdUserData = {
        google_id: mockProfileFull.id,
        email: mockProfileFull.emails?.[0].value,
        name: mockProfileFull.displayName,
        avatar_url: mockProfileFull.photos?.[0].value,
      };
      const createdUserEntity = { ...createdUserData } as User;
      const dbError = new Error("Unique constraint violation");

      userRepository.create?.mockReturnValue(createdUserEntity);
      userRepository.save?.mockRejectedValue(dbError);

      //? Act & Assert
      await expect(
        service.createFromGoogleProfile(mockProfileFull)
      ).rejects.toThrow(dbError);

      //? Verify calls
      expect(userRepository.create).toHaveBeenCalledTimes(1);
      expect(userRepository.create).toHaveBeenCalledWith(createdUserData);
      expect(userRepository.save).toHaveBeenCalledTimes(1);
      expect(userRepository.save).toHaveBeenCalledWith(createdUserEntity);
    });

    it("should propagate errors from userRepository.create", async () => {
      const createError = new Error("Create method failed");
      userRepository.create?.mockImplementation(() => {
        throw createError;
      });

      await expect(
        service.createFromGoogleProfile(mockProfileFull)
      ).rejects.toThrow(createError);

      expect(userRepository.create).toHaveBeenCalledTimes(1);
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });

  //* --- Test Suite for findById method ---
  describe("findById", () => {
    it("should return a user when found by id", async () => {
      //? Arrange
      userRepository.findOneBy?.mockResolvedValue(mockUser);

      //? Act
      const result = await service.findById(mockUserId);

      //? Assert
      expect(result).toEqual(mockUser);
      expect(userRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: mockUserId });
    });

    it("should return null when user is not found by id", async () => {
      //? Arrange
      userRepository.findOneBy?.mockResolvedValue(null);
      const nonExistentId = "non-existent-uuid-12345";

      //? Act
      const result = await service.findById(nonExistentId);

      //? Assert
      expect(result).toBeNull();
      expect(userRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneBy).toHaveBeenCalledWith({
        id: nonExistentId,
      });
    });

    it("should propagate errors thrown by the repository (findById)", async () => {
      //? Arrange
      const dbError = new Error("Database lookup error");
      userRepository.findOneBy?.mockRejectedValue(dbError);

      //? Act & Assert
      await expect(service.findById(mockUserId)).rejects.toThrow(dbError);
      expect(userRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: mockUserId });
    });
  });
});
