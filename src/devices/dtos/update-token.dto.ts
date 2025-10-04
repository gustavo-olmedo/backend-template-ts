import { IsOptional, IsString } from 'class-validator';

export class UpdateTokenDto {
  @IsOptional() @IsString() pushToken?: string;
}
