import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  Min,
} from "class-validator";

export class ExpenseSplitInputDto {
  @IsUUID("4")
  @IsNotEmpty()
  user_id: string;

  // Used for EXACT splits
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive() // If provided for exact, must be positive
  amount?: number;

  // Used for PERCENTAGE splits
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 }) // Allow more precision for percentages if needed
  @IsPositive()
  @Min(0.0001) // Percentage must be greater than 0 if provided
  percentage?: number;

  // Used for SHARE splits
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 }) // Allow fractional shares if needed
  @IsPositive()
  @Min(0.0001) // Shares must be greater than 0 if provided
  shares?: number;
}
