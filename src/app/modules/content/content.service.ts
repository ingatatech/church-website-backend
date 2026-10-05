import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentRecord, ContentType } from './content.entity';
import { CreateContentDto, UpdateContentDto } from './content.dto';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(ContentRecord)
    private readonly records: Repository<ContentRecord>,
    private readonly events: EventEmitter2,
  ) {}
  async list(type: ContentType, page = 1, limit = 20, includeDrafts = false) {
    const [items, total] = await this.records.findAndCount({
      where: { type, ...(!includeDrafts ? { published: true } : {}) },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }
  async get(type: ContentType, slug: string) {
    const item = await this.records.findOne({
      where: { type, slug, published: true },
    });
    if (!item) throw new NotFoundException('Published content was not found');
    return item;
  }
  async create(dto: CreateContentDto) {
    if (await this.records.existsBy({ type: dto.type, slug: dto.slug }))
      throw new ConflictException(
        'A record with this type and slug already exists',
      );
    const item = await this.records.save(
      this.records.create({
        ...dto,
        publishedAt: dto.published ? new Date() : null,
      }),
    );
    this.events.emit('content.created', {
      id: item.id,
      type: item.type,
      slug: item.slug,
    });
    return item;
  }
  async update(id: string, dto: UpdateContentDto) {
    const item = await this.records.findOneBy({ id });
    if (!item) throw new NotFoundException('Content was not found');
    Object.assign(item, dto);
    if (dto.published === true && !item.publishedAt)
      item.publishedAt = new Date();
    const saved = await this.records.save(item);
    this.events.emit('content.updated', {
      id: saved.id,
      type: saved.type,
      slug: saved.slug,
    });
    return saved;
  }
  async remove(id: string) {
    const item = await this.records.findOneBy({ id });
    if (!item) throw new NotFoundException('Content was not found');
    await this.records.remove(item);
    this.events.emit('content.deleted', {
      id,
      type: item.type,
      slug: item.slug,
    });
    return { id };
  }
}
