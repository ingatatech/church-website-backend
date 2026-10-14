import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisPubSubService } from '../../../libs/pubsub/redis-pubsub.service';
import { DOMAIN_EVENTS } from '../../../utils/constants/events';
import { PublicationStatus } from '../sermons/entities/sermon.entity';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto';
import { ChurchEvent } from './entities/church-event.entity';
@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(ChurchEvent)
    private readonly repository: Repository<ChurchEvent>,
    private readonly pubsub: RedisPubSubService,
  ) {}
  list() {
    return this.repository
      .createQueryBuilder('event')
      .where('event.status = :status', { status: PublicationStatus.PUBLISHED })
      .andWhere('event.date >= CURRENT_DATE')
      .orderBy('event.date', 'ASC')
      .addOrderBy('event.time', 'ASC')
      .getMany();
  }
  listForAdministration() {
    return this.repository.find({
      order: { date: 'ASC', time: 'ASC' },
    });
  }
  async get(id: string) {
    const row = await this.repository.findOne({
      where: { id, status: PublicationStatus.PUBLISHED },
    });
    if (!row) throw new NotFoundException('Published event was not found');
    return row;
  }
  async create(dto: CreateEventDto) {
    const row = await this.repository.save(this.repository.create(dto));
    await this.pubsub.publish(DOMAIN_EVENTS.EVENT_CREATED, {
      id: row.id,
      name: row.name,
    });
    return row;
  }
  async update(id: string, dto: UpdateEventDto) {
    const row = await this.repository.findOneBy({ id });
    if (!row) throw new NotFoundException('Event was not found');
    Object.assign(row, dto);
    return this.repository.save(row);
  }
  async remove(id: string) {
    const row = await this.repository.findOneBy({ id });
    if (!row) throw new NotFoundException('Event was not found');
    await this.repository.remove(row);
    return { id };
  }
}
