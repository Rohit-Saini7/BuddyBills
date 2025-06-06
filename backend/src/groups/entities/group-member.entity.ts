import { MemberRemovalType } from "src/groups/dto/member-removal-type.enum";
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Group } from "./group.entity";

@Entity("group_members")
@Unique(["user_id", "group_id"])
export class GroupMember {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  user_id: string;

  @Column({ type: "uuid" })
  group_id: string;

  @CreateDateColumn({ name: "joined_at", type: "timestamp with time zone" })
  joinedAt: Date;

  @DeleteDateColumn({
    name: "deleted_at",
    type: "timestamp with time zone",
    nullable: true,
  })
  deletedAt?: Date | null;

  @Column({
    name: "removal_type",
    type: "enum",
    enum: MemberRemovalType,
    nullable: true,
  })
  removalType?: MemberRemovalType | null;

  @Column({ name: "removed_by_user_id", type: "uuid", nullable: true })
  removedByUserId?: string | null;

  //* --- Relationships ---

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

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "removed_by_user_id" })
  removedBy: User | null;
}
