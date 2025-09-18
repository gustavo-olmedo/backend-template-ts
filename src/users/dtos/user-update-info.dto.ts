import { IsEmail, IsNotEmpty } from 'class-validator';

export class UserUpdateInfoDto {
  @IsNotEmpty()
  firstName: string;
  @IsNotEmpty()
  lastName: string;
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
