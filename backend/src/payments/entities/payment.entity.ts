import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Group } from "../../groups/entities/group.entity";
import { User } from "../../users/entities/user.entity";

@Entity("payments")
export class Payment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  group_id: string;

  @Column({ type: "uuid" })
  paid_by_user_id: string;

  @Column({ type: "uuid" })
  paid_to_user_id: string;

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
  payment_date: string;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;

  //* --- Relationships ---

  @ManyToOne(() => Group, (group) => group.payments, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "group_id" })
  group: Group;

  @ManyToOne(() => User, (user) => user.paymentsMade, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "paid_by_user_id" })
  paidBy: User;

  @ManyToOne(() => User, (user) => user.paymentsReceived, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "paid_to_user_id" })
  paidTo: User;
}
