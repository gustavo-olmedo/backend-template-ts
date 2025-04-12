import { IsEmail, IsNotEmpty } from 'class-validator';

export class UserUpdateDto {
  @IsNotEmpty()
  firstName: string;
  @IsNotEmpty()
  lastName: string;
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
