import {
  BadRequestException,
  ForbiddenException, // Import Inject
  forwardRef,
  Inject,
  Injectable, // Import forwardRef
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm'; // Import DataSource
import { GroupMember } from '../groups/entities/group-member.entity'; // Import GroupMember
import { GroupsService } from '../groups/groups.service'; // Import GroupsService
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseSplit } from './entities/expense-split.entity';
import { Expense } from './entities/expense.entity';

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
    private readonly dataSource: DataSource,
  ) { }

  // --- CREATE EXPENSE (with Equal Split) ---
  async createExpense(
    createExpenseDto: CreateExpenseDto,
    groupId: string,
    paidByUserId: string,
  ): Promise<Expense> {
    // 1. Verify group exists and the payer is a member (also fetches members)
    let members: GroupMember[];
    try {
      // We need the user details within members for their IDs
      members = await this.groupsService.findGroupMembers(groupId, paidByUserId);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error; // Re-throw auth/not found errors
      }
      throw new InternalServerErrorException('Could not verify group membership.');
    }

    if (!members || members.length === 0) {
      throw new BadRequestException('Cannot add expense to a group with no members.');
    }

    const numberOfMembers = members.length;
    const totalAmount = createExpenseDto.amount;

    // Calculate equal split amount (handle potential floating point issues carefully)
    // Using Math.round avoids tiny fractions, but sum might be off by a cent.
    // Alternative: Calculate all but last, then assign remainder to last person.
    // Let's use simple division and rely on DB NUMERIC type for now.
    const splitAmount = parseFloat((totalAmount / numberOfMembers).toFixed(2));

    // 2. Use a Database Transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 3. Create the Expense record using the queryRunner's manager
      const expense = queryRunner.manager.create(Expense, {
        ...createExpenseDto,
        group_id: groupId,
        paid_by_user_id: paidByUserId,
        // Amount is already number from DTO/transformer
      });
      const savedExpense = await queryRunner.manager.save(Expense, expense);

      // 4. Create ExpenseSplit records for each member
      const splitPromises = members.map((member) => {
        const split = queryRunner.manager.create(ExpenseSplit, {
          expense_id: savedExpense.id,
          owed_by_user_id: member.user_id, // Get user ID from member object
          amount: splitAmount, // Assign the calculated equal share
        });
        return queryRunner.manager.save(ExpenseSplit, split);
      });
      await Promise.all(splitPromises); // Wait for all splits to be saved

      // 5. Commit the transaction
      await queryRunner.commitTransaction();
      return savedExpense; // Return the main expense record

    } catch (err) {
      // 6. Rollback transaction on error
      await queryRunner.rollbackTransaction();
      console.error("Transaction failed:", err); // Log the detailed error
      throw new InternalServerErrorException('Failed to create expense due to a transaction error.');
    } finally {
      // 7. Release the queryRunner
      await queryRunner.release();
    }
  }

  // --- FIND All Expenses for a Group ---
  async findAllForGroup(groupId: string, requestingUserId: string): Promise<Expense[]> {
    // 1. Verify group exists and user has access (implicitly checks membership)
    try {
      await this.groupsService.findOneById(groupId, requestingUserId);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error; // Re-throw auth/not found errors
      }
      throw new InternalServerErrorException('Could not verify group access.');
    }

    // 2. Fetch expenses, ordered by date, include payer details
    return this.expenseRepository.find({
      where: { group_id: groupId },
      relations: {
        paidBy: true, // Load the User object associated with paidBy
        // splits: { owedBy: true } // Optionally load splits and their users if needed immediately
      },
      order: {
        transaction_date: 'DESC', // Show newest expenses first
        createdAt: 'DESC',
      },
    });
  }

  // --- Add Update / Delete methods later ---

}
