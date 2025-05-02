import { Exclude, Expose } from "class-transformer";

@Exclude() //? Exclude all fields by default
export class AuthResponseDto {
  @Expose() //? Expose only the fields you want to include in the response
  accessToken: string;
}
