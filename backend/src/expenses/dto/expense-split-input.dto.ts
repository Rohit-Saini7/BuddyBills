import { IsNotEmpty, IsNumber, IsPositive, IsUUID } from 'class-validator';

export class ExpenseSplitInputDto {
  @IsUUID('4')
  @IsNotEmpty()
  user_id: string; // The user this split portion belongs to

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive() // Exact amounts must be positive, use 0 via exclusion if needed
  @IsNotEmpty()
  amount: number; // The specific amount this user owes for this expense
}
