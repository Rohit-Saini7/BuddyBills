// backend/src/payments/dto/payment-response.dto.ts
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class PaymentResponseDto {
  @Expose()
  id: string;

  @Expose()
  group_id: string;

  @Expose()
  paid_by_user_id: string;

  @Expose()
  paid_to_user_id: string;

  @Expose()
  amount: number; // Already transformed

  @Expose()
  payment_date: string; // String from entity

  @Expose()
  createdAt: Date;

  // Optional: Expose related users
  // @Expose()
  // @Type(() => UserResponseDto)
  // paidBy: UserResponseDto;

  // @Expose()
  // @Type(() => UserResponseDto)
  // paidTo: UserResponseDto;
}
