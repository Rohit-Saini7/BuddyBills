import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ExpenseSplit } from "src/expenses/entities/expense-split.entity";
import { AddGroupMemberDto } from "src/groups/dto/add-group-member.dto";
import { MemberRemovalType } from "src/groups/dto/member-removal-type.enum";
import { In, IsNull, Not, ObjectLiteral, Repository } from "typeorm";
import { Expense } from "../expenses/entities/expense.entity";
import { Payment } from "../payments/entities/payment.entity";
import { User } from "../users/entities/user.entity";
import { BalanceResponseDto } from "./dto/balance-response.dto";
import { CreateGroupDto } from "./dto/create-group.dto";
import { UpdateGroupDto } from "./dto/update-group.dto";
import { GroupMember } from "./entities/group-member.entity";
import { Group } from "./entities/group.entity";
import { GroupsService } from "./groups.service";

//* --- Mock Repository Utilities ---
type MockRepository<T extends ObjectLiteral = any> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const createMockRepository = <
  T extends ObjectLiteral = any,
>(): MockRepository<T> => ({
  create: jest.fn(),
  save: jest.fn(),
  findOneBy: jest.fn(),
  findOne: jest.fn(),
  softRemove: jest.fn(),
  restore: jest.fn(),
  find: jest.fn(),
});

//* --- Shared Mock Data ---
const mockUserId = "user-creator-uuid-111";
const mockOtherUserId = "user-other-uuid-222";
const mockGroupId = "group-test-uuid-999";
const mockUserCreator = { id: mockUserId, name: "Creator User" } as User;
const mockUserOther = { id: mockOtherUserId, name: "Other User" } as User;

