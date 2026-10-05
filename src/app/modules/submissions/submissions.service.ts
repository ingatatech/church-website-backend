import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSubmissionDto } from './submission.dto';
import { Submission } from './submission.entity';
@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(Submission)
    private readonly submissions: Repository<Submission>,
    private readonly events: EventEmitter2,
  ) {}
  async create(dto: CreateSubmissionDto) {
    const item = await this.submissions.save(this.submissions.create(dto));
    this.events.emit('submission.created', { id: item.id, type: item.type });
    return {
      id: item.id,
      type: item.type,
      status: item.status,
      createdAt: item.createdAt,
    };
  }
}
