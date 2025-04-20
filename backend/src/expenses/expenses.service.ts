import {
  BadRequestException,
  ForbiddenException, // Import Inject
  forwardRef,
  Inject,
  Injectable, // Import forwardRef
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm"; // Import DataSource
import { GroupsService } from "../groups/groups.service"; // Import GroupsService
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { SplitType } from "./dto/expense-split.type"; // Import SplitType
import { ExpenseSplit } from "./entities/expense-split.entity";
import { Expense } from "./entities/expense.entity";

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,

    @InjectRepository(ExpenseSplit)
    private readonly expenseSplitRepository: Repository<ExpenseSplit>,

    // Inject GroupsService using forwardRef to handle potential circular dependencies
    @Inject(forwardRef(() => GroupsService))
    private readonly groupsService: GroupsService,

    // Inject DataSource to manage transactions
    private readonly dataSource: DataSource
    // Ensure UserRepository is injected if needed by GroupsService/findGroupMembers or directly here
    // @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) { }

  // --- CREATE EXPENSE (with Equal Split) ---
  async createExpense(
    createExpenseDto: CreateExpenseDto,
    groupId: string,
    paidByUserId: string
  ): Promise<Expense> {
    const {
      description,
      amount: totalAmount,
      transaction_date,
      split_type,
      splits: inputSplits,
    } = createExpenseDto;

    // 1. Verify group exists and the payer is a member (also fetches members)
    const members = await this.groupsService.findGroupMembers(
      groupId,
      paidByUserId
    );
    if (!members || members.length === 0) {
      throw new BadRequestException(
        "Cannot add expense to a group with no members."
      );
    }
    const memberIds = new Set(members.map((m) => m.user_id)); // Set for efficient lookup

    // 2. Validate Splits based on split_type
    let validatedSplitsData: { user_id: string; amount: number }[] = [];

    if (split_type === SplitType.EQUAL) {
      // --- EQUAL Split Logic ---
      const numberOfMembers = members.length;
      // Use precise rounding for last member to avoid cent errors due to division
      const baseSplitAmount =
        Math.floor((totalAmount / numberOfMembers) * 100) / 100; // Calculate floor value per member in cents, then convert back
      const totalBaseAmount = baseSplitAmount * numberOfMembers;
      const remainder = Math.round((totalAmount - totalBaseAmount) * 100); // Remainder in cents

      validatedSplitsData = members.map((member, index) => {
        // Distribute the remainder cent by cent to the first 'remainder' members
        const memberAmount = baseSplitAmount + (index < remainder ? 0.01 : 0);
        return {
          user_id: member.user_id,
          amount: parseFloat(memberAmount.toFixed(2)),
        };
      });
    } else if (split_type === SplitType.EXACT) {
      // --- EXACT Split Logic & Validation ---
      if (!inputSplits || inputSplits.length === 0) {
        throw new BadRequestException(
          `Splits array is required for split type ${SplitType.EXACT}.`
        );
      }

      let sumOfSplitAmounts = 0;
      const involvedUserIds = new Set<string>();

      for (const split of inputSplits) {
        // Check if user_id in split exists in the group members
        if (!memberIds.has(split.user_id)) {
          throw new BadRequestException(
            `User with ID ${split.user_id} in splits is not a member of this group.`
          );
        }
        // Check for duplicate user entries in splits
        if (involvedUserIds.has(split.user_id)) {
          throw new BadRequestException(
            `Duplicate user ID ${split.user_id} found in splits.`
          );
        }
        involvedUserIds.add(split.user_id);
        sumOfSplitAmounts += split.amount;
      }

      // Check if the sum of split amounts equals the total expense amount (within a small tolerance for floating point)
      const tolerance = 0.005; // e.g., half a cent tolerance
      if (Math.abs(sumOfSplitAmounts - totalAmount) > tolerance) {
        throw new BadRequestException(
          `Sum of exact split amounts (${sumOfSplitAmounts.toFixed(2)}) does not equal the total expense amount (${totalAmount.toFixed(2)}).`
        );
      }

      // Use the validated input splits directly
      validatedSplitsData = inputSplits.map((s) => ({
        user_id: s.user_id,
        amount: s.amount,
      }));
    } else {
      // Handle other split types later (PERCENTAGE, SHARE)
      throw new BadRequestException(
        `Split type "${split_type}" is not yet supported.`
      );
    }

    // 3. Database Transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 4. Create Expense record
      const expense = queryRunner.manager.create(Expense, {
        description,
        amount: totalAmount,
        transaction_date,
        group_id: groupId,
        paid_by_user_id: paidByUserId,
        // split_type: split_type // Add if you added the column to the entity
      });
      const savedExpense = await queryRunner.manager.save(Expense, expense);

      // 5. Create ExpenseSplit records based on validatedSplitsData
      const splitPromises = validatedSplitsData.map((splitData) => {
        const split = queryRunner.manager.create(ExpenseSplit, {
          expense_id: savedExpense.id,
          owed_by_user_id: splitData.user_id,
          amount: splitData.amount,
        });
        return queryRunner.manager.save(ExpenseSplit, split);
      });
      await Promise.all(splitPromises);

      // 6. Commit
      await queryRunner.commitTransaction();
      return savedExpense;
    } catch (err) {
      // 7. Rollback
      await queryRunner.rollbackTransaction();
      console.error("Transaction failed in createExpense:", err);
      throw new InternalServerErrorException(
        "Failed to create expense due to a transaction error."
      );
    } finally {
      // 8. Release query runner
      await queryRunner.release();
    }
  }

  // --- FIND All Expenses for a Group ---
  async findAllForGroup(
    groupId: string,
    requestingUserId: string
  ): Promise<Expense[]> {
    // 1. Verify group exists and user has access (implicitly checks membership)
    try {
      await this.groupsService.findOneById(groupId, requestingUserId);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error; // Re-throw auth/not found errors
      }
      throw new InternalServerErrorException("Could not verify group access.");
    }

    // 2. Fetch expenses, ordered by date, include payer details
    return this.expenseRepository.find({
      where: { group_id: groupId },
      withDeleted: true,
      relations: {
        paidBy: true, // Load the User object associated with paidBy
        // splits: { owedBy: true } // Optionally load splits and their users if needed immediately
      },
      order: {
        deletedAt: "ASC",
        transaction_date: "DESC",
        createdAt: "DESC",
      },
    });
  }

  // --- DELETE Expense ---
  async removeExpense(expenseId: string, requestingUserId: string): Promise<void> {
    // 1. Find the expense and the group it belongs to
    const expense = await this.expenseRepository.findOne({
      where: { id: expenseId },
      // No need to load relations like 'group' if only groupId is needed for auth check
      select: ['id', 'group_id', 'paid_by_user_id'] // Select only necessary fields
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID "${expenseId}" not found.`);
    }

    // 2. Check Authorization: Allow any member of the group to delete for now
    //    (Alternatively, only allow the payer or group creator)
    const canAccess = await this.groupsService.isMember(expense.group_id, requestingUserId);
    if (!canAccess) {
      // If findOneById in groupsService throws ForbiddenException, that could also work
      throw new ForbiddenException('You do not have permission to delete expenses in this group.');
    }

    // Optional stricter check: Only allow payer to delete?
    // if (expense.paid_by_user_id !== requestingUserId) {
    //     throw new ForbiddenException('Only the user who paid for the expense can delete it.');
    // }

    // 3. Delete the expense
    // Because of 'ON DELETE CASCADE' in the database,
    // related expense_splits should be deleted automatically by Postgres.
    const deleteResult = await this.expenseRepository.delete({ id: expenseId });

    if (deleteResult.affected === 0) {
      // Should not happen if findOne succeeded, but good safety check
      throw new NotFoundException(`Expense with ID "${expenseId}" could not be deleted.`);
    }
    // No return value needed for successful delete
  }

  async softRemoveExpense(expenseId: string, requestingUserId: string): Promise<void> {
    // 1. Find the expense to ensure it exists
    const expense = await this.expenseRepository.findOne({
      where: { id: expenseId },
      select: ['id', 'group_id', 'paid_by_user_id'], // Select necessary fields
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID "${expenseId}" not found.`);
    }

    // 2. Check Authorization: ONLY the user who paid can soft-delete
    if (expense.paid_by_user_id !== requestingUserId) {
      throw new ForbiddenException('Only the user who paid for the expense can delete it.');
    }

    // 3. Perform soft delete using TypeORM's built-in method
    const deleteResult = await this.expenseRepository.softDelete({ id: expenseId });

    if (deleteResult.affected === 0) {
      throw new NotFoundException(`Expense with ID "${expenseId}" could not be soft-deleted.`);
    }

    // Note: Associated ExpenseSplits remain in the DB (not hard deleted by cascade).
    // Balance calculation logic needs to ignore splits related to soft-deleted expenses.
  }

  // --- Add Update methods later ---
}
