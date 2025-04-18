import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateGroupDto {
  @IsOptional() // Make fields optional for PATCH requests
  @IsString({ message: 'Group name must be a string' })
  @MaxLength(100, { message: 'Group name cannot be longer than 100 characters' })
  name?: string; // The '?' marks it as optional in TypeScript
}
