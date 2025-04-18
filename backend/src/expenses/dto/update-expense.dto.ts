import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty() // Keep NotEmpty even if optional, so if provided, it's not empty
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Amount must be a number with up to 2 decimal places' })
  @IsPositive({ message: 'Amount must be positive' })
  @IsNotEmpty()
  amount?: number;

  @IsOptional()
  @IsDateString({}, { message: 'Transaction date must be a valid date string (YYYY-MM-DD)' })
  @IsNotEmpty()
  transaction_date?: string;

  // Cannot typically change group_id or paid_by_user_id easily via update
}
