import { Exclude, Expose } from "class-transformer";

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
  amount: number;

  @Expose()
  payment_date: string;

  @Expose()
  createdAt: Date;

  //[]: Optional: Expose related users
  /* @Expose()
  @Type(() => UserResponseDto)
  paidBy: UserResponseDto;

  @Expose()
  @Type(() => UserResponseDto)
  paidTo: UserResponseDto; */
}
