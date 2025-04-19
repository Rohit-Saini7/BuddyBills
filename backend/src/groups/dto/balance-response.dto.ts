import { Exclude, Expose, Type } from 'class-transformer';
import { UserResponseDto } from '../../users/dto/user-response.dto'; // Import UserResponseDto

@Exclude()
export class BalanceResponseDto {
  // No need to expose internal user ID usually
  // @Expose()
  // userId: string;

  // Expose basic user details
  @Expose()
  @Type(() => UserResponseDto) // Transform nested user object
  user: UserResponseDto;

  @Expose()
  netBalance: number; // Positive: User is owed; Negative: User owes

  // Optional: Add breakdown (total spent, total share, etc.) if needed later
}
