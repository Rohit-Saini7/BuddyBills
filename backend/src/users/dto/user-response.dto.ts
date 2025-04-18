import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  name: string;

  @Expose()
  avatar_url: string;

  @Expose()
  createdAt: Date;

  // We explicitly DO NOT Expose google_id or updatedAt unless needed
}
