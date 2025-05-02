export enum SplitType {
  EQUAL = "EQUAL",
  EXACT = "EXACT",
  PERCENTAGE = "PERCENTAGE",
  SHARE = "SHARE",
}

export enum MemberRemovalType {
  REMOVED_BY_CREATOR = "REMOVED_BY_CREATOR",
  LEFT_VOLUNTARILY = "LEFT_VOLUNTARILY",
}

export interface UserResponseDto {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

export interface GroupMemberResponseDto {
  id: string;
  user_id: string;
  group_id: string;
  joinedAt: string;
  user: UserResponseDto;
  deletedAt?: string | null;
  removalType?: MemberRemovalType | null;
  removedByUserId?: string | null;
}

export interface UpdateGroupDto {
  name: string;
}

export interface GroupResponseDto {
  id: string;
  name: string;
  created_by_user_id: string;
  createdAt: string;
  deletedAt?: string | null;
}

export interface CreateExpenseDto {
  description: string;
  amount: number;
  transaction_date: string;
}

export interface ExpenseResponseDto {
  id: string;
  group_id: string;
  paid_by_user_id: string;
  description: string;
  amount: number;
  transaction_date: string;
  createdAt: string;
  paidBy: UserResponseDto;
  deletedAt: string | null;
  split_type?: SplitType;
}

export interface BalanceResponseDto {
  user: UserResponseDto;
  netBalance: number; //? Positive: User is owed; Negative: User owes
}

//
export interface CreatePaymentDto {
  amount: number;
  paid_to_user_id: string;
  payment_date?: string;
}

export interface PaymentResponseDto {
  id: string;
  group_id: string;
  paid_by_user_id: string;
  paid_to_user_id: string;
  amount: number;
  payment_date: string;
  createdAt: string;
  //* paidBy?: UserResponseDto; //? Add if backend includes this relation
  //* paidTo?: UserResponseDto; //? Add if backend includes this relation
}

export interface ExpenseSplitInputDto {
  user_id: string;
  amount?: number;
  percentage?: number;
  shares?: number;
}

export interface CreateExpenseDto {
  description: string;
  amount: number;
  transaction_date: string;
  split_type: SplitType;
  splits?: ExpenseSplitInputDto[];
}

export interface UpdateExpenseDto {
  description?: string;
  amount?: number;
  transaction_date?: string;
  split_type?: SplitType;
  splits?: ExpenseSplitInputDto[];
}
