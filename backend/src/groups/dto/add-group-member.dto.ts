import { IsEmail, IsNotEmpty } from 'class-validator';

export class AddGroupMemberDto {
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty({ message: 'Email cannot be empty' })
  email: string; // We'll use this email to find the user ID
}
