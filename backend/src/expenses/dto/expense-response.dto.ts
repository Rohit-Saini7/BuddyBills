import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ExpenseResponseDto {
  @Expose()
  id: string;

  @Expose()
  group_id: string;

  @Expose()
  paid_by_user_id: string;

  @Expose()
  description: string;

  @Expose()
  amount: number; // Already transformed to number by entity transformer

  @Expose()
  transaction_date: string; // String from entity

  @Expose()
  createdAt: Date;

  // Optional: Expose related data if needed for specific endpoints
  // @Expose()
  // @Type(() => UserResponseDto)
  // paidBy: UserResponseDto;

  // @Expose()
  // @Type(() => ExpenseSplitResponseDto)
  // splits: ExpenseSplitResponseDto[];
}
