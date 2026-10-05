import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
export enum PublicationStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}
@Entity('sermons')
export class Sermon {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 180 }) title: string;
  @Column({ type: 'varchar', length: 140 }) speaker: string;
  @Column({ type: 'date' }) date: string;
  @Column({ type: 'varchar', length: 300, nullable: true }) scripture: string | null;
  @Column({ type: 'varchar', length: 100 }) category: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'text', nullable: true }) audioUrl: string | null;
  @Column({ type: 'text', nullable: true }) videoUrl: string | null;
  @Column({
    type: 'enum',
    enum: PublicationStatus,
    default: PublicationStatus.DRAFT,
  })
  status: PublicationStatus;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}
