import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class GroupResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  created_by_user_id: string; // Expose the ID

  // Optional: Expose the nested creator object, transformed to UserResponseDto
  // @Expose()
  // @Type(() => UserResponseDto)
  // createdBy: UserResponseDto;

  @Expose()
  createdAt: Date;

  // Exclude members, expenses, payments by default for list/detail views
  // Specific endpoints could return DTOs that *do* expose these (e.g., GetGroupDetailsDto)
}
