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
import { UpdateExpenseDto } from "src/expenses/dto/update-expense.dto";
import { DataSource, Repository } from "typeorm"; // Import DataSource
import { GroupsService } from "../groups/groups.service"; // Import GroupsService
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { SplitType } from "./dto/expense-split.type"; // Import SplitType
import { ExpenseSplit } from "./entities/expense-split.entity";
import { Expense } from "./entities/expense.entity";

const tolerance = 0.015; // Tolerance for floating point sum checks (~1 cent)

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

  private distributeRemainder(
    participants: { user_id: string; amount: number }[],
    remainder_cents: number // Integer representing cents (can be negative)
  ): { user_id: string; amount: number }[] {
    if (remainder_cents === 0 || participants.length === 0) {
      // Ensure amounts have correct precision even if no remainder
      return participants.map((p) => ({
        ...p,
        amount: parseFloat(p.amount.toFixed(2)),
      }));
    }

    // Sort participants to distribute remainder more consistently? Optional.
    // Or just distribute cyclically.
    const numParticipants = participants.length;
    const centsToAdd = remainder_cents > 0 ? 1 : -1;
    const iterations = Math.abs(remainder_cents);

    for (let i = 0; i < iterations; i++) {
      // Add/subtract one cent to participants cyclically
      participants[i % numParticipants].amount += centsToAdd * 0.01;
    }

    // Return results rounded to 2 decimal places
    return participants.map((p) => ({
      user_id: p.user_id,
      amount: parseFloat(p.amount.toFixed(2)),
    }));
  }

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
        sumOfSplitAmounts += split.amount!;
      }

      // Check if the sum of split amounts equals the total expense amount (within a small tolerance for floating point)
      if (Math.abs(sumOfSplitAmounts - totalAmount) > tolerance) {
        throw new BadRequestException(
          `Sum of exact split amounts (${sumOfSplitAmounts.toFixed(2)}) does not equal the total expense amount (${totalAmount.toFixed(2)}).`
        );
      }

      // Use the validated input splits directly
      validatedSplitsData = inputSplits.map((s) => ({
        user_id: s.user_id,
        amount: s.amount!,
      }));
    } else if (split_type === SplitType.PERCENTAGE) {
      if (!inputSplits || inputSplits.length === 0)
        throw new BadRequestException(
          `Splits array required for type ${SplitType.PERCENTAGE}.`
        );
      let totalPercentage = 0;
      const involvedUserIds = new Set<string>();
      const preliminarySplits: { user_id: string; amount: number }[] = [];

      for (const split of inputSplits) {
        if (!memberIds.has(split.user_id))
          throw new BadRequestException(`User ${split.user_id} not in group.`);
        if (involvedUserIds.has(split.user_id))
          throw new BadRequestException(`Duplicate user ${split.user_id}.`);
        if (
          split.percentage === undefined ||
          isNaN(split.percentage) ||
          split.percentage <= 0
        )
          throw new BadRequestException(
            `Invalid percentage for user ${split.user_id}.`
          );

        involvedUserIds.add(split.user_id);
        totalPercentage += split.percentage;

        // Calculate preliminary amount (might have rounding errors)
        const calculatedAmount = totalAmount * (split.percentage / 100);
        preliminarySplits.push({
          user_id: split.user_id,
          amount: calculatedAmount,
        });
      }

      // Check if percentages sum to 100 (within tolerance)
      if (Math.abs(totalPercentage - 100) > tolerance) {
        throw new BadRequestException(
          `Percentages must sum to 100 (currently ${totalPercentage.toFixed(2)}%).`
        );
      }

      // Distribute rounding remainder
      const currentTotalCents = preliminarySplits.reduce(
        (sum, s) => sum + Math.round(s.amount * 100),
        0
      );
      const totalAmountCents = Math.round(totalAmount * 100);
      const remainderCents = totalAmountCents - currentTotalCents;

      // Sort by largest fraction to distribute remainder more fairly? Or simple distribution.
      // Simple distribution:
      preliminarySplits.sort(
        (a, b) =>
          b.amount - Math.floor(b.amount) - (a.amount - Math.floor(a.amount))
      ); // Sort by fractional part descending (optional refinement)

      validatedSplitsData = preliminarySplits
        .map((split, index) => ({
          user_id: split.user_id,
          // Add remainder cents to the first few participants
          amount: parseFloat(
            (
              (Math.round(split.amount * 100) +
                (index < remainderCents
                  ? 1
                  : index >= preliminarySplits.length + remainderCents
                    ? -1
                    : 0)) /
              100
            ).toFixed(2)
          ), // Adjust based on sign of remainder
        }))
        .filter((s) => s.amount > 0); // Ensure we only store positive splits

      if (validatedSplitsData.length === 0 && totalAmount > 0)
        throw new BadRequestException(
          `Percentage splits resulted in no positive amounts.`
        );
    } else if (split_type === SplitType.SHARE) {
      if (!inputSplits || inputSplits.length === 0)
        throw new BadRequestException(
          `Splits array required for type ${SplitType.SHARE}.`
        );
      let totalShares = 0;
      const involvedUserIds = new Set<string>();
      let preliminarySplits: { user_id: string; amount: number }[] = [];

      for (const split of inputSplits) {
        if (!memberIds.has(split.user_id))
          throw new BadRequestException(`User ${split.user_id} not in group.`);
        if (involvedUserIds.has(split.user_id))
          throw new BadRequestException(`Duplicate user ${split.user_id}.`);
        if (
          split.shares === undefined ||
          isNaN(split.shares) ||
          split.shares <= 0
        )
          throw new BadRequestException(
            `Invalid shares for user ${split.user_id}.`
          );

        involvedUserIds.add(split.user_id);
        totalShares += split.shares;
      }

      if (totalShares <= 0) {
        throw new BadRequestException("Total shares must be positive.");
      }

      // Calculate preliminary amounts
      let calculatedSumCents = 0;
      preliminarySplits = inputSplits
        .filter((s) => s.shares !== undefined && s.shares > 0)
        .map((split) => {
          const shareAmount = totalAmount * (split.shares! / totalShares);
          calculatedSumCents += Math.round(shareAmount * 100);
          return { user_id: split.user_id, amount: shareAmount };
        });

      // Distribute rounding remainder
      const totalAmountCents = Math.round(totalAmount * 100);
      const remainderCents = totalAmountCents - calculatedSumCents;

      preliminarySplits.sort(
        (a, b) =>
          b.amount - Math.floor(b.amount) - (a.amount - Math.floor(a.amount))
      ); // Sort by fractional part descending

      validatedSplitsData = preliminarySplits
        .map((split, index) => ({
          user_id: split.user_id,
          amount: parseFloat(
            (
              (Math.round(split.amount * 100) +
                (index < remainderCents
                  ? 1
                  : index >= preliminarySplits.length + remainderCents
                    ? -1
                    : 0)) /
              100
            ).toFixed(2)
          ),
        }))
        .filter((s) => s.amount > 0);

      if (validatedSplitsData.length === 0 && totalAmount > 0)
        throw new BadRequestException(
          `Share splits resulted in no positive amounts.`
        );
    } else {
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
  async removeExpense(
    expenseId: string,
    requestingUserId: string
  ): Promise<void> {
    // 1. Find the expense and the group it belongs to
    const expense = await this.expenseRepository.findOne({
      where: { id: expenseId },
      // No need to load relations like 'group' if only groupId is needed for auth check
      select: ["id", "group_id", "paid_by_user_id"], // Select only necessary fields
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID "${expenseId}" not found.`);
    }

    // 2. Check Authorization: Allow any member of the group to delete for now
    //    (Alternatively, only allow the payer or group creator)
    const canAccess = await this.groupsService.isMember(
      expense.group_id,
      requestingUserId
    );
    if (!canAccess) {
      // If findOneById in groupsService throws ForbiddenException, that could also work
      throw new ForbiddenException(
        "You do not have permission to delete expenses in this group."
      );
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
      throw new NotFoundException(
        `Expense with ID "${expenseId}" could not be deleted.`
      );
    }
    // No return value needed for successful delete
  }

  // --- Soft DELETE Expense ---
  async softRemoveExpense(
    expenseId: string,
    requestingUserId: string
  ): Promise<void> {
    // 1. Find the expense to ensure it exists
    const expense = await this.expenseRepository.findOne({
      where: { id: expenseId },
      select: ["id", "group_id", "paid_by_user_id"], // Select necessary fields
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID "${expenseId}" not found.`);
    }

    // 2. Check Authorization: ONLY the user who paid can soft-delete
    if (expense.paid_by_user_id !== requestingUserId) {
      throw new ForbiddenException(
        "Only the user who paid for the expense can delete it."
      );
    }

    // 3. Perform soft delete using TypeORM's built-in method
    const deleteResult = await this.expenseRepository.softDelete({
      id: expenseId,
    });

    if (deleteResult.affected === 0) {
      throw new NotFoundException(
        `Expense with ID "${expenseId}" could not be soft-deleted.`
      );
    }

    // Note: Associated ExpenseSplits remain in the DB (not hard deleted by cascade).
    // Balance calculation logic needs to ignore splits related to soft-deleted expenses.
  }

  // --- UPDATE Expense ---
  async updateExpense(
    expenseId: string,
    requestingUserId: string,
    updateExpenseDto: UpdateExpenseDto
  ): Promise<Expense> {
    // Start transaction early to fetch data consistently
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let updatedExpense: Expense;

    try {
      // 1. Fetch Existing Expense within transaction using the manager
      const expense = await queryRunner.manager.findOne(Expense, {
        where: { id: expenseId },
        relations: ["group"], // Needed for group ID -> members lookup later
        // Do NOT use withDeleted: true here - cannot edit deleted expenses
      });

      if (!expense) {
        throw new NotFoundException(
          `Expense with ID "${expenseId}" not found.`
        );
      }
      // Should not happen if findOne succeeded, but check just in case
      if (expense.deletedAt) {
        throw new BadRequestException(`Cannot edit a deleted expense.`);
      }

      // 2. Check Authorization: Only payer can edit
      if (expense.paid_by_user_id !== requestingUserId) {
        throw new ForbiddenException(
          "Only the user who paid for the expense can edit it."
        );
      }

      // 3. Determine if splits need recalculation
      const newTotalAmount = updateExpenseDto.amount ?? expense.amount; // Use new amount if provided, else old
      const newSplitType = updateExpenseDto.split_type ?? expense.split_type; // Use new type if provided, else old
      const newSplitsInput = updateExpenseDto.splits; // Use new splits if provided

      const needsSplitRecalculation =
        updateExpenseDto.amount !== undefined ||
        updateExpenseDto.split_type !== undefined ||
        (newSplitType !== SplitType.EQUAL &&
          updateExpenseDto.splits !== undefined); // Recalculate if type changes or if new splits provided for non-equal types

      let validatedSplitsData: { user_id: string; amount: number }[] = [];

      // 4. Validate and Prepare New Splits (if needed)
      if (needsSplitRecalculation) {
        // Fetch current members for validation and potential equal split
        const members = await this.groupsService.findGroupMembers(
          expense.group_id,
          requestingUserId
        ); // Need members for validation/splitting
        const memberIds = new Set(members.map((m) => m.user_id));

        if (newSplitType === SplitType.EQUAL) {
          // Recalculate EQUAL split based on NEW total amount and current members
          const numberOfMembers = members.length;
          if (numberOfMembers === 0)
            throw new BadRequestException(
              "Group has no members for equal split."
            );

          const baseSplitAmount =
            Math.floor((newTotalAmount / numberOfMembers) * 100) / 100;
          const totalBaseAmount = baseSplitAmount * numberOfMembers;
          const remainder = Math.round(
            (newTotalAmount - totalBaseAmount) * 100
          );

          validatedSplitsData = members.map((member, index) => ({
            user_id: member.user_id,
            amount: parseFloat(
              (baseSplitAmount + (index < remainder ? 0.01 : 0)).toFixed(2)
            ),
          }));
        } else if (newSplitType === SplitType.EXACT) {
          // Validate the provided EXACT splits against the NEW total amount
          if (!newSplitsInput || newSplitsInput.length === 0) {
            throw new BadRequestException(
              `Splits array is required when updating to split type ${SplitType.EXACT}.`
            );
          }
          let sumOfSplitAmounts = 0;
          const involvedUserIds = new Set<string>();

          for (const split of newSplitsInput) {
            if (!memberIds.has(split.user_id))
              throw new BadRequestException(
                `User ${split.user_id} in splits is not a member.`
              );
            if (involvedUserIds.has(split.user_id))
              throw new BadRequestException(
                `Duplicate user ${split.user_id} in splits.`
              );
            involvedUserIds.add(split.user_id);
            sumOfSplitAmounts += split.amount!;
          }
          if (Math.abs(sumOfSplitAmounts - newTotalAmount) > tolerance) {
            throw new BadRequestException(
              `Sum of exact splits (${sumOfSplitAmounts.toFixed(2)}) does not match new expense amount (${newTotalAmount.toFixed(2)}).`
            );
          }
          // Filter out zero amounts if desired, or keep them
          validatedSplitsData = newSplitsInput
            .filter((s) => s.amount! > 0.005) // Only save non-zero splits
            .map((s) => ({
              user_id: s.user_id,
              amount: parseFloat(s.amount!.toFixed(2)),
            }));
          if (validatedSplitsData.length === 0)
            throw new BadRequestException(
              "Exact splits must involve at least one positive amount."
            );
        } else if (newSplitType === SplitType.PERCENTAGE) {
          if (!newSplitsInput)
            throw new BadRequestException(
              `Splits array required for type ${SplitType.PERCENTAGE}.`
            );
          let totalPercentage = 0;
          const involvedUserIds = new Set<string>();
          const preliminarySplits: { user_id: string; amount: number }[] = [];

          for (const split of newSplitsInput) {
            if (!memberIds.has(split.user_id))
              throw new BadRequestException(
                `User ${split.user_id} not in group.`
              );
            if (involvedUserIds.has(split.user_id))
              throw new BadRequestException(`Duplicate user ${split.user_id}.`);
            if (
              split.percentage === undefined ||
              isNaN(split.percentage) ||
              split.percentage <= 0
            )
              throw new BadRequestException(
                `Invalid percentage for user ${split.user_id}.`
              );
            involvedUserIds.add(split.user_id);
            totalPercentage += split.percentage;
            preliminarySplits.push({
              user_id: split.user_id,
              amount: newTotalAmount * (split.percentage / 100),
            });
          }
          if (Math.abs(totalPercentage - 100) > tolerance)
            throw new BadRequestException(`Percentages must sum to 100.`);

          const currentTotalCents = preliminarySplits.reduce(
            (sum, s) => sum + Math.round(s.amount * 100),
            0
          );
          const totalAmountCents = Math.round(newTotalAmount * 100);
          const remainderCents = totalAmountCents - currentTotalCents;
          preliminarySplits.sort(
            (a, b) =>
              b.amount -
              Math.floor(b.amount) -
              (a.amount - Math.floor(a.amount))
          ); // Sort
          validatedSplitsData = this.distributeRemainder(
            preliminarySplits,
            remainderCents
          ).filter((s) => s.amount > 0.005); // Use final validated amounts
          if (validatedSplitsData.length === 0 && newTotalAmount > 0)
            throw new BadRequestException(
              `Percentage splits resulted in no positive amounts.`
            );
        } else if (newSplitType === SplitType.SHARE) {
          if (!newSplitsInput)
            throw new BadRequestException(
              `Splits array required for type ${SplitType.SHARE}.`
            );
          let totalShares = 0;
          const involvedUserIds = new Set<string>();
          let preliminarySplits: { user_id: string; amount: number }[] = [];

          for (const split of newSplitsInput) {
            if (!memberIds.has(split.user_id))
              throw new BadRequestException(
                `User ${split.user_id} not in group.`
              );
            if (involvedUserIds.has(split.user_id))
              throw new BadRequestException(`Duplicate user ${split.user_id}.`);
            if (
              split.shares === undefined ||
              isNaN(split.shares) ||
              split.shares <= 0
            )
              throw new BadRequestException(
                `Invalid shares for user ${split.user_id}.`
              );
            involvedUserIds.add(split.user_id);
            totalShares += split.shares;
          }
          if (totalShares <= 0)
            throw new BadRequestException("Total shares must be positive.");

          let calculatedSumCents = 0;
          preliminarySplits = newSplitsInput
            .filter((s) => s.shares !== undefined && s.shares > 0)
            .map((split) => {
              const shareAmount =
                newTotalAmount * (split.shares! / totalShares);
              calculatedSumCents += Math.round(shareAmount * 100);
              return { user_id: split.user_id, amount: shareAmount };
            });

          const totalAmountCents = Math.round(newTotalAmount * 100);
          const remainderCents = totalAmountCents - calculatedSumCents;
          preliminarySplits.sort(
            (a, b) =>
              b.amount -
              Math.floor(b.amount) -
              (a.amount - Math.floor(a.amount))
          ); // Sort
          validatedSplitsData = this.distributeRemainder(
            preliminarySplits,
            remainderCents
          ).filter((s) => s.amount > 0.005); // Use final validated amounts
          if (validatedSplitsData.length === 0 && newTotalAmount > 0)
            throw new BadRequestException(
              `Share splits resulted in no positive amounts.`
            );
        } else {
          throw new BadRequestException(
            `Split type "${newSplitType}" is not yet supported for editing.`
          );
        }
      }

      // 5. Perform Updates within Transaction

      // Update basic expense fields (description, amount, date, split_type)
      // Create a clean object with only the fields present in the DTO
      const expenseUpdateData: Partial<Expense> = {};
      if (updateExpenseDto.description !== undefined)
        expenseUpdateData.description = updateExpenseDto.description;
      if (updateExpenseDto.amount !== undefined)
        expenseUpdateData.amount = updateExpenseDto.amount;
      if (updateExpenseDto.transaction_date !== undefined)
        expenseUpdateData.transaction_date = updateExpenseDto.transaction_date;
      if (updateExpenseDto.split_type !== undefined)
        expenseUpdateData.split_type = updateExpenseDto.split_type;

      // Apply the basic updates
      await queryRunner.manager.update(Expense, expenseId, expenseUpdateData);

      // Update splits if necessary
      if (needsSplitRecalculation) {
        // Delete old splits
        await queryRunner.manager.delete(ExpenseSplit, {
          expense_id: expenseId,
        });

        // Create new splits
        const newSplitEntities = validatedSplitsData.map((splitData) =>
          queryRunner.manager.create(ExpenseSplit, {
            expense_id: expenseId, // Use original expense ID
            owed_by_user_id: splitData.user_id,
            amount: splitData.amount,
          })
        );
        await queryRunner.manager.save(ExpenseSplit, newSplitEntities);
      }

      // 6. Commit Transaction
      await queryRunner.commitTransaction();

      // 7. Fetch the updated expense *after* transaction commits
      updatedExpense = await this.expenseRepository.findOneOrFail({
        // Use findOneOrFail
        where: { id: expenseId },
        relations: ["paidBy"], // Include relations needed for response DTO
      });
    } catch (err) {
      // 8. Rollback on any error
      await queryRunner.rollbackTransaction();
      console.error("Transaction failed in updateExpense:", err);
      // Re-throw specific exceptions if possible, otherwise generic server error
      if (
        err instanceof NotFoundException ||
        err instanceof ForbiddenException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      throw new InternalServerErrorException(
        "Failed to update expense due to a transaction error."
      );
    } finally {
      // 9. Release query runner
      await queryRunner.release();
    }

    return updatedExpense; // Return the fully updated expense
  }
}
