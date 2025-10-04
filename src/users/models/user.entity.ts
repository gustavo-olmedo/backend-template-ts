import { Exclude } from 'class-transformer';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from '../../roles/models/role.entity';
import { AuthIdentity } from '../../auth/models/auth-identity.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() firstName: string;
  @Column() lastName: string;

  @Column({ unique: true }) email: string;

  @Column({ nullable: true }) avatarUrl?: string;
  @Column({ nullable: true }) avatarPublicId?: string;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @OneToMany(() => AuthIdentity, (ai) => ai.user)
  identities: AuthIdentity[];
}
