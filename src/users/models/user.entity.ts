import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Role } from '../../roles/models/role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;
  @Column()
  firstName: string;
  @Column()
  lastName: string;
  @Column({ unique: true })
  email: string;
  @Column()
  @Exclude()
  password: string;

  @Column({ nullable: true })
  avatarUrl?: string;
  @Column({ nullable: true })
  avatarPublicId?: string;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'roleUUID' })
  role: Role;
}
