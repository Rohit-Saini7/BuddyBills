import { Type } from "class-transformer";
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
} from "class-validator";
import { ExpenseSplitInputDto } from "src/expenses/dto/expense-split-input.dto";
import { SplitType } from "src/expenses/dto/expense-split.type";

export class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: "Amount must be a number with up to 2 decimal places" }
  )
  @IsPositive({ message: "Amount must be positive" })
  @IsNotEmpty()
  amount?: number;

  @IsOptional()
  @IsDateString(
    {},
    { message: "Transaction date must be a valid date string (YYYY-MM-DD)" }
  )
  @IsNotEmpty()
  transaction_date?: string;

  @IsOptional()
  @IsEnum(SplitType)
  @IsNotEmpty()
  split_type?: SplitType;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseSplitInputDto)
  splits?: ExpenseSplitInputDto[];
}
