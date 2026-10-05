import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisPubSubService } from '../../../libs/pubsub/redis-pubsub.service';
import { DOMAIN_EVENTS } from '../../../utils/constants/events';
import { CreateSermonDto, UpdateSermonDto } from './dto/sermon.dto';
import { PublicationStatus, Sermon } from './entities/sermon.entity';
@Injectable()
export class SermonsService {
  constructor(
    @InjectRepository(Sermon) private readonly repository: Repository<Sermon>,
    private readonly pubsub: RedisPubSubService,
  ) {}
  list() {
    return this.repository.find({
      where: { status: PublicationStatus.PUBLISHED },
      order: { date: 'DESC' },
    });
  }
  async get(id: string) {
    const row = await this.repository.findOne({
      where: { id, status: PublicationStatus.PUBLISHED },
    });
    if (!row) throw new NotFoundException('Published sermon was not found');
    return row;
  }
  async create(dto: CreateSermonDto) {
    const row = await this.repository.save(this.repository.create(dto));
    await this.pubsub.publish(DOMAIN_EVENTS.SERMON_CREATED, {
      id: row.id,
      title: row.title,
    });
    return row;
  }
  async update(id: string, dto: UpdateSermonDto) {
    const row = await this.repository.findOneBy({ id });
    if (!row) throw new NotFoundException('Sermon was not found');
    Object.assign(row, dto);
    return this.repository.save(row);
  }
  async remove(id: string) {
    const row = await this.repository.findOneBy({ id });
    if (!row) throw new NotFoundException('Sermon was not found');
    await this.repository.remove(row);
    return { id };
  }
}
