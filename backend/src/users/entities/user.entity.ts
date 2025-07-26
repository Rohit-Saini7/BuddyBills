import { GroupMember } from "src/groups/entities/group-member.entity";
import { UserIdentity } from "src/users/entities/user-identity.entity";
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Expense } from "../../expenses/entities/expense.entity";
import { Group } from "../../groups/entities/group.entity";
import { Payment } from "../../payments/entities/payment.entity";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  name: string;

  @Column({ type: "text", nullable: true })
  avatar_url: string;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updatedAt: Date;

  //* --- Relationships ---

  //? Identities linked to this user (e.g., Google, Github)
  @OneToMany(() => UserIdentity, (identity) => identity.user)
  identities: UserIdentity[];

  //? Groups created by this user
  @OneToMany(() => Group, (group) => group.createdBy)
  createdGroups: Group[];

  //? Memberships this user has in groups
  @OneToMany(() => GroupMember, (member) => member.user)
  groupMemberships: GroupMember[];

  //? Expenses paid by this user
  @OneToMany(() => Expense, (expense) => expense.paidBy)
  paidExpenses: Expense[];

  //? Payments made by this user
  @OneToMany(() => Payment, (payment) => payment.paidBy)
  paymentsMade: Payment[];

  //? Payments received by this user
  @OneToMany(() => Payment, (payment) => payment.paidTo)
  paymentsReceived: Payment[];
}
