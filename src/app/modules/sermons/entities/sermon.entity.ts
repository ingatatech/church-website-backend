import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Speaker } from './speaker.entity';

export enum PublicationStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('sermons')
@Index('IDX_sermons_slug', ['slug'], { unique: true })
@Index('IDX_sermons_status_date', ['status', 'date'])
export class Sermon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 180 })
  title: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 140 })
  speaker: string;

  @Column({ type: 'uuid', nullable: true })
  speakerId: string | null;

  @ManyToOne(() => Speaker, (speaker) => speaker.sermons, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'speakerId' })
  speakerRef?: Speaker | null;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  scripture: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bibleBook: string | null;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  series: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ministry: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  service: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  thumbnailUrl: string | null;

  @Column({ type: 'text', nullable: true })
  audioUrl: string | null;

  @Column({ type: 'text', nullable: true })
  videoUrl: string | null;

  @Column({ type: 'boolean', default: true })
  allowDownload: boolean;

  @Column({
    type: 'enum',
    enum: PublicationStatus,
    default: PublicationStatus.DRAFT,
  })
  status: PublicationStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
