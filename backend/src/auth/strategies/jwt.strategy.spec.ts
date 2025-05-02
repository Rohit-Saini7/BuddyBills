import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { JwtStrategy } from "./jwt.strategy";

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === "JWT_SECRET") {
      return "test-secret-key";
    }
    return null;
  }),
};

describe("JwtStrategy", () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(strategy).toBeDefined();
  });

  describe("validate", () => {
    it("should return the user payload if validation passes", async () => {
      //? Arrange: Payload containing expected fields
      const mockPayload = {
        sub: "user-id-123",
        userId: "user-id-123",
        email: "test@example.com",
      };
      const expectedResult = {
        userId: mockPayload.sub,
        email: mockPayload.email,
      };

      //? Act
      const result = await strategy.validate(mockPayload);

      //? Assert
      expect(result).toEqual(expectedResult);
    });

    it("should return user payload even if email is missing (as per current logic)", async () => {
      //? Arrange: Payload with required IDs but missing email
      const mockPayload = {
        sub: "user-id-456",
        userId: "user-id-456",
      };
      const expectedResult = {
        userId: mockPayload.sub,
        email: undefined,
      };

      //? Act
      const result = await strategy.validate(mockPayload);

      //? Assert
      expect(result).toEqual(expectedResult);
    });

    it("should throw UnauthorizedException if payload is missing sub", async () => {
      //? Arrange
      const invalidPayload = {
        userId: "user-id-789",
        email: "test@example.com",
      };

      //? Act & Assert
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        "Invalid token payload"
      );
    });

    it("should throw UnauthorizedException if payload is missing userId", async () => {
      //? Arrange
      const invalidPayload = {
        sub: "user-id-789",
        email: "test@example.com",
      };

      //? Act & Assert
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        "Invalid token payload"
      );
    });

    it("should throw UnauthorizedException if payload is completely empty", async () => {
      //? Arrange
      const emptyPayload = {};

      //? Act & Assert
      await expect(strategy.validate(emptyPayload)).rejects.toThrow(
        UnauthorizedException
      );
      await expect(strategy.validate(emptyPayload)).rejects.toThrow(
        "Invalid token payload"
      );
    });
  });
});
