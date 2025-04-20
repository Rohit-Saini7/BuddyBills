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
import { Expense } from "../../expenses/entities/expense.entity";
import { Payment } from "../../payments/entities/payment.entity";
import { User } from "../../users/entities/user.entity";
import { GroupMember } from "./group-member.entity";

@Entity("groups")
export class Group {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 100 })
  name: string;

  // Keep the explicit column for the foreign key ID
  @Column({ type: "uuid" })
  created_by_user_id: string;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp with time zone', nullable: true })
  deletedAt?: Date | null;


  // --- Relationships ---

  @ManyToOne(() => User, (user) => user.createdGroups, {
    nullable: false,
    onDelete: "SET NULL",
  }) // Match SQL ON DELETE
  @JoinColumn({ name: "created_by_user_id" }) // Links the FK column
  createdBy: User;

  @OneToMany(() => GroupMember, (member) => member.group)
  members: GroupMember[];

  @OneToMany(() => Expense, (expense) => expense.group)
  expenses: Expense[];

  @OneToMany(() => Payment, (payment) => payment.group)
  payments: Payment[];
}
