import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 254, unique: true }) email: string;
  @Column({ type: 'varchar', length: 100 }) passwordHash: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
