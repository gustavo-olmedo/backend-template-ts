import { Permission } from '../../permissions/models/permission.entity';
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column()
  name: string;

  @ManyToMany(() => Permission, { cascade: true })
  @JoinTable({
    name: 'rolePermissions',
    joinColumn: { name: 'roleUUID', referencedColumnName: 'uuid' },
    inverseJoinColumn: { name: 'permissionUUID', referencedColumnName: 'uuid' },
  })
  permissions: Permission[];
}
