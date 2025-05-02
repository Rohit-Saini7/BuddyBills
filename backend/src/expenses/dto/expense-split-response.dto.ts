import { Exclude, Expose } from "class-transformer";

@Exclude()
export class ExpenseSplitResponseDto {
  @Expose()
  id: string;

  @Expose()
  expense_id: string;

  @Expose()
  owed_by_user_id: string;

  @Expose()
  amount: number;
}
