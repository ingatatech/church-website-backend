import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
@Entity('audit_logs')
@Index(['event', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 80 }) event: string;
  @Column({ type: 'varchar', length: 36, nullable: true }) actorId:
    string | null;
  @Column({ type: 'jsonb', default: {} }) details: Record<string, unknown>;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
