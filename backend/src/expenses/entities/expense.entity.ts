import { SplitType } from 'src/expenses/dto/expense-split.type';
import {
  Column,
  CreateDateColumn,
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

  @Column({ type: "uuid" }) // Explicit FK column
  group_id: string;

  @Column({ type: "uuid" }) // Explicit FK column
  paid_by_user_id: string;

  @Column({ type: "varchar", length: 255 })
  description: string;

  @Column({
    type: "numeric",
    precision: 10,
    scale: 2,
    transformer: {
      // Handle NUMERIC conversion
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  amount: number; // Use number in TS, TypeORM handles DB NUMERIC via transformer

  @Column({ type: "date" }) // Use 'date' type
  transaction_date: string; // TypeORM often maps DATE to string

  @Column({
    type: 'enum',
    enum: SplitType,
    default: SplitType.EQUAL, // Set default if desired
  })
  split_type: SplitType;


  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updatedAt: Date;

  // --- Relationships ---

  @ManyToOne(() => Group, (group) => group.expenses, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "group_id" })
  group: Group;

  @ManyToOne(() => User, (user) => user.paidExpenses, {
    nullable: false,
    onDelete: "RESTRICT",
  }) // Match SQL ON DELETE
  @JoinColumn({ name: "paid_by_user_id" })
  paidBy: User;

  @OneToMany(() => ExpenseSplit, (split) => split.expense)
  splits: ExpenseSplit[];
}
