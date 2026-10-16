import { Column, CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';
export abstract class InquiryRecord {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 140 }) name: string;
  @Column({ type: 'varchar', length: 254 }) email: string;
  @Column({ type: 'varchar', length: 40, nullable: true }) phone: string | null;
  @Column({ type: 'text' }) message: string;
  @Column({ type: 'varchar', length: 20, default: 'new' }) status: string;
  @Column({ type: 'text', nullable: true }) reply: string | null;
  @Column({ type: 'timestamptz', nullable: true }) repliedAt: Date | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
