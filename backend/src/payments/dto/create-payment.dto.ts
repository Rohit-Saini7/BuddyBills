import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
} from 'class-validator';

export class CreatePaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Amount must be a number with up to 2 decimal places' })
  @IsPositive({ message: 'Amount must be positive' })
  @IsNotEmpty()
  amount: number;

  @IsUUID('4', { message: 'Paid-to user ID must be a valid UUID' }) // Ensure it's a UUID v4
  @IsNotEmpty()
  paid_to_user_id: string; // ID of the user receiving the payment

  @IsOptional() // Make optional, default to today if not provided
  @IsDateString({}, { message: 'Payment date must be a valid date string (YYYY-MM-DD)' })
  payment_date?: string;

  // Note: group_id will typically come from URL param (e.g., POST /api/groups/:groupId/payments)
  // Note: paid_by_user_id will typically come from the authenticated user (`req.user.userId`)
}
