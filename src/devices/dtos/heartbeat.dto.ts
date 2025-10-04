import { IsUUID } from 'class-validator';

export class HeartbeatDto {
  @IsUUID() appInstanceId!: string;
}
