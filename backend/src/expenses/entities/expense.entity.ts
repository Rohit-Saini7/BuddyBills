import { SplitType } from "src/expenses/dto/expense-split.type";
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Group } from "../../groups/entities/group.entity";
import { User } from "../../users/entities/user.entity";
import { ExpenseSplit } from "./expense-split.entity";

@Entity("expenses")
export class Expense {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  group_id: string;

  @Column({ type: "uuid" })
  paid_by_user_id: string;

  @Column({ type: "varchar", length: 255 })
  description: string;

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

  @Column({ type: "date" })
  transaction_date: string;

  @Column({
    type: "enum",
    enum: SplitType,
    default: SplitType.EQUAL,
  })
  split_type: SplitType;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updatedAt: Date;

  @DeleteDateColumn({ type: "timestamp with time zone", nullable: true })
  deletedAt?: Date | null;

  //* --- Relationships ---

  @ManyToOne(() => Group, (group) => group.expenses, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "group_id" })
  group: Group;

  @ManyToOne(() => User, (user) => user.paidExpenses, {
    nullable: false,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "paid_by_user_id" })
  paidBy: User;

  @OneToMany(() => ExpenseSplit, (split) => split.expense)
  splits: ExpenseSplit[];
}
