import { IsOptional, IsString, IsIn } from 'class-validator';

export class LoginSSODto {
  @IsString() idToken?: string;

  @IsOptional() @IsString() appInstanceId?: string; // Id from client
  @IsOptional() @IsIn(['ios', 'android', 'web']) platform?:
    | 'ios'
    | 'android'
    | 'web';

  @IsOptional() @IsString() pushToken?: string;
  @IsOptional() @IsString() locale?: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() osVersion?: string;
  @IsOptional() @IsString() appVersion?: string;
}
