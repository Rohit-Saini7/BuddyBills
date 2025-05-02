import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Expense } from "./expense.entity";

@Entity("expense_splits")
@Unique(["expense_id", "owed_by_user_id"])
export class ExpenseSplit {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  expense_id: string;

  @Column({ type: "uuid" })
  owed_by_user_id: string;

  @Column({
    type: "numeric",
    precision: 10,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  amount: number;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;

  //* --- Relationships ---

  @ManyToOne(() => Expense, (expense) => expense.splits, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "expense_id" })
  expense: Expense;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "owed_by_user_id" })
  owedBy: User;
}
