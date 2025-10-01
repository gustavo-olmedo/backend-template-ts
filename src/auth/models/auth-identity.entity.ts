import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/models/user.entity';

export type AuthProvider = 'password' | 'google' | 'apple' | 'github';

@Entity('auth_identities')
@Unique(['provider', 'providerUid'])
@Unique(['user', 'provider'])
export class AuthIdentity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  user: User;

  @Column({ type: 'varchar', length: 32 })
  provider: AuthProvider;

  @Column({ type: 'text' })
  providerUid: string; // email para 'password', sub de Google para 'google'

  @Column({ type: 'text', nullable: true, select: false })
  passwordHash?: string | null; // solo para provider='password'

  @Column({ type: 'timestamptz', nullable: true })
  emailVerifiedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt?: Date | null;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
