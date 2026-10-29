import {
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';

@Entity('media_assets')
@Index(['resourceType', 'publicId'], { unique: true })
export class MediaAsset {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 16 }) resourceType: string;
  @Column({ type: 'varchar', length: 512 }) publicId: string;
  @Column({ type: 'text' }) secureUrl: string;
  @Column({ type: 'varchar', length: 32, nullable: true }) format: string | null;
  @Column({ type: 'integer', nullable: true }) width: number | null;
  @Column({ type: 'integer', nullable: true }) height: number | null;
  @Column({ type: 'bigint' }) bytes: string;
  @Column({ type: 'text', default: '' }) altText: string;
  @Column({ type: 'varchar', length: 255 }) folder: string;
  @Column({ type: 'timestamptz', nullable: true }) cloudinaryCreatedAt: Date | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
