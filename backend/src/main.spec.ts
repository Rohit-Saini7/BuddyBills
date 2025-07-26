import { ClassSerializerInterceptor, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory, Reflector } from "@nestjs/core";
import { AppModule } from "./app.module";
import { bootstrap } from "./main";

jest.mock("@nestjs/core", () => ({
  ...jest.requireActual("@nestjs/core"),
  NestFactory: {
    create: jest.fn(),
  },
}));

global.console.info = jest.fn();

describe("bootstrap", () => {
  const mockApp = {
    get: jest.fn(),
    setGlobalPrefix: jest.fn(),
    enableCors: jest.fn(),
    useGlobalPipes: jest.fn(),
    useGlobalInterceptors: jest.fn(),
    listen: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (NestFactory.create as jest.Mock).mockResolvedValue(mockApp);
    mockApp.get.mockImplementation((token) => {
      if (token === ConfigService) {
        return mockConfigService;
      }
      if (token === Reflector) {
        return {};
      }
      return null;
    });
  });

  it('should set the global prefix to "api"', async () => {
    await bootstrap();
    expect(mockApp.setGlobalPrefix).toHaveBeenCalledWith("api");
  });

  it("should enable CORS with the frontend URL from config", async () => {
    const frontendUrl = "http://test-frontend.com";
    mockConfigService.get.mockReturnValue(frontendUrl);
    await bootstrap();
    expect(mockApp.enableCors).toHaveBeenCalledWith({ origin: frontendUrl });
  });

  it("should use global pipes with ValidationPipe", async () => {
    await bootstrap();
    expect(mockApp.useGlobalPipes).toHaveBeenCalledWith(
      expect.any(ValidationPipe)
    );
  });

  it("should use global interceptors with ClassSerializerInterceptor", async () => {
    await bootstrap();
    expect(mockApp.useGlobalInterceptors).toHaveBeenCalledWith(
      expect.any(ClassSerializerInterceptor)
    );
    expect(mockApp.get).toHaveBeenCalledWith(Reflector);
  });

  it("should listen on the port from config", async () => {
    const port = 3000;
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === "API_PORT") return port;
      return null;
    });
    await bootstrap();
    expect(mockApp.listen).toHaveBeenCalledWith(port);
  });

  it("should listen on the default port 8000 if API_PORT is not set", async () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === "API_PORT") return undefined;
      return null;
    });
    await bootstrap();
    expect(mockApp.listen).toHaveBeenCalledWith(8000);
  });

  it("should create a Nest application with AppModule", async () => {
    await bootstrap();
    expect(NestFactory.create).toHaveBeenCalledWith(AppModule);
  });
});
