import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UpdateExpenseDto } from "src/expenses/dto/update-expense.dto";
import { DataSource, Repository } from "typeorm";
import { GroupsService } from "../groups/groups.service";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { SplitType } from "./dto/expense-split.type";
import { ExpenseSplit } from "./entities/expense-split.entity";
import { Expense } from "./entities/expense.entity";

const tolerance = 0.015;

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,

    @InjectRepository(ExpenseSplit)
    private readonly expenseSplitRepository: Repository<ExpenseSplit>,

    @Inject(forwardRef(() => GroupsService))
    private readonly groupsService: GroupsService,

    private readonly dataSource: DataSource
  ) { }

  private distributeRemainder(
    participants: { user_id: string; amount: number }[],
    remainder_cents: number
  ): { user_id: string; amount: number }[] {
    if (remainder_cents === 0 || participants.length === 0) {
      return participants.map((p) => ({
        ...p,
        amount: parseFloat(p.amount.toFixed(2)),
      }));
    }

    const numParticipants = participants.length;
    const centsToAdd = remainder_cents > 0 ? 1 : -1;
    const iterations = Math.abs(remainder_cents);

    for (let i = 0; i < iterations; i++) {
      participants[i % numParticipants].amount += centsToAdd * 0.01;
    }

    return participants.map((p) => ({
      user_id: p.user_id,
      amount: parseFloat(p.amount.toFixed(2)),
    }));
  }

  //* --- CREATE EXPENSE (with Equal Split) ---
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

    const members = await this.groupsService.findGroupMembers(
      groupId,
      paidByUserId
    );
    if (!members || members.length === 0) {
      throw new BadRequestException(
        "Cannot add expense to a group with no members."
      );
    }
    const memberIds = new Set(members.map((m) => m.user_id));

    let validatedSplitsData: { user_id: string; amount: number }[] = [];

    if (split_type === SplitType.EQUAL) {
      //* --- EQUAL Split Logic ---
      const numberOfMembers = members.length;

      const baseSplitAmount =
        Math.floor((totalAmount / numberOfMembers) * 100) / 100;
      const totalBaseAmount = baseSplitAmount * numberOfMembers;
      const remainder = Math.round((totalAmount - totalBaseAmount) * 100);

      validatedSplitsData = members.map((member, index) => {
        const memberAmount = baseSplitAmount + (index < remainder ? 0.01 : 0);
        return {
          user_id: member.user_id,
          amount: parseFloat(memberAmount.toFixed(2)),
        };
      });
    } else if (split_type === SplitType.EXACT) {
      //* --- EXACT Split Logic & Validation ---
      if (!inputSplits || inputSplits.length === 0) {
        throw new BadRequestException(
          `Splits array is required for split type ${SplitType.EXACT}.`
        );
      }

      let sumOfSplitAmounts = 0;
      const involvedUserIds = new Set<string>();

      for (const split of inputSplits) {
        if (!memberIds.has(split.user_id)) {
          throw new BadRequestException(
            `User with ID ${split.user_id} in splits is not a member of this group.`
          );
        }

        if (involvedUserIds.has(split.user_id)) {
          throw new BadRequestException(
            `Duplicate user ID ${split.user_id} found in splits.`
          );
        }
        involvedUserIds.add(split.user_id);
        sumOfSplitAmounts += split.amount!;
      }

      if (Math.abs(sumOfSplitAmounts - totalAmount) > tolerance) {
        throw new BadRequestException(
          `Sum of exact split amounts (${sumOfSplitAmounts.toFixed(2)}) does not equal the total expense amount (${totalAmount.toFixed(2)}).`
        );
      }

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

        const calculatedAmount = totalAmount * (split.percentage / 100);
        preliminarySplits.push({
          user_id: split.user_id,
          amount: calculatedAmount,
        });
      }

      if (Math.abs(totalPercentage - 100) > tolerance) {
        throw new BadRequestException(
          `Percentages must sum to 100 (currently ${totalPercentage.toFixed(2)}%).`
        );
      }

      const currentTotalCents = preliminarySplits.reduce(
        (sum, s) => sum + Math.round(s.amount * 100),
        0
      );
      const totalAmountCents = Math.round(totalAmount * 100);
      const remainderCents = totalAmountCents - currentTotalCents;

      preliminarySplits.sort(
        (a, b) =>
          b.amount - Math.floor(b.amount) - (a.amount - Math.floor(a.amount))
      );

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

      let calculatedSumCents = 0;
      preliminarySplits = inputSplits
        .filter((s) => s.shares !== undefined && s.shares > 0)
        .map((split) => {
          const shareAmount = totalAmount * (split.shares! / totalShares);
          calculatedSumCents += Math.round(shareAmount * 100);
          return { user_id: split.user_id, amount: shareAmount };
        });

      const totalAmountCents = Math.round(totalAmount * 100);
      const remainderCents = totalAmountCents - calculatedSumCents;

      preliminarySplits.sort(
        (a, b) =>
          b.amount - Math.floor(b.amount) - (a.amount - Math.floor(a.amount))
      );

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

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const expense = queryRunner.manager.create(Expense, {
        description,
        amount: totalAmount,
        transaction_date,
        group_id: groupId,
        paid_by_user_id: paidByUserId,
      });
      const savedExpense = await queryRunner.manager.save(Expense, expense);

      const splitPromises = validatedSplitsData.map((splitData) => {
        const split = queryRunner.manager.create(ExpenseSplit, {
          expense_id: savedExpense.id,
          owed_by_user_id: splitData.user_id,
          amount: splitData.amount,
        });
        return queryRunner.manager.save(ExpenseSplit, split);
      });
      await Promise.all(splitPromises);

      await queryRunner.commitTransaction();
      return savedExpense;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error("Transaction failed in createExpense:", err);
      throw new InternalServerErrorException(
        "Failed to create expense due to a transaction error."
      );
    } finally {
      await queryRunner.release();
    }
  }

  //* --- FIND All Expenses for a Group ---
  async findAllForGroup(
    groupId: string,
    requestingUserId: string
  ): Promise<Expense[]> {
    try {
      await this.groupsService.findOneById(groupId, requestingUserId);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException("Could not verify group access.");
    }

    return this.expenseRepository.find({
      where: { group_id: groupId },
      withDeleted: true,
      relations: {
        paidBy: true,
      },
      order: {
        deletedAt: "ASC",
        transaction_date: "DESC",
        createdAt: "DESC",
      },
    });
  }

  //* --- DELETE Expense ---
  async removeExpense(
    expenseId: string,
    requestingUserId: string
  ): Promise<void> {
    const expense = await this.expenseRepository.findOne({
      where: { id: expenseId },

      select: ["id", "group_id", "paid_by_user_id"],
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID "${expenseId}" not found.`);
    }

    const canAccess = await this.groupsService.isMember(
      expense.group_id,
      requestingUserId
    );
    if (!canAccess) {
      throw new ForbiddenException(
        "You do not have permission to delete expenses in this group."
      );
    }

    const deleteResult = await this.expenseRepository.delete({ id: expenseId });

    if (deleteResult.affected === 0) {
      throw new NotFoundException(
        `Expense with ID "${expenseId}" could not be deleted.`
      );
    }
  }

  //* --- Soft DELETE Expense ---
  async softRemoveExpense(
    expenseId: string,
    requestingUserId: string
  ): Promise<void> {
    const expense = await this.expenseRepository.findOne({
      where: { id: expenseId },
      select: ["id", "group_id", "paid_by_user_id"],
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID "${expenseId}" not found.`);
    }

    if (expense.paid_by_user_id !== requestingUserId) {
      throw new ForbiddenException(
        "Only the user who paid for the expense can delete it."
      );
    }

    const deleteResult = await this.expenseRepository.softDelete({
      id: expenseId,
    });

    if (deleteResult.affected === 0) {
      throw new NotFoundException(
        `Expense with ID "${expenseId}" could not be soft-deleted.`
      );
    }
  }

  //* --- UPDATE Expense ---
  async updateExpense(
    expenseId: string,
    requestingUserId: string,
    updateExpenseDto: UpdateExpenseDto
  ): Promise<Expense> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let updatedExpense: Expense;

    try {
      const expense = await queryRunner.manager.findOne(Expense, {
        where: { id: expenseId },
        relations: ["group"],
      });

      if (!expense) {
        throw new NotFoundException(
          `Expense with ID "${expenseId}" not found.`
        );
      }

      if (expense.deletedAt) {
        throw new BadRequestException(`Cannot edit a deleted expense.`);
      }

      if (expense.paid_by_user_id !== requestingUserId) {
        throw new ForbiddenException(
          "Only the user who paid for the expense can edit it."
        );
      }

      const newTotalAmount = updateExpenseDto.amount ?? expense.amount;
      const newSplitType = updateExpenseDto.split_type ?? expense.split_type;
      const newSplitsInput = updateExpenseDto.splits;

      const needsSplitRecalculation =
        updateExpenseDto.amount !== undefined ||
        updateExpenseDto.split_type !== undefined ||
        (newSplitType !== SplitType.EQUAL &&
          updateExpenseDto.splits !== undefined);

      let validatedSplitsData: { user_id: string; amount: number }[] = [];

      if (needsSplitRecalculation) {
        const members = await this.groupsService.findGroupMembers(
          expense.group_id,
          requestingUserId
        );
        const memberIds = new Set(members.map((m) => m.user_id));

        if (newSplitType === SplitType.EQUAL) {
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

          validatedSplitsData = newSplitsInput
            .filter((s) => s.amount! > 0.005)
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
          );
          validatedSplitsData = this.distributeRemainder(
            preliminarySplits,
            remainderCents
          ).filter((s) => s.amount > 0.005);
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
          );
          validatedSplitsData = this.distributeRemainder(
            preliminarySplits,
            remainderCents
          ).filter((s) => s.amount > 0.005);
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

      const expenseUpdateData: Partial<Expense> = {};
      if (updateExpenseDto.description !== undefined)
        expenseUpdateData.description = updateExpenseDto.description;
      if (updateExpenseDto.amount !== undefined)
        expenseUpdateData.amount = updateExpenseDto.amount;
      if (updateExpenseDto.transaction_date !== undefined)
        expenseUpdateData.transaction_date = updateExpenseDto.transaction_date;
      if (updateExpenseDto.split_type !== undefined)
        expenseUpdateData.split_type = updateExpenseDto.split_type;

      await queryRunner.manager.update(Expense, expenseId, expenseUpdateData);

      if (needsSplitRecalculation) {
        await queryRunner.manager.delete(ExpenseSplit, {
          expense_id: expenseId,
        });

        const newSplitEntities = validatedSplitsData.map((splitData) =>
          queryRunner.manager.create(ExpenseSplit, {
            expense_id: expenseId,
            owed_by_user_id: splitData.user_id,
            amount: splitData.amount,
          })
        );
        await queryRunner.manager.save(ExpenseSplit, newSplitEntities);
      }

      await queryRunner.commitTransaction();

      updatedExpense = await this.expenseRepository.findOneOrFail({
        where: { id: expenseId },
        relations: ["paidBy"],
      });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error("Transaction failed in updateExpense:", err);

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
      await queryRunner.release();
    }

    return updatedExpense;
  }
}
