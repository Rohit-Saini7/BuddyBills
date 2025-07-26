import { ConflictException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AuthProvider } from "src/users/dto/auth-provider.enum";
import { UserIdentity } from "src/users/entities/user-identity.entity";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";
import { UsersService } from "./users.service";

describe("UsersService", () => {
  let service: UsersService;
  let userRepo: jest.Mocked<Repository<User>>;
  let identityRepo: jest.Mocked<Repository<UserIdentity>>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser: User = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    avatar_url: "http://avatar.url",
  } as User;

  const mockProfile = {
    provider: AuthProvider.GOOGLE,
    providerId: "google-abc",
    email: "test@example.com",
    name: "Test User",
    avatarUrl: "http://avatar.url",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserIdentity),
          useValue: {
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
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

    service = module.get(UsersService);
    userRepo = module.get(getRepositoryToken(User));
    identityRepo = module.get(getRepositoryToken(UserIdentity));
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  describe("findByProvider", () => {
    it("should return user if identity exists", async () => {
      identityRepo.findOne.mockResolvedValue({ user: mockUser } as any);
      const user = await service.findByProvider(AuthProvider.GOOGLE, "123");
      expect(user).toEqual(mockUser);
    });

    it("should return null if identity not found", async () => {
      identityRepo.findOne.mockResolvedValue(null);
      const user = await service.findByProvider(AuthProvider.GOOGLE, "123");
      expect(user).toBeNull();
    });
  });

  describe("findByEmail", () => {
    it("should return user by email", async () => {
      userRepo.findOneBy.mockResolvedValue(mockUser);
      const user = await service.findByEmail(mockUser.email);
      expect(user).toEqual(mockUser);
    });
  });

  describe("findById", () => {
    it("should return user by ID", async () => {
      userRepo.findOneBy.mockResolvedValue(mockUser);
      const user = await service.findById(mockUser.id);
      expect(user).toEqual(mockUser);
    });
  });

  describe("processProviderLogin", () => {
    it("should return existing user if identity exists", async () => {
      identityRepo.findOne.mockResolvedValue({ user: mockUser } as any);
      const user = await service.processProviderLogin(mockProfile);
      expect(user).toEqual(mockUser);
    });

    it("should throw ConflictException if email exists and provider needs linking", async () => {
      identityRepo.findOne.mockResolvedValue(null);
      userRepo.findOneBy.mockResolvedValue(mockUser);
      identityRepo.find.mockResolvedValue([
        {
          provider: AuthProvider.GITHUB,
          id: "",
          provider_id: "",
          user: new User(),
        },
      ]);
      configService.get.mockReturnValue("mock-secret");
      jwtService.sign.mockReturnValue("mock-token");

      await expect(service.processProviderLogin(mockProfile)).rejects.toThrow(
        ConflictException
      );
    });

    it("should create and return a new user + identity if not found", async () => {
      identityRepo.findOne.mockResolvedValue(null);
      userRepo.findOneBy.mockResolvedValue(null);
      userRepo.create.mockReturnValue(mockUser);
      userRepo.save.mockResolvedValue(mockUser);
      identityRepo.create.mockReturnValue({} as UserIdentity);
      identityRepo.save.mockResolvedValue({} as UserIdentity);

      const user = await service.processProviderLogin(mockProfile);
      expect(user).toEqual(mockUser);
    });
  });

  describe("linkProviderToUser", () => {
    const dto = {
      userId: mockUser.id,
      provider: AuthProvider.GITHUB,
      providerId: "github-123",
    };

    it("should throw if user not found", async () => {
      userRepo.findOneBy.mockResolvedValue(null);
      await expect(service.linkProviderToUser(dto)).rejects.toThrow(
        NotFoundException
      );
    });

    it("should return user if identity already exists", async () => {
      userRepo.findOneBy.mockResolvedValue(mockUser);
      identityRepo.findOneBy.mockResolvedValue({} as UserIdentity);
      const user = await service.linkProviderToUser(dto);
      expect(user).toEqual(mockUser);
    });

    it("should create new identity and return user", async () => {
      userRepo.findOneBy.mockResolvedValue(mockUser);
      identityRepo.findOneBy.mockResolvedValue(null);
      identityRepo.create.mockReturnValue({} as UserIdentity);
      identityRepo.save.mockResolvedValue({} as UserIdentity);

      const user = await service.linkProviderToUser(dto);
      expect(user).toEqual(mockUser);
    });
  });
});
