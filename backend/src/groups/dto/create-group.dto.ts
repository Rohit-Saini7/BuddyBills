import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateGroupDto {
  @IsString({ message: 'Group name must be a string' })
  @IsNotEmpty({ message: 'Group name cannot be empty' })
  @MaxLength(100, { message: 'Group name cannot be longer than 100 characters' })
  name: string;
}
