import { Expense } from "./expense.entity";
import { User } from "../../users/entities/user.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
  Unique, // Import Unique
} from "typeorm";

@Entity("expense_splits")
@Unique(["expense_id", "owed_by_user_id"]) // Match UNIQUE constraint
export class ExpenseSplit {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" }) // Explicit FK column
  expense_id: string;

  @Column({ type: "uuid" }) // Explicit FK column
  owed_by_user_id: string;

  @Column({
    type: "numeric",
    precision: 10,
    scale: 2,
    transformer: {
      // Handle NUMERIC
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  amount: number;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;

  // --- Relationships ---

  @ManyToOne(() => Expense, (expense) => expense.splits, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "expense_id" })
  expense: Expense;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" }) // No inverse relation needed on User typically
  @JoinColumn({ name: "owed_by_user_id" })
  owedBy: User;
}
