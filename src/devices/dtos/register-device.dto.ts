import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class RegisterDeviceDto {
  @IsUUID() appInstanceId!: string;
  @IsIn(['ios', 'android', 'web']) platform!: 'ios' | 'android' | 'web';
  @IsOptional() @IsString() pushToken?: string;
  @IsOptional() @IsString() locale?: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() osVersion?: string;
  @IsOptional() @IsString() appVersion?: string;
}
