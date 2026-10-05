import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AuthProvider, UserStatus } from '../../../../utils/enums';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 254, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 140 })
  fullName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  password: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  avatar: string | null;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.pending,
  })
  status: UserStatus;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.local,
  })
  provider: AuthProvider;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastLogin: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
