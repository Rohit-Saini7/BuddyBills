import { AuthProvider } from "src/users/dto/auth-provider.enum";
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { User } from "./user.entity";

//? Ensures a provider/provider_id combination is unique
@Unique(["provider", "provider_id"])
@Entity("user_identities")
export class UserIdentity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "enum",
    enum: AuthProvider,
    default: AuthProvider.GOOGLE,
  })
  provider: AuthProvider;

  @Column({ type: "varchar", length: 255 })
  provider_id: string;

  //* --- Relationships ---
  @ManyToOne(() => User, (user) => user.identities, {
    onDelete: "CASCADE",
  })
  user: User;
}