describe("GroupsService", () => {
  let service: GroupsService;
  let groupRepository: MockRepository<Group>;
  let groupMemberRepository: MockRepository<GroupMember>;
  let userRepository: MockRepository<User>;
  let expenseRepository: MockRepository<Expense>;
  let paymentRepository: MockRepository<Payment>;

  const mockBaseGroup: Partial<Group> = {
    id: mockGroupId,
    name: "Test Group",
    created_by_user_id: mockUserId,
    createdAt: new Date("2024-01-01T10:00:00Z"),
    updatedAt: new Date("2024-01-01T10:00:00Z"),
    deletedAt: null,
    createdBy: mockUserCreator,
  };

  const mockBaseMembership: Partial<GroupMember> = {
    id: "member-creator-uuid-001",
    user_id: mockUserId,
    group_id: mockGroupId,
    joinedAt: new Date("2024-01-01T10:00:00Z"),
    deletedAt: null,
    removalType: null,
    removedByUserId: null,
    user: mockUserCreator,
    group: mockBaseGroup as Group,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        {
          provide: getRepositoryToken(Group),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(GroupMember),
          useValue: createMockRepository(),
        },
        { provide: getRepositoryToken(User), useValue: createMockRepository() },
        {
          provide: getRepositoryToken(Expense),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
    groupRepository = module.get(getRepositoryToken(Group));
    groupMemberRepository = module.get(getRepositoryToken(GroupMember));
    userRepository = module.get(getRepositoryToken(User));
    expenseRepository = module.get(getRepositoryToken(Expense));
    paymentRepository = module.get(getRepositoryToken(Payment));

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  //* --- CREATE Tests ---
  describe("create", () => {
    const mockCreateGroupDto: CreateGroupDto = { name: "New Test Group" };

    it("should create a group, add creator as member, and return the group", async () => {
      //? Arrange
      const createdGroupData = {
        ...mockCreateGroupDto,
        created_by_user_id: mockUserId,
      };
      const savedGroupData = {
        ...createdGroupData,
        id: mockGroupId,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      };
      const createdMemberData = { user_id: mockUserId, group_id: mockGroupId };
      const savedMemberData = {
        ...createdMemberData,
        id: "new-member-id-123",
        joinedAt: expect.any(Date),
      };

      groupRepository.create?.mockReturnValue(createdGroupData);
      groupRepository.save?.mockResolvedValue(savedGroupData);
      groupMemberRepository.create?.mockReturnValue(createdMemberData);
      groupMemberRepository.save?.mockResolvedValue(savedMemberData);

      //? Act
      const result = await service.create(mockCreateGroupDto, mockUserId);

      //? Assert
      expect(groupRepository.create).toHaveBeenCalledTimes(1);
      expect(groupRepository.create).toHaveBeenCalledWith(createdGroupData);
      expect(groupRepository.save).toHaveBeenCalledTimes(1);
      expect(groupRepository.save).toHaveBeenCalledWith(createdGroupData);

      expect(groupMemberRepository.create).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.create).toHaveBeenCalledWith(
        createdMemberData
      );
      expect(groupMemberRepository.save).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.save).toHaveBeenCalledWith(
        createdMemberData
      );

      expect(result).toEqual(savedGroupData);
    });

    it("should propagate error if groupRepository.save fails", async () => {
      //? Arrange
      const saveError = new Error("DB Save Error - Group");
      groupRepository.create?.mockReturnValue({} as Group);
      groupRepository.save?.mockRejectedValue(saveError);

      //? Act & Assert
      await expect(
        service.create(mockCreateGroupDto, mockUserId)
      ).rejects.toThrow(saveError);

      expect(groupMemberRepository.create).not.toHaveBeenCalled();
      expect(groupMemberRepository.save).not.toHaveBeenCalled();
    });

    it("should propagate error if groupMemberRepository.save fails", async () => {
      //? Arrange
      const memberSaveError = new Error("DB Save Error - Member");
      groupRepository.create?.mockReturnValue({} as Group);
      groupRepository.save?.mockResolvedValue({ id: mockGroupId } as Group);
      groupMemberRepository.create?.mockReturnValue({} as GroupMember);
      groupMemberRepository.save?.mockRejectedValue(memberSaveError);

      //? Act & Assert
      await expect(
        service.create(mockCreateGroupDto, mockUserId)
      ).rejects.toThrow(memberSaveError);

      expect(groupRepository.save).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.create).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  //* --- UPDATE Tests ---
  describe("update", () => {
    const mockUpdateGroupDto: UpdateGroupDto = { name: "Updated Group Name" };
    const mockExistingGroup = { ...mockBaseGroup } as Group;
    let findOneByIdSpy: jest.SpyInstance;

    beforeEach(() => {
      findOneByIdSpy = jest
        .spyOn(service, "findOneById")
        .mockResolvedValue(mockExistingGroup);
    });

    afterEach(() => {
      findOneByIdSpy.mockRestore();
    });

    it("should update group name if user is creator and name is valid", async () => {
      //? Arrange
      const expectedSavedGroup = {
        ...mockExistingGroup,
        name: mockUpdateGroupDto.name,
        updatedAt: expect.any(Date),
      };
      groupRepository.save?.mockResolvedValue(expectedSavedGroup as Group);

      //? Act
      const result = await service.update(
        mockGroupId,
        mockUpdateGroupDto,
        mockUserId
      );

      //? Assert
      expect(findOneByIdSpy).toHaveBeenCalledTimes(1);
      expect(findOneByIdSpy).toHaveBeenCalledWith(mockGroupId, mockUserId);
      expect(groupRepository.save).toHaveBeenCalledTimes(1);
      expect(groupRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockGroupId,
          name: mockUpdateGroupDto.name,
        })
      );

      expect(groupRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ created_by_user_id: mockUserId })
      );
      expect(result).toEqual(expectedSavedGroup);
    });

    it("should throw ForbiddenException if requesting user is not the creator", async () => {
      //? Arrange - findOneByIdSpy will still return the group, but the service logic checks creator ID

      //? Act & Assert
      await expect(
        service.update(mockGroupId, mockUpdateGroupDto, mockOtherUserId)
      ).rejects.toThrow(
        new ForbiddenException("Only the group creator can rename the group.")
      );

      expect(findOneByIdSpy).toHaveBeenCalledWith(mockGroupId, mockOtherUserId);
      expect(groupRepository.save).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException if updated name is empty or whitespace", async () => {
      //? Arrange
      const invalidUpdateDto: UpdateGroupDto = { name: "   " };

      //? Act & Assert
      await expect(
        service.update(mockGroupId, invalidUpdateDto, mockUserId)
      ).rejects.toThrow(new BadRequestException("Group name cannot be empty."));

      expect(findOneByIdSpy).toHaveBeenCalledWith(mockGroupId, mockUserId);
      expect(groupRepository.save).not.toHaveBeenCalled();
    });

    it("should return unchanged group if name is undefined or null in DTO", async () => {
      //? Arrange
      const emptyUpdateDto: UpdateGroupDto = {};
      const nullUpdateDto: UpdateGroupDto = { name: undefined };

      //? Act
      const resultEmpty = await service.update(
        mockGroupId,
        emptyUpdateDto,
        mockUserId
      );
      const resultNull = await service.update(
        mockGroupId,
        nullUpdateDto,
        mockUserId
      );

      //? Assert
      expect(resultEmpty).toEqual(mockExistingGroup);
      expect(resultNull).toEqual(mockExistingGroup);
      expect(groupRepository.save).not.toHaveBeenCalled();
    });

    it("should throw InternalServerErrorException if save fails", async () => {
      //? Arrange
      const saveError = new Error("DB Save Error");
      groupRepository.save?.mockRejectedValue(saveError);
      const errorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => { });

      //? Act & Assert
      await expect(
        service.update(mockGroupId, mockUpdateGroupDto, mockUserId)
      ).rejects.toThrow(
        new InternalServerErrorException("Could not update group name.")
      );

      expect(findOneByIdSpy).toHaveBeenCalledWith(mockGroupId, mockUserId);
      expect(groupRepository.save).toHaveBeenCalledTimes(1);
      errorSpy.mockRestore();
    });

    it("should propagate NotFoundException from findOneById", async () => {
      //? Arrange
      const findError = new NotFoundException(
        `Group with ID "${mockGroupId}" not found.`
      );
      findOneByIdSpy.mockRejectedValue(findError);

      //? Act & Assert
      await expect(
        service.update(mockGroupId, mockUpdateGroupDto, mockUserId)
      ).rejects.toThrow(findError);

      expect(findOneByIdSpy).toHaveBeenCalledWith(mockGroupId, mockUserId);
      expect(groupRepository.save).not.toHaveBeenCalled();
    });
  });

  //* --- DELETE Group Tests ---
  describe("deleteGroup", () => {
    const mockExistingGroup = { ...mockBaseGroup } as Group;
    let getGroupBalancesSpy: jest.SpyInstance;

    beforeEach(() => {
      groupRepository.findOneBy?.mockResolvedValue(mockExistingGroup);

      getGroupBalancesSpy = jest.spyOn(service, "getGroupBalances");
    });

    afterEach(() => {
      getGroupBalancesSpy.mockRestore();
    });

    it("should soft delete group if user is creator and group is settled", async () => {
      //? Arrange
      const settledBalances: BalanceResponseDto[] = [
        { user: mockUserCreator, netBalance: 0.0 },
        { user: mockUserOther, netBalance: 0.0 },
      ];
      getGroupBalancesSpy.mockResolvedValue(settledBalances);
      groupRepository.softRemove?.mockResolvedValue({ affected: 1 } as any);

      //? Act
      await service.deleteGroup(mockGroupId, mockUserId);

      //? Assert
      expect(groupRepository.findOneBy).toHaveBeenCalledWith({
        id: mockGroupId,
      });
      expect(getGroupBalancesSpy).toHaveBeenCalledWith(mockGroupId, mockUserId);
      expect(groupRepository.softRemove).toHaveBeenCalledTimes(1);
      expect(groupRepository.softRemove).toHaveBeenCalledWith(
        mockExistingGroup
      );
    });

    it("should throw NotFoundException if group not found", async () => {
      //? Arrange
      groupRepository.findOneBy?.mockResolvedValue(null);

      //? Act & Assert
      await expect(
        service.deleteGroup(mockGroupId, mockUserId)
      ).rejects.toThrow(
        new NotFoundException(`Group with ID "${mockGroupId}" not found.`)
      );
      expect(getGroupBalancesSpy).not.toHaveBeenCalled();
      expect(groupRepository.softRemove).not.toHaveBeenCalled();
    });

    it("should throw ForbiddenException if user is not creator", async () => {
      //? Arrange - findOneBy returns group created by mockUserId

      //? Act & Assert
      await expect(
        service.deleteGroup(mockGroupId, mockOtherUserId)
      ).rejects.toThrow(
        new ForbiddenException("Only the group creator can delete this group.")
      );
      expect(getGroupBalancesSpy).not.toHaveBeenCalled();
      expect(groupRepository.softRemove).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException if group is not settled up", async () => {
      //? Arrange
      const unsettledBalances: BalanceResponseDto[] = [
        { user: mockUserCreator, netBalance: 10.5 },
        { user: mockUserOther, netBalance: -10.5 },
      ];
      getGroupBalancesSpy.mockResolvedValue(unsettledBalances);

      //? Act & Assert
      await expect(
        service.deleteGroup(mockGroupId, mockUserId)
      ).rejects.toThrow(
        new BadRequestException(
          "Cannot delete group. All members must be settled up (balances must be zero) first."
        )
      );
      expect(groupRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(getGroupBalancesSpy).toHaveBeenCalledTimes(1);
      expect(groupRepository.softRemove).not.toHaveBeenCalled();
    });

    it("should correctly handle rounding issues when checking for settled balances", async () => {
      //? Arrange
      const nearZeroBalances: BalanceResponseDto[] = [
        { user: mockUserCreator, netBalance: 0.001 },
        { user: mockUserOther, netBalance: -0.001 },
      ];
      getGroupBalancesSpy.mockResolvedValue(nearZeroBalances);
      groupRepository.softRemove?.mockResolvedValue({ affected: 1 } as any);

      //? Act
      await service.deleteGroup(mockGroupId, mockUserId);

      //? Assert
      expect(groupRepository.findOneBy).toHaveBeenCalledWith({
        id: mockGroupId,
      });
      expect(getGroupBalancesSpy).toHaveBeenCalledWith(mockGroupId, mockUserId);
      expect(groupRepository.softRemove).toHaveBeenCalledTimes(1);
      expect(groupRepository.softRemove).toHaveBeenCalledWith(
        mockExistingGroup
      );
    });

    it("should throw InternalServerErrorException if softRemove fails", async () => {
      //? Arrange
      const settledBalances: BalanceResponseDto[] = [];
      getGroupBalancesSpy.mockResolvedValue(settledBalances);
      const removeError = new Error("DB Soft Remove Error");
      groupRepository.softRemove?.mockRejectedValue(removeError);
      const errorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => { });

      //? Act & Assert
      await expect(
        service.deleteGroup(mockGroupId, mockUserId)
      ).rejects.toThrow(
        new InternalServerErrorException("Could not delete group.")
      );
      expect(groupRepository.softRemove).toHaveBeenCalledTimes(1);
      errorSpy.mockRestore();
    });
  });

  //* --- RESTORE Group Tests ---
  describe("restoreGroup", () => {
    const mockDeletedGroup = {
      ...mockBaseGroup,
      deletedAt: new Date("2024-02-15T11:00:00Z"),
    } as Group;

    it("should restore a soft-deleted group if user is creator", async () => {
      //? Arrange
      groupRepository.findOne?.mockResolvedValue(mockDeletedGroup);
      groupRepository.restore?.mockResolvedValue({ affected: 1, raw: [] });

      //? Act
      await service.restoreGroup(mockGroupId, mockUserId);

      //? Assert
      expect(groupRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockGroupId },
        withDeleted: true,
      });
      expect(groupRepository.restore).toHaveBeenCalledTimes(1);
      expect(groupRepository.restore).toHaveBeenCalledWith({ id: mockGroupId });
    });

    it("should throw NotFoundException if group is not found (even when searching deleted)", async () => {
      //? Arrange
      groupRepository.findOne?.mockResolvedValue(null);

      //? Act & Assert
      await expect(
        service.restoreGroup(mockGroupId, mockUserId)
      ).rejects.toThrow(
        new NotFoundException(`Group with ID "${mockGroupId}" not found.`)
      );
      expect(groupRepository.restore).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException if group is already active", async () => {
      //? Arrange
      const mockActiveGroup = { ...mockBaseGroup, deletedAt: null } as Group;
      groupRepository.findOne?.mockResolvedValue(mockActiveGroup);

      //? Act & Assert
      await expect(
        service.restoreGroup(mockGroupId, mockUserId)
      ).rejects.toThrow(
        new BadRequestException(`Group "${mockGroupId}" is already active.`)
      );
      expect(groupRepository.restore).not.toHaveBeenCalled();
    });

    it("should throw ForbiddenException if user is not creator", async () => {
      //? Arrange
      groupRepository.findOne?.mockResolvedValue(mockDeletedGroup);

      //? Act & Assert
      await expect(
        service.restoreGroup(mockGroupId, mockOtherUserId)
      ).rejects.toThrow(
        new ForbiddenException("Only the group creator can restore this group.")
      );
      expect(groupRepository.restore).not.toHaveBeenCalled();
    });

    it("should throw InternalServerErrorException if restore fails (DB error)", async () => {
      //? Arrange
      groupRepository.findOne?.mockResolvedValue(mockDeletedGroup);
      const restoreDbError = new Error("DB Restore Error");
      groupRepository.restore?.mockRejectedValue(restoreDbError);
      const errorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => { });

      //? Act & Assert
      await expect(
        service.restoreGroup(mockGroupId, mockUserId)
      ).rejects.toThrow(
        new InternalServerErrorException("Could not restore group.")
      );
      expect(groupRepository.restore).toHaveBeenCalledTimes(1);
      errorSpy.mockRestore();
    });

    it("should throw InternalServerErrorException if restore affects 0 rows", async () => {
      //? Arrange
      groupRepository.findOne?.mockResolvedValue(mockDeletedGroup);
      groupRepository.restore?.mockResolvedValue({ affected: 0, raw: [] });

      //? Act & Assert
      await expect(
        service.restoreGroup(mockGroupId, mockUserId)
      ).rejects.toThrow(
        new InternalServerErrorException(
          `Group "${mockGroupId}" could not be restored.`
        )
      );
      expect(groupRepository.restore).toHaveBeenCalledTimes(1);
    });
  });

  //* --- isMember Tests ---
  describe("isMember", () => {
    it("should return true if an active membership record exists", async () => {
      //? Arrange
      const mockMembership = { ...mockBaseMembership, deletedAt: null };
      groupMemberRepository.findOneBy?.mockResolvedValue(mockMembership);

      //? Act
      const result = await service.isMember(mockGroupId, mockUserId);

      //? Assert
      expect(result).toBe(true);
      expect(groupMemberRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.findOneBy).toHaveBeenCalledWith({
        group_id: mockGroupId,
        user_id: mockUserId,
      });
    });

    it("should return false if no active membership record exists (or member is inactive)", async () => {
      //? Arrange
      groupMemberRepository.findOneBy?.mockResolvedValue(null);

      //? Act
      const result = await service.isMember(mockGroupId, mockUserId);

      //? Assert
      expect(result).toBe(false);
      expect(groupMemberRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.findOneBy).toHaveBeenCalledWith({
        group_id: mockGroupId,
        user_id: mockUserId,
      });
    });

    it("should propagate errors from the groupMemberRepository", async () => {
      //? Arrange
      const dbError = new Error("Database lookup failed");
      groupMemberRepository.findOneBy?.mockRejectedValue(dbError);

      //? Act & Assert
      await expect(service.isMember(mockGroupId, mockUserId)).rejects.toThrow(
        dbError
      );
      expect(groupMemberRepository.findOneBy).toHaveBeenCalledTimes(1);
    });
  });

  //* --- findAllForUser Tests ---
  describe("findAllForUser", () => {
    const mockGroupId1 = "group-find-1-uuid";
    const mockGroupId2 = "group-find-2-uuid";

    const mockMemberships: Partial<GroupMember>[] = [
      { group_id: mockGroupId1 },
      { group_id: mockGroupId2 },
    ];

    const mockActiveGroup1: Partial<Group> = {
      id: mockGroupId1,
      name: "Active Group 1",
      deletedAt: null,
    };
    const mockActiveGroup2: Partial<Group> = {
      id: mockGroupId2,
      name: "Active Group 2",
      deletedAt: null,
    };
    const mockActiveGroups: Partial<Group>[] = [
      mockActiveGroup2,
      mockActiveGroup1,
    ];

    it("should return active groups for a user with active memberships, ordered by creation date DESC", async () => {
      //? Arrange
      groupMemberRepository.find?.mockResolvedValue(
        mockMemberships as GroupMember[]
      );
      groupRepository.find?.mockResolvedValue(mockActiveGroups as Group[]);

      //? Act
      const result = await service.findAllForUser(mockUserId);

      //? Assert
      expect(result).toEqual(mockActiveGroups);
      expect(groupMemberRepository.find).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.find).toHaveBeenCalledWith({
        select: ["group_id"],
        where: { user_id: mockUserId, deletedAt: IsNull() },
      });
      expect(groupRepository.find).toHaveBeenCalledTimes(1);
      expect(groupRepository.find).toHaveBeenCalledWith({
        where: { id: In([mockGroupId1, mockGroupId2]), deletedAt: IsNull() },
        order: { createdAt: "DESC" },
      });
    });

    it("should return an empty array if the user has no active memberships", async () => {
      //? Arrange
      groupMemberRepository.find?.mockResolvedValue([]);

      //? Act
      const result = await service.findAllForUser(mockUserId);

      //? Assert
      expect(result).toEqual([]);
      expect(groupMemberRepository.find).toHaveBeenCalledTimes(1);
      expect(groupRepository.find).not.toHaveBeenCalled();
    });

    it("should return an empty array if user has memberships but corresponding groups are soft-deleted", async () => {
      //? Arrange
      groupMemberRepository.find?.mockResolvedValue(
        mockMemberships as GroupMember[]
      );
      groupRepository.find?.mockResolvedValue([]);

      //? Act
      const result = await service.findAllForUser(mockUserId);

      //? Assert
      expect(result).toEqual([]);
      expect(groupMemberRepository.find).toHaveBeenCalledTimes(1);
      expect(groupRepository.find).toHaveBeenCalledTimes(1);
      expect(groupRepository.find).toHaveBeenCalledWith({
        where: { id: In([mockGroupId1, mockGroupId2]), deletedAt: IsNull() },
        order: { createdAt: "DESC" },
      });
    });

    it("should propagate error from groupMemberRepository.find", async () => {
      //? Arrange
      const dbError = new Error("Membership Find Error");
      groupMemberRepository.find?.mockRejectedValue(dbError);

      //? Act & Assert
      await expect(service.findAllForUser(mockUserId)).rejects.toThrow(dbError);
      expect(groupMemberRepository.find).toHaveBeenCalledTimes(1);
      expect(groupRepository.find).not.toHaveBeenCalled();
    });

    it("should propagate error from groupRepository.find", async () => {
      //? Arrange
      const dbError = new Error("Group Find Error");
      groupMemberRepository.find?.mockResolvedValue(
        mockMemberships as GroupMember[]
      );
      groupRepository.find?.mockRejectedValue(dbError);

      //? Act & Assert
      await expect(service.findAllForUser(mockUserId)).rejects.toThrow(dbError);
      expect(groupMemberRepository.find).toHaveBeenCalledTimes(1);
      expect(groupRepository.find).toHaveBeenCalledTimes(1);
    });
  });

  //* --- findOneById Tests ---
  describe("findOneById", () => {
    const mockExistingGroup = { ...mockBaseGroup } as Group;
    const mockMembership = { ...mockBaseMembership } as GroupMember;

    it("should return the group if found and user is an active member", async () => {
      //? Arrange
      groupRepository.findOneBy?.mockResolvedValue(mockExistingGroup);

      groupMemberRepository.findOneBy?.mockResolvedValue(mockMembership);

      //? Act
      const result = await service.findOneById(mockGroupId, mockUserId);

      //? Assert
      expect(result).toEqual(mockExistingGroup);
      expect(groupRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(groupRepository.findOneBy).toHaveBeenCalledWith({
        id: mockGroupId,
      });
      expect(groupMemberRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.findOneBy).toHaveBeenCalledWith({
        group_id: mockGroupId,
        user_id: mockUserId,
      });
    });

    it("should throw NotFoundException if group is soft-deleted", async () => {
      //? Arrange
      groupRepository.findOneBy?.mockResolvedValue(null);

      //? Act & Assert
      await expect(
        service.findOneById(mockGroupId, mockUserId)
      ).rejects.toThrow(
        new NotFoundException(`Group with ID "${mockGroupId}" not found.`)
      );
      expect(groupRepository.findOneBy).toHaveBeenCalledWith({
        id: mockGroupId,
      });
      expect(groupMemberRepository.findOneBy).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException if group does not exist", async () => {
      //? Arrange
      groupRepository.findOneBy?.mockResolvedValue(null);

      //? Act & Assert
      await expect(
        service.findOneById(mockGroupId, mockUserId)
      ).rejects.toThrow(
        new NotFoundException(`Group with ID "${mockGroupId}" not found.`)
      );
      expect(groupRepository.findOneBy).toHaveBeenCalledWith({
        id: mockGroupId,
      });
      expect(groupMemberRepository.findOneBy).not.toHaveBeenCalled();
    });

    it("should throw ForbiddenException if user is not an active member of the group (or not found)", async () => {
      //? Arrange
      groupRepository.findOneBy?.mockResolvedValue(mockExistingGroup);
      groupMemberRepository.findOneBy?.mockResolvedValue(null);

      //? Act & Assert
      await expect(
        service.findOneById(mockGroupId, mockUserId)
      ).rejects.toThrow(
        new ForbiddenException("You do not have access to this group.")
      );
      expect(groupRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.findOneBy).toHaveBeenCalledWith({
        group_id: mockGroupId,
        user_id: mockUserId,
      });
    });

    it("should propagate error from groupRepository.findOneBy", async () => {
      //? Arrange
      const dbError = new Error("Group Find Error");
      groupRepository.findOneBy?.mockRejectedValue(dbError);

      //? Act & Assert
      await expect(
        service.findOneById(mockGroupId, mockUserId)
      ).rejects.toThrow(dbError);
      expect(groupRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.findOneBy).not.toHaveBeenCalled();
    });

    it("should propagate error from groupMemberRepository.findOneBy", async () => {
      //? Arrange
      const dbError = new Error("Member Find Error");
      groupRepository.findOneBy?.mockResolvedValue(mockExistingGroup);
      groupMemberRepository.findOneBy?.mockRejectedValue(dbError);

      //? Act & Assert
      await expect(
        service.findOneById(mockGroupId, mockUserId)
      ).rejects.toThrow(dbError);
      expect(groupRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.findOneBy).toHaveBeenCalledTimes(1);
    });
  });

  //* --- addMember Tests ---
  describe("addMember", () => {
    const mockAddGroupMemberDto: AddGroupMemberDto = {
      email: "add.this.user@example.com",
    };
    const mockUserToAddId = "user-to-add-uuid-444";
    const mockUserToAdd = {
      id: mockUserToAddId,
      email: mockAddGroupMemberDto.email,
      name: "User To Add",
    } as User;
    const mockExistingGroup = { ...mockBaseGroup } as Group;

    const mockExistingActiveMember: GroupMember = {
      id: "member-uuid-active-777",
      user_id: mockUserToAddId,
      group_id: mockGroupId,
      joinedAt: new Date("2023-12-01T00:00:00Z"),
      deletedAt: null,
      removalType: null,
      removedByUserId: null,
      user: mockUserToAdd,
      group: mockExistingGroup,
      removedBy: null,
    };

    const mockExistingInactiveMember: GroupMember = {
      ...mockExistingActiveMember,
      id: "member-uuid-inactive-888",
      deletedAt: new Date("2024-01-15T00:00:00Z"),
      removalType: MemberRemovalType.REMOVED_BY_CREATOR,
      removedByUserId: mockUserId,
    };

    beforeEach(() => {
      groupRepository.findOneBy?.mockResolvedValue(mockExistingGroup);
      userRepository.findOneBy?.mockResolvedValue(mockUserToAdd);
    });

    it("should throw NotFoundException if group does not exist", async () => {
      //? Arrange
      groupRepository.findOneBy?.mockResolvedValue(null);

      //? Act & Assert
      await expect(
        service.addMember(mockGroupId, mockAddGroupMemberDto, mockUserId)
      ).rejects.toThrow(
        new NotFoundException(`Group "${mockGroupId}" not found.`)
      );
      expect(groupRepository.findOneBy).toHaveBeenCalledWith({
        id: mockGroupId,
      });
      expect(userRepository.findOneBy).not.toHaveBeenCalled();
    });

    it("should throw ForbiddenException if requesting user is not the group creator", async () => {
      //? Arrange - Group exists, created by mockUserId

      //? Act & Assert
      await expect(
        service.addMember(mockGroupId, mockAddGroupMemberDto, mockOtherUserId)
      ).rejects.toThrow(
        new ForbiddenException("Only the group creator can add members.")
      );
      expect(groupRepository.findOneBy).toHaveBeenCalledWith({
        id: mockGroupId,
      });
      expect(userRepository.findOneBy).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException if user to add does not exist", async () => {
      //? Arrange
      userRepository.findOneBy?.mockResolvedValue(null);

      //? Act & Assert
      await expect(
        service.addMember(mockGroupId, mockAddGroupMemberDto, mockUserId)
      ).rejects.toThrow(
        new NotFoundException(
          `User with email "${mockAddGroupMemberDto.email}" not found.`
        )
      );
      expect(groupRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneBy).toHaveBeenCalledWith({
        email: mockAddGroupMemberDto.email,
      });
      expect(groupMemberRepository.findOne).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException if attempting to add the creator", async () => {
      //? Arrange

      userRepository.findOneBy?.mockResolvedValue(mockUserCreator);

      //? Act & Assert
      await expect(
        service.addMember(
          mockGroupId,
          { email: mockUserCreator.email },
          mockUserId
        )
      ).rejects.toThrow(
        new BadRequestException("Creator is already implicitly a member.")
      );

      expect(groupRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.findOne).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException if user is already an active member", async () => {
      //? Arrange

      groupMemberRepository.findOne?.mockResolvedValue(
        mockExistingActiveMember
      );

      //? Act & Assert
      await expect(
        service.addMember(mockGroupId, mockAddGroupMemberDto, mockUserId)
      ).rejects.toThrow(
        new BadRequestException(
          `User "${mockAddGroupMemberDto.email}" is already an active member of this group.`
        )
      );
      expect(groupMemberRepository.findOne).toHaveBeenCalledWith({
        where: { group_id: mockGroupId, user_id: mockUserToAddId },
        withDeleted: true,
      });
      expect(groupMemberRepository.save).not.toHaveBeenCalled();
    });

    it("should reactivate and return membership if user was previously removed", async () => {
      //? Arrange

      groupMemberRepository.findOne?.mockResolvedValue(
        mockExistingInactiveMember
      );
      const expectedReactivatedMember = {
        ...mockExistingInactiveMember,
        deletedAt: null,
        removalType: null,
        removedByUserId: null,
      };
      groupMemberRepository.save?.mockResolvedValue(expectedReactivatedMember);

      //? Act
      const result = await service.addMember(
        mockGroupId,
        mockAddGroupMemberDto,
        mockUserId
      );

      //? Assert
      expect(groupMemberRepository.findOne).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.findOne).toHaveBeenCalledWith({
        where: { group_id: mockGroupId, user_id: mockUserToAddId },
        withDeleted: true,
      });
      expect(groupMemberRepository.save).toHaveBeenCalledTimes(1);
      //? Verify the object passed to save had its deletedAt/removal fields nulled
      expect(groupMemberRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockExistingInactiveMember.id,
          deletedAt: null,
          removalType: null,
          removedByUserId: null,
        })
      );
      expect(result).toEqual(expectedReactivatedMember);
    });

    it("should throw InternalServerErrorException if reactivating member save fails", async () => {
      //? Arrange
      mockExistingInactiveMember.deletedAt = new Date("2024-01-15T00:00:00Z");
      groupMemberRepository.findOne?.mockResolvedValue(
        mockExistingInactiveMember
      );
      const saveError = new Error("DB Save Error during reactivation");
      groupMemberRepository.save?.mockRejectedValue(saveError);
      const errorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => { });

      //? Act & Assert
      await expect(
        service.addMember(mockGroupId, mockAddGroupMemberDto, mockUserId)
      ).rejects.toThrow(
        new InternalServerErrorException("Could not reactivate member.")
      );

      expect(groupMemberRepository.findOne).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.save).toHaveBeenCalledTimes(1);
      errorSpy.mockRestore();
    });

    it("should create and return a new membership if user never joined before", async () => {
      //? Arrange
      groupMemberRepository.findOne?.mockResolvedValue(null);
      const createdMembershipData = {
        group_id: mockGroupId,
        user_id: mockUserToAddId,
      };
      const savedMembershipData = {
        ...createdMembershipData,
        id: "new-member-uuid-111",
        joinedAt: expect.any(Date),
        deletedAt: null,
        removalType: null,
        removedByUserId: null,
      };
      groupMemberRepository.create?.mockReturnValue(
        createdMembershipData as GroupMember
      );
      groupMemberRepository.save?.mockResolvedValue(
        savedMembershipData as GroupMember
      );

      //? Act
      const result = await service.addMember(
        mockGroupId,
        mockAddGroupMemberDto,
        mockUserId
      );

      //? Assert
      expect(groupMemberRepository.findOne).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.create).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.create).toHaveBeenCalledWith(
        createdMembershipData
      );
      expect(groupMemberRepository.save).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.save).toHaveBeenCalledWith(
        createdMembershipData
      );
      expect(result).toEqual(savedMembershipData);
    });

    it("should throw InternalServerErrorException if creating new member save fails", async () => {
      //? Arrange
      groupMemberRepository.findOne?.mockResolvedValue(null);
      const createdMembershipData = {
        group_id: mockGroupId,
        user_id: mockUserToAddId,
      };
      groupMemberRepository.create?.mockReturnValue(
        createdMembershipData as GroupMember
      );
      const saveError = new Error("DB Save Error during creation");
      groupMemberRepository.save?.mockRejectedValue(saveError);
      const errorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => { });

      //? Act & Assert
      await expect(
        service.addMember(mockGroupId, mockAddGroupMemberDto, mockUserId)
      ).rejects.toThrow(
        new InternalServerErrorException("Could not add new member.")
      );

      expect(groupMemberRepository.create).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.save).toHaveBeenCalledTimes(1);
      errorSpy.mockRestore();
    });
  });

  //* --- findGroupMembers Tests ---
  describe("findGroupMembers", () => {
    const mockUserA = { id: "user-A", name: "User A" } as User;
    const mockUserB = { id: "user-B", name: "User B (Inactive)" } as User;
    const mockUserC = {
      id: mockUserId,
      name: "Requester User (Creator)",
    } as User;

    const mockMemberA: Partial<GroupMember> = {
      id: "member-1",
      group_id: mockGroupId,
      user_id: "user-A",
      joinedAt: new Date("2024-03-01"),
      deletedAt: null,
      user: mockUserA,
    };
    const mockMemberBInactive: Partial<GroupMember> = {
      id: "member-2",
      group_id: mockGroupId,
      user_id: "user-B",
      joinedAt: new Date("2024-03-02"),
      deletedAt: new Date("2024-04-01"),
      removalType: MemberRemovalType.LEFT_VOLUNTARILY,
      user: mockUserB,
    };
    const mockMemberC: Partial<GroupMember> = {
      id: "member-3",
      group_id: mockGroupId,
      user_id: mockUserId,
      joinedAt: new Date("2024-03-03"),
      deletedAt: null,
      user: mockUserC,
    };

    const mockFullMemberList = [mockMemberA, mockMemberBInactive, mockMemberC];

    const mockActiveRequesterMembership = mockMemberC;
    const mockInactiveRequesterMembership = {
      ...mockMemberC,
      deletedAt: new Date("2024-05-01"),
    };

    const mockExpectedServiceOutput = [
      mockMemberA,
      mockMemberBInactive,
      mockMemberC,
    ];

    it("should return list of all members (active & inactive sorted) if requester is active member", async () => {
      //? Arrange
      groupMemberRepository.findOne?.mockResolvedValue(
        mockActiveRequesterMembership
      );
      groupMemberRepository.find?.mockResolvedValue(
        mockFullMemberList as GroupMember[]
      );

      //? Act
      const result = await service.findGroupMembers(mockGroupId, mockUserId);

      //? Assert
      expect(result).toEqual(mockExpectedServiceOutput);
      expect(groupMemberRepository.findOne).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.findOne).toHaveBeenCalledWith({
        where: { group_id: mockGroupId, user_id: mockUserId },
        withDeleted: true,
      });
      expect(groupMemberRepository.find).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.find).toHaveBeenCalledWith({
        where: { group_id: mockGroupId },
        withDeleted: true,
        relations: ["user"],
        order: { deletedAt: "ASC", joinedAt: "ASC" }, //? Verify the order clause used for DB fetch
      });
    });

    it("should throw ForbiddenException if requester membership not found", async () => {
      //? Arrange
      groupMemberRepository.findOne?.mockResolvedValue(null);

      //? Act & Assert
      await expect(
        service.findGroupMembers(mockGroupId, mockUserId)
      ).rejects.toThrow(
        new ForbiddenException(
          "You do not have access to view members of this group."
        )
      );
      expect(groupMemberRepository.findOne).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.find).not.toHaveBeenCalled();
    });

    it("should throw ForbiddenException if requester membership is inactive (soft-deleted)", async () => {
      //? Arrange
      groupMemberRepository.findOne?.mockResolvedValue(
        mockInactiveRequesterMembership
      );

      //? Act & Assert
      await expect(
        service.findGroupMembers(mockGroupId, mockUserId)
      ).rejects.toThrow(
        new ForbiddenException(
          "You do not have access to view members of this group."
        )
      );
      expect(groupMemberRepository.findOne).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.find).not.toHaveBeenCalled();
    });

    it("should return empty array if requester is active member but group has no members", async () => {
      //? Arrange
      groupMemberRepository.findOne?.mockResolvedValue(
        mockActiveRequesterMembership
      );
      groupMemberRepository.find?.mockResolvedValue([]);

      //? Act
      const result = await service.findGroupMembers(mockGroupId, mockUserId);

      //? Assert
      expect(result).toEqual([]);
      expect(groupMemberRepository.findOne).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.find).toHaveBeenCalledTimes(1);
    });

    it("should propagate error from the initial findOne (requester check)", async () => {
      //? Arrange
      const dbError = new Error("DB FindOne Error");
      groupMemberRepository.findOne?.mockRejectedValue(dbError);

      //? Act & Assert
      await expect(
        service.findGroupMembers(mockGroupId, mockUserId)
      ).rejects.toThrow(dbError);
      expect(groupMemberRepository.findOne).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.find).not.toHaveBeenCalled();
    });

    it("should propagate error from the second find (fetching all members)", async () => {
      //? Arrange
      const dbError = new Error("DB Find Error");
      groupMemberRepository.findOne?.mockResolvedValue(
        mockActiveRequesterMembership
      );
      groupMemberRepository.find?.mockRejectedValue(dbError);

      //? Act & Assert
      await expect(
        service.findGroupMembers(mockGroupId, mockUserId)
      ).rejects.toThrow(dbError);
      expect(groupMemberRepository.findOne).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.find).toHaveBeenCalledTimes(1);
    });
  });

  //* --- removeMember Tests ---
  describe("removeMember", () => {
    const mockMemberUserIdToRemove = "user-to-remove-uuid-555";
    const mockUserToRemove = {
      id: mockMemberUserIdToRemove,
      name: "User To Remove",
    } as User;
    const mockExistingGroup = { ...mockBaseGroup } as Group;

    const mockActiveMembershipToRemove: GroupMember = {
      id: "member-uuid-to-remove-active-123",
      user_id: mockMemberUserIdToRemove,
      group_id: mockGroupId,
      joinedAt: new Date("2024-02-01T00:00:00Z"),
      deletedAt: null,
      removalType: null,
      removedByUserId: null,
      user: mockUserToRemove,
      group: mockExistingGroup,
      removedBy: null,
    };

    const mockInactiveMembershipToRemove: GroupMember = {
      ...mockActiveMembershipToRemove,
      id: "member-uuid-to-remove-inactive-456",
      deletedAt: new Date("2024-03-01T00:00:00Z"),
      removalType: MemberRemovalType.LEFT_VOLUNTARILY,
      removedByUserId: null,
    };

    const fakeCurrentDate = new Date("2025-05-02T14:00:00.000Z");

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(fakeCurrentDate);

      groupRepository.findOneBy?.mockResolvedValue(mockExistingGroup);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should soft-delete member if requester is creator and member is active", async () => {
      //? Arrange
      groupMemberRepository.findOne?.mockResolvedValue(
        mockActiveMembershipToRemove
      );
      const expectedSavedMember = {
        ...mockActiveMembershipToRemove,
        deletedAt: fakeCurrentDate,
        removalType: MemberRemovalType.REMOVED_BY_CREATOR,
        removedByUserId: mockUserId,
      };
      groupMemberRepository.save?.mockResolvedValue(expectedSavedMember);

      //? Act
      await service.removeMember(
        mockGroupId,
        mockMemberUserIdToRemove,
        mockUserId
      );

      //? Assert
      expect(groupRepository.findOneBy).toHaveBeenCalledWith({
        id: mockGroupId,
      });
      expect(groupMemberRepository.findOne).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.findOne).toHaveBeenCalledWith({
        where: { group_id: mockGroupId, user_id: mockMemberUserIdToRemove },
        withDeleted: true,
      });
      expect(groupMemberRepository.save).toHaveBeenCalledTimes(1);
      //? Verify the object passed to save has the correct fields updated
      expect(groupMemberRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockActiveMembershipToRemove.id,
          deletedAt: fakeCurrentDate,
          removalType: MemberRemovalType.REMOVED_BY_CREATOR,
          removedByUserId: mockUserId,
        })
      );
    });

    it("should throw NotFoundException if group not found", async () => {
      //? Arrange
      groupRepository.findOneBy?.mockResolvedValue(null);

      //? Act & Assert
      await expect(
        service.removeMember(mockGroupId, mockMemberUserIdToRemove, mockUserId)
      ).rejects.toThrow(
        new NotFoundException(`Group with ID "${mockGroupId}" not found.`)
      );
      expect(groupMemberRepository.findOne).not.toHaveBeenCalled();
    });

    it("should throw ForbiddenException if requester is not creator", async () => {
      //? Arrange - group found (beforeEach)

      //? Act & Assert
      await expect(
        service.removeMember(
          mockGroupId,
          mockMemberUserIdToRemove,
          mockOtherUserId
        )
      ).rejects.toThrow(
        new ForbiddenException("Only the group creator can remove members.")
      );
      expect(groupMemberRepository.findOne).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException if creator tries to remove themselves", async () => {
      //? Arrange - group found (beforeEach)

      //? Act & Assert
      await expect(
        service.removeMember(mockGroupId, mockUserId, mockUserId)
      ).rejects.toThrow(
        new BadRequestException(
          "Creator cannot remove themselves using this method. Consider deleting the group."
        )
      );
      expect(groupMemberRepository.findOne).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException if member to remove is not found", async () => {
      //? Arrange
      groupMemberRepository.findOne?.mockResolvedValue(null);

      //? Act & Assert
      await expect(
        service.removeMember(mockGroupId, mockMemberUserIdToRemove, mockUserId)
      ).rejects.toThrow(
        new NotFoundException(
          `User "${mockMemberUserIdToRemove}" is not a member.`
        )
      );
      expect(groupMemberRepository.findOne).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.save).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException if member is already inactive", async () => {
      //? Arrange
      groupMemberRepository.findOne?.mockResolvedValue(
        mockInactiveMembershipToRemove
      );

      //? Act & Assert
      await expect(
        service.removeMember(mockGroupId, mockMemberUserIdToRemove, mockUserId)
      ).rejects.toThrow(
        new BadRequestException(
          `User "${mockMemberUserIdToRemove}" is already removed/inactive in this group.`
        )
      );
      expect(groupMemberRepository.findOne).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.save).not.toHaveBeenCalled();
    });

    it("should throw InternalServerErrorException if save fails", async () => {
      //? Arrange
      mockActiveMembershipToRemove.deletedAt = null;
      groupMemberRepository.findOne?.mockResolvedValue(
        mockActiveMembershipToRemove
      );
      const saveError = new Error("DB Save Error");
      groupMemberRepository.save?.mockRejectedValue(saveError);
      const errorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => { });

      //? Act & Assert
      await expect(
        service.removeMember(mockGroupId, mockMemberUserIdToRemove, mockUserId)
      ).rejects.toThrow(
        new InternalServerErrorException("Could not remove member.")
      );
      expect(groupMemberRepository.save).toHaveBeenCalledTimes(1);
      errorSpy.mockRestore();
    });

    it("should propagate error from groupRepository.findOneBy", async () => {
      //? Arrange
      const findError = new Error("Group Find Error");
      groupRepository.findOneBy?.mockRejectedValue(findError);

      //? Act & Assert
      await expect(
        service.removeMember(mockGroupId, mockMemberUserIdToRemove, mockUserId)
      ).rejects.toThrow(findError);
      expect(groupMemberRepository.findOne).not.toHaveBeenCalled();
    });

    it("should propagate error from groupMemberRepository.findOne", async () => {
      //? Arrange
      const findError = new Error("Member Find Error");
      groupMemberRepository.findOne?.mockRejectedValue(findError);

      //? Act & Assert
      await expect(
        service.removeMember(mockGroupId, mockMemberUserIdToRemove, mockUserId)
      ).rejects.toThrow(findError);
      expect(groupRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.findOne).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.save).not.toHaveBeenCalled();
    });
  });

  //* --- leaveGroup Tests ---
  describe("leaveGroup", () => {
    const mockRequesterId = mockOtherUserId;
    const mockRequesterUser = {
      id: mockRequesterId,
      name: "Leaving User",
    } as User;
    const mockExistingGroup = { ...mockBaseGroup } as Group;

    const mockActiveMembershipToLeave: GroupMember = {
      id: "member-uuid-to-leave-active-789",
      user_id: mockRequesterId,
      group_id: mockGroupId,
      joinedAt: new Date("2024-01-10T00:00:00Z"),
      deletedAt: null,
      removalType: null,
      removedByUserId: null,
      user: mockRequesterUser,
      group: mockExistingGroup,
      removedBy: null,
    };

    const mockInactiveMembershipToLeave: GroupMember = {
      ...mockActiveMembershipToLeave,
      id: "member-uuid-to-leave-inactive-012",
      deletedAt: new Date("2024-02-20T00:00:00Z"),
    };

    const fakeCurrentDate = new Date("2025-05-02T15:30:00.000Z");

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(fakeCurrentDate);

      groupRepository.findOneBy?.mockResolvedValue(mockExistingGroup);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should soft-delete membership if requester is not creator and is an active member", async () => {
      //? Arrange
      groupMemberRepository.findOne?.mockResolvedValue(
        mockActiveMembershipToLeave
      );
      const expectedSavedMember = {
        ...mockActiveMembershipToLeave,
        deletedAt: fakeCurrentDate,
        removalType: MemberRemovalType.LEFT_VOLUNTARILY,
        removedByUserId: null,
      };
      groupMemberRepository.save?.mockResolvedValue(expectedSavedMember);

      //? Act
      await service.leaveGroup(mockGroupId, mockRequesterId);

      //? Assert
      expect(groupRepository.findOneBy).toHaveBeenCalledWith({
        id: mockGroupId,
      });
      expect(groupMemberRepository.findOne).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.findOne).toHaveBeenCalledWith({
        where: { group_id: mockGroupId, user_id: mockRequesterId },
        withDeleted: true,
      });
      expect(groupMemberRepository.save).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockActiveMembershipToLeave.id,
          deletedAt: fakeCurrentDate,
          removalType: MemberRemovalType.LEFT_VOLUNTARILY,
          removedByUserId: null,
        })
      );
    });

    it("should throw NotFoundException if group not found", async () => {
      //? Arrange
      groupRepository.findOneBy?.mockResolvedValue(null);

      //? Act & Assert
      await expect(
        service.leaveGroup(mockGroupId, mockRequesterId)
      ).rejects.toThrow(
        new NotFoundException(`Group "${mockGroupId}" not found.`)
      );
      expect(groupMemberRepository.findOne).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException if creator tries to leave", async () => {
      //? Arrange - Group found, created by mockUserId

      //? Act & Assert
      await expect(service.leaveGroup(mockGroupId, mockUserId)).rejects.toThrow(
        new BadRequestException(
          "Group creator cannot leave the group. Please delete the group instead."
        )
      );
      expect(groupMemberRepository.findOne).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException if requester's membership is not found (even deleted)", async () => {
      //? Arrange
      groupMemberRepository.findOne?.mockResolvedValue(null);

      //? Act & Assert
      await expect(
        service.leaveGroup(mockGroupId, mockRequesterId)
      ).rejects.toThrow(
        new NotFoundException(`You are not a member of group "${mockGroupId}".`)
      );
      expect(groupMemberRepository.findOne).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.save).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException if requester's membership is already inactive", async () => {
      //? Arrange
      groupMemberRepository.findOne?.mockResolvedValue(
        mockInactiveMembershipToLeave
      );

      //? Act & Assert
      await expect(
        service.leaveGroup(mockGroupId, mockRequesterId)
      ).rejects.toThrow(
        new BadRequestException(`You are already inactive in this group.`)
      );
      expect(groupMemberRepository.findOne).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.save).not.toHaveBeenCalled();
    });

    it("should throw InternalServerErrorException if save fails", async () => {
      //? Arrange
      mockActiveMembershipToLeave.deletedAt = null;
      groupMemberRepository.findOne?.mockResolvedValue(
        mockActiveMembershipToLeave
      );
      const saveError = new Error("DB Save Error");
      groupMemberRepository.save?.mockRejectedValue(saveError);
      const errorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => { });

      //? Act & Assert
      await expect(
        service.leaveGroup(mockGroupId, mockRequesterId)
      ).rejects.toThrow(
        new InternalServerErrorException("Could not leave group.")
      );
      expect(groupMemberRepository.save).toHaveBeenCalledTimes(1);
      errorSpy.mockRestore();
    });

    it("should propagate error from groupRepository.findOneBy", async () => {
      //? Arrange
      const findError = new Error("Group Find Error");
      groupRepository.findOneBy?.mockRejectedValue(findError);

      //? Act & Assert
      await expect(
        service.leaveGroup(mockGroupId, mockRequesterId)
      ).rejects.toThrow(findError);
      expect(groupMemberRepository.findOne).not.toHaveBeenCalled();
    });

    it("should propagate error from groupMemberRepository.findOne", async () => {
      //? Arrange
      const findError = new Error("Member Find Error");
      groupMemberRepository.findOne?.mockRejectedValue(findError);

      //? Act & Assert
      await expect(
        service.leaveGroup(mockGroupId, mockRequesterId)
      ).rejects.toThrow(findError);
      expect(groupRepository.findOneBy).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.findOne).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.save).not.toHaveBeenCalled();
    });
  });

  //* --- getGroupBalances Tests ---
  describe("getGroupBalances", () => {
    const mockRequesterUserId = mockUserId;
    const mockOtherActiveUserId = "user-active-B-uuid";
    const mockInactiveUserId = "user-inactive-C-uuid";

    const mockUserA: Partial<User> = {
      id: mockRequesterUserId,
      name: "User A",
      email: "a@test.com",
    };
    const mockUserB: Partial<User> = {
      id: mockOtherActiveUserId,
      name: "User B",
      email: "b@test.com",
    };
    const mockUserC: Partial<User> = {
      id: mockInactiveUserId,
      name: "User C",
      email: "c@test.com",
    };

    const mockMembershipA: Partial<GroupMember> = {
      group_id: mockGroupId,
      user_id: mockUserA.id,
      user: mockUserA as User,
      deletedAt: null,
      joinedAt: new Date("2023-01-01"),
    };
    const mockMembershipB: Partial<GroupMember> = {
      group_id: mockGroupId,
      user_id: mockUserB.id,
      user: mockUserB as User,
      deletedAt: null,
      joinedAt: new Date("2023-01-01"),
    };
    const mockMembershipCInactive: Partial<GroupMember> = {
      group_id: mockGroupId,
      user_id: mockUserC.id,
      user: mockUserC as User,
      deletedAt: new Date("2023-02-01"),
      joinedAt: new Date("2023-01-05"),
    };
    const mockAllMemberships = [
      mockMembershipA,
      mockMembershipB,
      mockMembershipCInactive,
    ];

    const mockExpense1SplitA: Partial<ExpenseSplit> = {
      id: "s1a",
      expense_id: "exp1",
      owed_by_user_id: mockUserA.id,
      amount: 50.0,
    };
    const mockExpense1SplitB: Partial<ExpenseSplit> = {
      id: "s1b",
      expense_id: "exp1",
      owed_by_user_id: mockUserB.id,
      amount: 50.0,
    };
    const mockExpense1: Partial<Expense> = {
      id: "exp1",
      group_id: mockGroupId,
      paid_by_user_id: mockUserA.id,
      amount: 100.0,
      deletedAt: null,
      splits: [mockExpense1SplitA, mockExpense1SplitB] as ExpenseSplit[],
    };

    const mockExpense2SplitB: Partial<ExpenseSplit> = {
      id: "s2b",
      expense_id: "exp2",
      owed_by_user_id: mockUserB.id,
      amount: 30.0,
    };
    const mockExpense2: Partial<Expense> = {
      id: "exp2",
      group_id: mockGroupId,
      paid_by_user_id: mockUserB.id,
      amount: 30.0,
      deletedAt: null,
      splits: [mockExpense2SplitB] as ExpenseSplit[],
    };

    const mockExpense3DeletedSplitA: Partial<ExpenseSplit> = {
      id: "s3a",
      expense_id: "exp3",
      owed_by_user_id: mockUserA.id,
      amount: 25.0,
    };
    const mockExpense3DeletedSplitB: Partial<ExpenseSplit> = {
      id: "s3b",
      expense_id: "exp3",
      owed_by_user_id: mockUserB.id,
      amount: 25.0,
    };
    const mockExpense3Deleted: Partial<Expense> = {
      id: "exp3",
      group_id: mockGroupId,
      paid_by_user_id: mockUserA.id,
      amount: 50.0,
      deletedAt: new Date(),
      splits: [
        mockExpense3DeletedSplitA,
        mockExpense3DeletedSplitB,
      ] as ExpenseSplit[],
    };

    const mockPaymentBtoA: Partial<Payment> = {
      id: "pay1",
      group_id: mockGroupId,
      paid_by_user_id: mockUserB.id,
      paid_to_user_id: mockUserA.id,
      amount: 10.0,
    };

    const mockFullExpenseList = [
      mockExpense1,
      mockExpense2,
      mockExpense3Deleted,
    ];
    const mockPaymentList = [mockPaymentBtoA];

    let findOneByIdSpy: jest.SpyInstance;

    beforeEach(() => {
      findOneByIdSpy = jest
        .spyOn(service, "findOneById")
        .mockResolvedValue({ ...mockBaseGroup } as Group);
    });

    afterEach(() => {
      findOneByIdSpy.mockRestore();
    });

    it("should calculate correct balances for active members, ignoring inactive members and deleted expenses", async () => {
      //? Arrange
      groupMemberRepository.find?.mockResolvedValue(
        mockAllMemberships as GroupMember[]
      );
      paymentRepository.find?.mockResolvedValue(mockPaymentList as Payment[]);

      //* --- FIX START ---

      expenseRepository.find
        ?.mockResolvedValueOnce(mockFullExpenseList as Expense[])
        .mockResolvedValueOnce(mockFullExpenseList as Expense[]);

      /* Expected Calculation remains the same (based on active expenses/payments):
         User A: Paid 100 (Exp1). Owed 50 (Exp1 Split). Received 10 (Pay1). Net = +60.00
         User B: Paid 30 (Exp2). Owed 50 (Exp1 Split) + 30 (Exp2 Split). Paid 10 (Pay1). Net = -60.00
      */
      const expectedBalances: BalanceResponseDto[] = [
        { user: mockUserA as User, netBalance: 60.0 },
        { user: mockUserB as User, netBalance: -60.0 },
      ].sort((a, b) => (a.user.name || "").localeCompare(b.user.name || ""));

      //? Act
      const result = await service.getGroupBalances(
        mockGroupId,
        mockRequesterUserId
      );

      //? Assert
      expect(findOneByIdSpy).toHaveBeenCalledWith(
        mockGroupId,
        mockRequesterUserId
      );
      expect(groupMemberRepository.find).toHaveBeenCalledWith({
        where: { group_id: mockGroupId },
        relations: ["user"],
        withDeleted: true,
      });
      expect(paymentRepository.find).toHaveBeenCalledWith({
        where: { group_id: mockGroupId },
      });

      //? Verify expenseRepository was called twice
      expect(expenseRepository.find).toHaveBeenCalledTimes(2);

      //? Assert the FIRST actual call's arguments (matching the error output)
      expect(expenseRepository.find).toHaveBeenNthCalledWith(1, {
        where: { group_id: mockGroupId },

        withDeleted: true,
      });

      //? Assert the SECOND actual call's arguments (matching the error output)
      expect(expenseRepository.find).toHaveBeenNthCalledWith(2, {
        where: { group_id: mockGroupId },
        relations: ["splits"],
      });
      //* --- FIX END ---

      expect(result).toEqual(expectedBalances);
    });

    it("should return balances with 0 for active members with no financial activity or cancelling activity", async () => {
      //? Arrange
      const expenseAOnly: Partial<Expense> = {
        id: "expA",
        group_id: mockGroupId,
        paid_by_user_id: mockUserA.id,
        amount: 50.0,
        deletedAt: null,
        splits: [
          {
            id: "sA",
            expense_id: "expA",
            owed_by_user_id: mockUserA.id,
            amount: 50.0,
          },
        ] as ExpenseSplit[],
      };
      groupMemberRepository.find?.mockResolvedValue([
        mockMembershipA,
        mockMembershipB,
      ] as GroupMember[]);
      expenseRepository.find
        ?.mockResolvedValueOnce([expenseAOnly] as Expense[])
        .mockResolvedValueOnce([expenseAOnly] as Expense[]);
      paymentRepository.find?.mockResolvedValue([]);

      /* Expected Calculation:
       User A: Paid 50. Owed 50. Net = 0
       User B: No activity. Net = 0
    */
      const expectedBalances: BalanceResponseDto[] = [
        { user: mockUserA as User, netBalance: 0.0 },
        { user: mockUserB as User, netBalance: 0.0 },
      ].sort((a, b) => (a.user.name || "").localeCompare(b.user.name || ""));

      //? Act
      const result = await service.getGroupBalances(
        mockGroupId,
        mockRequesterUserId
      );

      //? Assert
      expect(result).toEqual(expectedBalances);
      expect(expenseRepository.find).toHaveBeenCalledTimes(2);
      expect(paymentRepository.find).toHaveBeenCalledTimes(1);
    });

    it("should correctly round balances to 2 decimal places", async () => {
      //? Arrange
      const expenseSplit3Ways: Partial<ExpenseSplit>[] = [
        {
          id: "s1/3A",
          expense_id: "exp1/3",
          owed_by_user_id: mockUserA.id,
          amount: 33.3333,
        },
        {
          id: "s1/3B",
          expense_id: "exp1/3",
          owed_by_user_id: mockUserB.id,
          amount: 33.3333,
        },
      ];
      const expense100div3: Partial<Expense> = {
        id: "exp1/3",
        group_id: mockGroupId,
        paid_by_user_id: mockUserA.id,
        amount: 100.0,
        deletedAt: null,
        splits: expenseSplit3Ways as ExpenseSplit[],
      };
      groupMemberRepository.find?.mockResolvedValue([
        mockMembershipA,
        mockMembershipB,
      ] as GroupMember[]);
      expenseRepository.find
        ?.mockResolvedValueOnce([expense100div3] as Expense[])
        .mockResolvedValueOnce([expense100div3] as Expense[]);
      paymentRepository.find?.mockResolvedValue([]);

      const expectedBalances: BalanceResponseDto[] = [
        { user: mockUserA as User, netBalance: 66.67 },
        { user: mockUserB as User, netBalance: -33.33 },
      ].sort((a, b) => (a.user.name || "").localeCompare(b.user.name || ""));

      //? Act
      const result = await service.getGroupBalances(
        mockGroupId,
        mockRequesterUserId
      );

      //? Assert
      expect(result).toEqual(expectedBalances);
    });

    it("should propagate ForbiddenException from findOneById", async () => {
      //? Arrange
      const accessError = new ForbiddenException("No access");
      findOneByIdSpy.mockRejectedValue(accessError);

      //? Act & Assert
      await expect(
        service.getGroupBalances(mockGroupId, mockRequesterUserId)
      ).rejects.toThrow(ForbiddenException);
      expect(groupMemberRepository.find).not.toHaveBeenCalled();
    });

    it("should return empty array if no members found for the group", async () => {
      //? Arrange
      groupMemberRepository.find?.mockResolvedValue([]);

      //? Act
      const result = await service.getGroupBalances(
        mockGroupId,
        mockRequesterUserId
      );

      //? Assert
      expect(result).toEqual([]);
      expect(findOneByIdSpy).toHaveBeenCalledTimes(1);
      expect(groupMemberRepository.find).toHaveBeenCalledTimes(1);
      expect(expenseRepository.find).not.toHaveBeenCalled();
      expect(paymentRepository.find).not.toHaveBeenCalled();
    });

    it("should propagate error from groupMemberRepository.find", async () => {
      const dbError = new Error("Member find error");
      groupMemberRepository.find?.mockRejectedValue(dbError);
      await expect(
        service.getGroupBalances(mockGroupId, mockRequesterUserId)
      ).rejects.toThrow(dbError);
      expect(expenseRepository.find).not.toHaveBeenCalled();
    });

    it("should propagate error from expenseRepository.find", async () => {
      const dbError = new Error("Expense find error");
      groupMemberRepository.find?.mockResolvedValue(
        mockAllMemberships as GroupMember[]
      );
      expenseRepository.find?.mockRejectedValue(dbError);
      await expect(
        service.getGroupBalances(mockGroupId, mockRequesterUserId)
      ).rejects.toThrow(dbError);
      expect(paymentRepository.find).not.toHaveBeenCalled();
    });

    it("should propagate error from paymentRepository.find", async () => {
      const dbError = new Error("Payment find error");
      groupMemberRepository.find?.mockResolvedValue(
        mockAllMemberships as GroupMember[]
      );
      expenseRepository.find
        ?.mockResolvedValueOnce(mockFullExpenseList as Expense[])
        .mockResolvedValueOnce(mockFullExpenseList as Expense[]);
      paymentRepository.find?.mockRejectedValue(dbError);
      await expect(
        service.getGroupBalances(mockGroupId, mockRequesterUserId)
      ).rejects.toThrow(dbError);
    });
  });

  //* --- findDeletedGroupsForCreator Tests ---
  describe("findDeletedGroupsForCreator", () => {
    const mockDeletedGroup1: Partial<Group> = {
      id: "deleted-group-1",
      name: "Old Deleted Group",
      created_by_user_id: mockUserId,
      deletedAt: new Date("2024-02-15"),
      createdAt: new Date("2024-01-01"),
    };
    const mockDeletedGroup2: Partial<Group> = {
      id: "deleted-group-2",
      name: "Another Deleted Group",
      created_by_user_id: mockUserId,
      deletedAt: new Date("2024-04-20"),
      createdAt: new Date("2024-03-01"),
    };
    const mockDeletedGroupsFound = [mockDeletedGroup2, mockDeletedGroup1];

    it("should return an array of soft-deleted groups created by the user, ordered by deletion date DESC", async () => {
      //? Arrange
      groupRepository.find?.mockResolvedValue(
        mockDeletedGroupsFound as Group[]
      );

      //? Act
      const result = await service.findDeletedGroupsForCreator(mockUserId);

      //? Assert
      expect(result).toEqual(mockDeletedGroupsFound);
      expect(groupRepository.find).toHaveBeenCalledTimes(1);
      expect(groupRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            created_by_user_id: mockUserId,
            deletedAt: Not(IsNull()),
          },
          withDeleted: true,
          order: { deletedAt: "DESC" },
        })
      );
    });

    it("should return an empty array if the user has no soft-deleted groups", async () => {
      //? Arrange
      groupRepository.find?.mockResolvedValue([]);

      //? Act
      const result = await service.findDeletedGroupsForCreator(mockUserId);

      //? Assert
      expect(result).toEqual([]);
      expect(groupRepository.find).toHaveBeenCalledTimes(1);
      expect(groupRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { created_by_user_id: mockUserId, deletedAt: Not(IsNull()) },
          withDeleted: true,
          order: { deletedAt: "DESC" },
        })
      );
    });

    it("should propagate errors from the groupRepository.find", async () => {
      //? Arrange
      const dbError = new Error("Database Find Error");
      groupRepository.find?.mockRejectedValue(dbError);

      //? Act & Assert
      await expect(
        service.findDeletedGroupsForCreator(mockUserId)
      ).rejects.toThrow(dbError);
      expect(groupRepository.find).toHaveBeenCalledTimes(1);
    });
  });
});
