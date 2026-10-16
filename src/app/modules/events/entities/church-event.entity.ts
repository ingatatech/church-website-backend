import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PublicationStatus } from '../../sermons/entities/sermon.entity';
@Entity('church_events')
export class ChurchEvent {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 180 }) name: string;
  @Column({ type: 'date' }) date: string;
  @Column({ type: 'time' }) time: string;
  @Column({ type: 'varchar', length: 250 }) location: string;
  @Column({ type: 'time', nullable: true }) endTime: string | null;
  @Column({
    type: 'enum',
    enum: PublicationStatus,
    default: PublicationStatus.DRAFT,
  })
  status: PublicationStatus;
  @Column({ type: 'varchar', length: 180, nullable: true })
  organizer: string | null;
  @Column({ type: 'varchar', length: 140, nullable: true })
  speaker: string | null;
  @Column({ type: 'text', nullable: true }) flyerUrl: string | null;
  @Column({ type: 'boolean', default: false }) registrationRequired: boolean;
  @Column({ type: 'text', nullable: true }) registrationInfo: string | null;
  @Column({ type: 'varchar', length: 254, nullable: true })
  contactInfo: string | null;
  @Column({ type: 'text', nullable: true }) mapUrl: string | null;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}
