import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PublicationStatus } from '../../sermons/entities/sermon.entity';
@Entity('ministries')
export class Ministry {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 160 }) name: string;
  @Column({ type: 'varchar', length: 180, unique: true }) slug: string;
  @Column({ type: 'text' }) description: string;
  @Column({ type: 'varchar', length: 180, nullable: true }) targetAudience:
    string | null;
  @Column({ type: 'varchar', length: 300, nullable: true }) meetingSchedule:
    string | null;
  @Column({ type: 'varchar', length: 250, nullable: true }) location:
    string | null;
  @Column({ type: 'varchar', length: 140, nullable: true }) leader:
    string | null;
  @Column({ type: 'text', nullable: true }) imageUrl: string | null;
  @Column({ type: 'varchar', length: 254, nullable: true }) contactEmail:
    string | null;
  @Column({ type: 'varchar', length: 40, nullable: true }) contactPhone:
    string | null;
  @Column({ type: 'varchar', length: 80, nullable: true }) ctaLabel:
    string | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) ctaUrl:
    string | null;
  @Column({ type: 'varchar', length: 180, nullable: true }) seoTitle:
    string | null;
  @Column({ type: 'varchar', length: 300, nullable: true }) seoDescription:
    string | null;
  @Column({
    type: 'enum',
    enum: PublicationStatus,
    default: PublicationStatus.DRAFT,
  })
  status: PublicationStatus;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}
