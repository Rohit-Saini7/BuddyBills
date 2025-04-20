export enum SplitType {
  EQUAL = 'EQUAL',
  EXACT = 'EXACT',
  PERCENTAGE = 'PERCENTAGE',
  SHARE = 'SHARE',
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
}

export interface UpdateGroupDto {
  name: string;
}

// GroupResponseDto remains the same
export interface GroupResponseDto {
  id: string;
  name: string;
  created_by_user_id: string;
  createdAt: string;
}

export interface CreateExpenseDto {
  description: string;
  amount: number;
  transaction_date: string; // YYYY-MM-DD format
}

export interface ExpenseResponseDto {
  id: string;
  group_id: string;
  paid_by_user_id: string;
  description: string;
  amount: number;
  transaction_date: string; // Comes as string (date part)
  createdAt: string; // Comes as ISO string
  paidBy: UserResponseDto; // Nested payer details
  deletedAt: string | null; // Soft delete field
  split_type?: SplitType;
  // splits?: ExpenseSplitResponseDto[]; // Add later if needed
}

export interface BalanceResponseDto {
  user: UserResponseDto;
  netBalance: number; // Positive: User is owed; Negative: User owes
}

// Matches backend CreatePaymentDto for request body
export interface CreatePaymentDto {
  amount: number;
  paid_to_user_id: string; // UUID of the user receiving payment
  payment_date?: string;   // Optional date string YYYY-MM-DD
}

export interface PaymentResponseDto {
  id: string;
  group_id: string;
  paid_by_user_id: string;
  paid_to_user_id: string;
  amount: number;
  payment_date: string; // Date string
  createdAt: string;    // ISO string
  // paidBy?: UserResponseDto; // Add if backend includes this relation
  // paidTo?: UserResponseDto; // Add if backend includes this relation
}

export interface ExpenseSplitInputDto {
  user_id: string;
  amount?: number;
  percentage?: number;
  shares?: number;

}

export interface CreateExpenseDto {
  description: string;
  amount: number; // Total amount
  transaction_date: string; // YYYY-MM-DD format
  split_type: SplitType; // Now required
  splits?: ExpenseSplitInputDto[]; // Optional array for EXACT/etc. splits
}

export interface UpdateExpenseDto {
  description?: string;
  amount?: number;
  transaction_date?: string; // YYYY-MM-DD format
  split_type?: SplitType;
  splits?: ExpenseSplitInputDto[]; // Array for EXACT splits
}

// Optional: Add ExpenseSplitResponseDto if you load splits
// export interface ExpenseSplitResponseDto { ... }
