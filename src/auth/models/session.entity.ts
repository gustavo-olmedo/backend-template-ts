import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/models/user.entity';

@Entity('sessions')
@Index(['user', 'revokedAt', 'expiresAt'])
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  user: User;

  @Column({ type: 'text', unique: true, select: false })
  refreshTokenHash: string;

  @Column({ type: 'inet', nullable: true }) ip?: string;
  @Column({ type: 'text', nullable: true }) userAgent?: string;

  @CreateDateColumn() createdAt: Date;
  @Column({ type: 'timestamptz' }) expiresAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) revokedAt?: Date | null;
}
