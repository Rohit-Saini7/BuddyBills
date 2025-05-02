import { Exclude, Expose } from "class-transformer";

@Exclude()
export class GroupResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  created_by_user_id: string;

  @Expose()
  createdAt: Date;
}
