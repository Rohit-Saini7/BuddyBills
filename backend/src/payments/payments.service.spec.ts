import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ObjectLiteral, Repository } from "typeorm";
import { GroupsService } from "../groups/groups.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { Payment } from "./entities/payment.entity";
import { PaymentsService } from "./payments.service";

//* --- Mock Repository Type ---
type MockRepository<T extends ObjectLiteral = any> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

//* --- Factory for Mock Repositories ---
const createMockRepository = <
  T extends ObjectLiteral = any,
>(): MockRepository<T> => ({
  create: jest.fn(),
  save: jest.fn(),
});

//* --- Mock GroupsService ---
const mockGroupsService = {
  findOneById: jest.fn(),
  isMember: jest.fn(),
};

describe("PaymentsService", () => {
  let service: PaymentsService;
  let paymentRepository: MockRepository<Payment>;
  let groupsService: typeof mockGroupsService;

  //* --- Mock Data ---
  const mockGroupId = "group-payments-uuid-1";
  const mockPayerUserId = "user-payer-uuid-1";
  const mockPayeeUserId = "user-payee-uuid-2";
  const fakeCurrentDate = new Date("2025-05-02T10:00:00.000Z");
  const fakeCurrentDateString = "2025-05-02";

  const mockCreatePaymentDtoWithDate: CreatePaymentDto = {
    amount: 50.75,
    paid_to_user_id: mockPayeeUserId,
    payment_date: "2025-04-30",
  };

  const mockCreatePaymentDtoWithoutDate: CreatePaymentDto = {
    amount: 25.0,
    paid_to_user_id: mockPayeeUserId,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getRepositoryToken(Payment),
          useValue: createMockRepository(),
        },
        {
          provide: GroupsService,
          useValue: mockGroupsService,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    paymentRepository = module.get(getRepositoryToken(Payment));
    groupsService = module.get(GroupsService);

    jest.clearAllMocks();

    jest.useFakeTimers();
    jest.setSystemTime(fakeCurrentDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  //* --- createPayment Tests ---
  describe("createPayment", () => {
    it("should create and return a payment when all checks pass (with date)", async () => {
      //? Arrange
      groupsService.findOneById.mockResolvedValue({});
      groupsService.isMember.mockResolvedValue(true);
      const createdPaymentData = {
        group_id: mockGroupId,
        paid_by_user_id: mockPayerUserId,
        paid_to_user_id: mockCreatePaymentDtoWithDate.paid_to_user_id,
        amount: mockCreatePaymentDtoWithDate.amount,
        payment_date: mockCreatePaymentDtoWithDate.payment_date,
      };
      const savedPaymentData = {
        ...createdPaymentData,
        id: "new-payment-id",
        createdAt: fakeCurrentDate,
      };
      paymentRepository.create?.mockReturnValue(createdPaymentData as Payment);
      paymentRepository.save?.mockResolvedValue(savedPaymentData as Payment);

      //? Act
      const result = await service.createPayment(
        mockCreatePaymentDtoWithDate,
        mockGroupId,
        mockPayerUserId
      );

      //? Assert
      expect(groupsService.findOneById).toHaveBeenCalledWith(
        mockGroupId,
        mockPayerUserId
      );
      expect(groupsService.isMember).toHaveBeenCalledWith(
        mockGroupId,
        mockCreatePaymentDtoWithDate.paid_to_user_id
      );
      expect(paymentRepository.create).toHaveBeenCalledWith(createdPaymentData);
      expect(paymentRepository.save).toHaveBeenCalledWith(createdPaymentData);
      expect(result).toEqual(savedPaymentData);
    });

    it("should create and return a payment using current date if payment_date is missing", async () => {
      //? Arrange
      groupsService.findOneById.mockResolvedValue({});
      groupsService.isMember.mockResolvedValue(true);
      const createdPaymentData = {
        group_id: mockGroupId,
        paid_by_user_id: mockPayerUserId,
        paid_to_user_id: mockCreatePaymentDtoWithoutDate.paid_to_user_id,
        amount: mockCreatePaymentDtoWithoutDate.amount,
        payment_date: fakeCurrentDateString,
      };
      const savedPaymentData = {
        ...createdPaymentData,
        id: "new-payment-id-no-date",
        createdAt: fakeCurrentDate,
      };
      paymentRepository.create?.mockReturnValue(createdPaymentData as Payment);
      paymentRepository.save?.mockResolvedValue(savedPaymentData as Payment);

      //? Act
      const result = await service.createPayment(
        mockCreatePaymentDtoWithoutDate,
        mockGroupId,
        mockPayerUserId
      );

      //? Assert
      expect(groupsService.findOneById).toHaveBeenCalledWith(
        mockGroupId,
        mockPayerUserId
      );
      expect(groupsService.isMember).toHaveBeenCalledWith(
        mockGroupId,
        mockCreatePaymentDtoWithoutDate.paid_to_user_id
      );
      expect(paymentRepository.create).toHaveBeenCalledWith(createdPaymentData);
      expect(paymentRepository.save).toHaveBeenCalledWith(createdPaymentData);
      expect(result).toEqual(savedPaymentData);
    });

    it("should throw BadRequestException if payer and payee are the same", async () => {
      //? Arrange
      const dtoSameUser: CreatePaymentDto = {
        ...mockCreatePaymentDtoWithDate,
        paid_to_user_id: mockPayerUserId,
      };

      //? Act & Assert
      await expect(
        service.createPayment(dtoSameUser, mockGroupId, mockPayerUserId)
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createPayment(dtoSameUser, mockGroupId, mockPayerUserId)
      ).rejects.toThrow("Payer and Payee cannot be the same user.");

      //? Verify no service/repo calls made after the initial check
      expect(groupsService.findOneById).not.toHaveBeenCalled();
      expect(groupsService.isMember).not.toHaveBeenCalled();
      expect(paymentRepository.create).not.toHaveBeenCalled();
      expect(paymentRepository.save).not.toHaveBeenCalled();
    });

    it("should throw ForbiddenException if groupsService.findOneById throws error", async () => {
      //? Arrange
      const accessError = new NotFoundException("Group not found");
      groupsService.findOneById.mockRejectedValue(accessError);
      const errorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => { });
      //? Act & Assert
      await expect(
        service.createPayment(
          mockCreatePaymentDtoWithDate,
          mockGroupId,
          mockPayerUserId
        )
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.createPayment(
          mockCreatePaymentDtoWithDate,
          mockGroupId,
          mockPayerUserId
        )
      ).rejects.toThrow(
        "You do not have access to record payments in this group."
      );

      //? Verify subsequent checks/calls not made
      expect(groupsService.findOneById).toHaveBeenCalledTimes(2);
      expect(groupsService.isMember).not.toHaveBeenCalled();
      expect(paymentRepository.create).not.toHaveBeenCalled();
      expect(paymentRepository.save).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it("should throw BadRequestException if payee is not a member", async () => {
      //? Arrange
      groupsService.findOneById.mockResolvedValue({});
      groupsService.isMember.mockResolvedValue(false);

      //? Act & Assert
      await expect(
        service.createPayment(
          mockCreatePaymentDtoWithDate,
          mockGroupId,
          mockPayerUserId
        )
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createPayment(
          mockCreatePaymentDtoWithDate,
          mockGroupId,
          mockPayerUserId
        )
      ).rejects.toThrow("The payee is not a member of this group.");

      //? Verify calls up to isMember check
      expect(groupsService.findOneById).toHaveBeenCalledTimes(2);
      expect(groupsService.isMember).toHaveBeenCalledTimes(2);
      expect(paymentRepository.create).not.toHaveBeenCalled();
      expect(paymentRepository.save).not.toHaveBeenCalled();
    });

    it("should throw InternalServerErrorException if paymentRepository.save fails", async () => {
      //? Arrange
      groupsService.findOneById.mockResolvedValue({});
      groupsService.isMember.mockResolvedValue(true);
      const createdPaymentData = {};
      paymentRepository.create?.mockReturnValue(createdPaymentData as Payment);
      const saveError = new Error("Database Save Error");
      paymentRepository.save?.mockRejectedValue(saveError);
      const errorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => { });
      //? Act & Assert
      await expect(
        service.createPayment(
          mockCreatePaymentDtoWithDate,
          mockGroupId,
          mockPayerUserId
        )
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.createPayment(
          mockCreatePaymentDtoWithDate,
          mockGroupId,
          mockPayerUserId
        )
      ).rejects.toThrow("Could not record payment.");

      //? Verify save was attempted
      expect(groupsService.findOneById).toHaveBeenCalledTimes(2);
      expect(groupsService.isMember).toHaveBeenCalledTimes(2);
      expect(paymentRepository.create).toHaveBeenCalledTimes(2);
      expect(paymentRepository.save).toHaveBeenCalledTimes(2);
      errorSpy.mockRestore();
    });

    it("should propagate error from groupsService.isMember", async () => {
      //? Arrange
      groupsService.findOneById.mockResolvedValue({});
      const memberCheckError = new Error("isMember check failed");
      groupsService.isMember.mockRejectedValue(memberCheckError);

      //? Act & Assert
      await expect(
        service.createPayment(
          mockCreatePaymentDtoWithDate,
          mockGroupId,
          mockPayerUserId
        )
      ).rejects.toThrow(memberCheckError);

      //? Verify calls up to isMember check
      expect(groupsService.findOneById).toHaveBeenCalledTimes(1);
      expect(groupsService.isMember).toHaveBeenCalledTimes(1);
      expect(paymentRepository.create).not.toHaveBeenCalled();
      expect(paymentRepository.save).not.toHaveBeenCalled();
    });
  });
});
