import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
export const SUBMISSION_TYPES = ['contact', 'prayer', 'visitor'] as const;
export type SubmissionType = (typeof SUBMISSION_TYPES)[number];
@Entity('visitor_submissions')
@Index(['type', 'createdAt'])
export class Submission {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 16 }) type: SubmissionType;
  @Column({ type: 'varchar', length: 140 }) name: string;
  @Column({ type: 'varchar', length: 254 }) email: string;
  @Column({ type: 'varchar', length: 40, nullable: true }) phone: string | null;
  @Column({ type: 'text' }) message: string;
  @Column({ type: 'varchar', length: 20, default: 'new' }) status: string;
  @CreateDateColumn() createdAt: Date;
}
