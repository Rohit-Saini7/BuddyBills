import { Exclude, Expose } from 'class-transformer';

@Exclude() // Exclude all fields by default
export class AuthResponseDto {
  @Expose() // Expose only this field
  accessToken: string;

  // You might also expose basic user info here if desired
}
