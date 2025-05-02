import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

describe("AppController", () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe("root", () => {
    it("should be defined", () => {
      expect(appController).toBeDefined();
    });

    //* --- Test Suite for the getHealth method ---
    describe("getHealth", () => {
      it('should return status "ok" and a valid ISO timestamp', () => {
        //? Act: Call the method directly
        const result = appController.getHealth();

        //? Assert: Check the properties of the returned object
        expect(result.status).toBe("ok");

        expect(result.time).toBeDefined();
        expect(typeof result.time).toBe("string");

        const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
        expect(result.time).toMatch(iso8601Regex);

        const parsedDate = new Date(result.time);
        expect(parsedDate).toBeInstanceOf(Date);
        expect(isNaN(parsedDate.getTime())).toBe(false);

        const now = new Date();
        const timeDifference = Math.abs(now.getTime() - parsedDate.getTime());
        expect(timeDifference).toBeLessThan(1000);
      });

      it("should return a new timestamp on each call", async () => {
        //? Act
        const result1 = appController.getHealth();
        await new Promise((resolve) => setTimeout(resolve, 10));
        const result2 = appController.getHealth();

        //? Assert
        expect(result1.status).toBe("ok");
        expect(result2.status).toBe("ok");
        expect(result1.time).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
        );
        expect(result2.time).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
        );
        expect(result1.time).not.toEqual(result2.time);
      });
    });
  });
});
