import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ExpenseSplitInputDto } from 'src/expenses/dto/expense-split-input.dto';
import { SplitType } from 'src/expenses/dto/expense-split.type';

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Amount must be a number with up to 2 decimal places' })
  @IsPositive({ message: 'Amount must be positive' })
  @IsNotEmpty()
  amount: number; // Matches the 'number' type used in the entity transformer

  @IsDateString({}, { message: 'Transaction date must be a valid date string (YYYY-MM-DD)' })
  @IsNotEmpty()
  transaction_date: string; // Matches the 'string' type from the entity

  // Note: group_id will typically come from URL param (e.g., POST /api/groups/:groupId/expenses)
  // Note: paid_by_user_id will typically come from the authenticated user (`req.user.userId`)
  // Note: For MVP equal split, we don't need participants list in DTO

  @IsEnum(SplitType)
  @IsNotEmpty()
  split_type: SplitType = SplitType.EQUAL;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true }) // Validate each object in the array
  @Type(() => ExpenseSplitInputDto) // Tell class-transformer to use this type for validation
  splits?: ExpenseSplitInputDto[]; // Array of { user_id: string, amount: number } for EXACT splits

}
