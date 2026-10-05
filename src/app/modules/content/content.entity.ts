import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export const CONTENT_TYPES = [
  'pages',
  'ministries',
  'services',
  'events',
  'sermons',
  'announcements',
  'resources',
  'faqs',
  'leaders',
  'testimonials',
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

@Entity('content_records')
@Index(['type', 'slug'], { unique: true })
export class ContentRecord {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 32 }) type: ContentType;
  @Column({ type: 'varchar', length: 180 }) title: string;
  @Column({ type: 'varchar', length: 200 }) slug: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'jsonb', default: {} }) details: Record<string, unknown>;
  @Column({ type: 'boolean', default: false }) published: boolean;
  @Column({ type: 'timestamptz', nullable: true }) publishedAt: Date | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
