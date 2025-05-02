import { Exclude, Expose, Type } from "class-transformer";
import { UserResponseDto } from "../../users/dto/user-response.dto";

@Exclude()
export class GroupMemberResponseDto {
  @Expose()
  id: string;

  @Expose()
  user_id: string;

  @Expose()
  group_id: string;

  @Expose()
  joinedAt: Date;

  @Expose()
  @Type(() => UserResponseDto)
  user: UserResponseDto;
}
