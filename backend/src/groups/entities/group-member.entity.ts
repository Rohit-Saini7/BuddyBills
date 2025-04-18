import { User } from "../../users/entities/user.entity";
import { Group } from "./group.entity";
import {
  CreateDateColumn, // Use CreateDateColumn for consistency if needed
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
  Column, // Import Column
  Unique, // Import Unique
} from "typeorm";

@Entity("group_members")
@Unique(["user_id", "group_id"]) // Match UNIQUE constraint in SQL
export class GroupMember {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" }) // Explicit FK column
  user_id: string;

  @Column({ type: "uuid" }) // Explicit FK column
  group_id: string;

  @CreateDateColumn({ name: "joined_at", type: "timestamp with time zone" }) // Match column name
  joinedAt: Date;

  // --- Relationships ---

  @ManyToOne(() => User, (user) => user.groupMemberships, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Group, (group) => group.members, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "group_id" })
  group: Group;
}
