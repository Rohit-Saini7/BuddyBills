import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
} from "class-validator";

export class CreatePaymentDto {
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: "Amount must be a number with up to 2 decimal places" }
  )
  @IsPositive({ message: "Amount must be positive" })
  @IsNotEmpty()
  amount: number;

  @IsUUID("4", { message: "Paid-to user ID must be a valid UUID" })
  @IsNotEmpty()
  paid_to_user_id: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: "Payment date must be a valid date string (YYYY-MM-DD)" }
  )
  payment_date?: string;
}
