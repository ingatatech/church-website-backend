import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicationStatus } from '../sermons/entities/sermon.entity';
import { CreateMinistryDto, UpdateMinistryDto } from './dto/ministry.dto';
import { Ministry } from './entities/ministry.entity';
import { slugify } from '../../../utils/slug';
import { isCloudinaryImageUrl } from '../../../libs/storage/cloudinary-url';
import { CloudinaryStorageService } from '../../../libs/storage/cloudinary-storage.service';

type MinistryFilters = { status?: string; search?: string };

@Injectable()
export class MinistriesService {
  constructor(
    @InjectRepository(Ministry)
    private readonly repository: Repository<Ministry>,
    private readonly events: EventEmitter2,
    private readonly config: ConfigService,
    @Optional() private readonly storage?: CloudinaryStorageService,
  ) {}

  list() {
    return this.repository.find({
      where: { status: PublicationStatus.PUBLISHED },
      order: { name: 'ASC' },
    });
  }

  async listAdmin(filters: MinistryFilters = {}) {
    const query = this.repository.createQueryBuilder('ministry');
    if (filters.status) {
      if (!Object.values(PublicationStatus).includes(filters.status as PublicationStatus)) {
        throw new BadRequestException('Unsupported ministry publication status');
      }
      query.andWhere('ministry.status = :status', { status: filters.status });
    }
    if (filters.search?.trim()) {
      query.andWhere(
        '(ministry.name ILIKE :search OR ministry.slug ILIKE :search OR ministry.description ILIKE :search)',
        { search: `%${filters.search.trim()}%` },
      );
    }
    const items = await query
      .orderBy('ministry.updatedAt', 'DESC')
      .take(500)
      .getMany();
    return { items, total: items.length };
  }

  async get(idOrSlug: string) {
    const row = await this.repository.findOne({
      where: { slug: idOrSlug, status: PublicationStatus.PUBLISHED },
    }) ?? (this.isUuid(idOrSlug)
      ? await this.repository.findOne({
          where: { id: idOrSlug, status: PublicationStatus.PUBLISHED },
        })
      : null);
    if (!row) throw new NotFoundException('Published ministry was not found');
    return row;
  }

  async create(dto: CreateMinistryDto) {
    const name = dto.name.trim();
    const description = dto.description.trim();
    const targetAudience = dto.targetAudience.trim();
    const meetingSchedule = dto.meetingSchedule.trim();
    const location = dto.location.trim();
    this.requireText({ name, description, targetAudience, meetingSchedule, location });
    this.assertBackendImage(dto.imageUrl);
    const slug = await this.uniqueSlug(dto.slug || name);
    const row = await this.repository.save(
      this.repository.create(
        this.cleanInput({ ...dto, name, description, targetAudience, meetingSchedule, location, slug }),
      ),
    );
    this.emit('content.created', row);
    return row;
  }

  async update(id: string, dto: UpdateMinistryDto) {
    const row = await this.repository.findOneBy({ id });
    if (!row) throw new NotFoundException('Ministry was not found');
    const update = this.cleanInput(dto);
    this.requireText({
      ...(dto.name !== undefined ? { name: update.name } : {}),
      ...(dto.description !== undefined ? { description: update.description } : {}),
      ...(dto.targetAudience !== undefined ? { targetAudience: update.targetAudience } : {}),
      ...(dto.meetingSchedule !== undefined ? { meetingSchedule: update.meetingSchedule } : {}),
      ...(dto.location !== undefined ? { location: update.location } : {}),
    });
    if (dto.imageUrl !== undefined && !dto.imageUrl?.trim()) {
      throw new BadRequestException('A featured ministry image is required');
    }
    const oldImageUrl = row.imageUrl;
    if (dto.imageUrl !== undefined && dto.imageUrl !== row.imageUrl) {
      this.assertBackendImage(dto.imageUrl);
      if (oldImageUrl && oldImageUrl !== dto.imageUrl) {
        this.storage?.deleteFile(oldImageUrl).catch(() => null);
      }
    }
    if (dto.slug !== undefined) {
      const slug = this.normalizeSlug(dto.slug);
      if (!slug) throw new BadRequestException('Enter a valid ministry slug');
      const duplicate = await this.repository.findOneBy({ slug });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException('That ministry slug is already in use');
      }
      update.slug = slug;
    }
    Object.assign(row, update);
    const saved = await this.repository.save(row);
    this.emit('content.updated', saved);
    return saved;
  }

  async remove(id: string) {
    const row = await this.repository.findOneBy({ id });
    if (!row) throw new NotFoundException('Ministry was not found');
    const oldImageUrl = row.imageUrl;
    await this.repository.remove(row);
    if (oldImageUrl) {
      this.storage?.deleteFile(oldImageUrl).catch(() => null);
    }
    this.emit('content.deleted', row);
    return { id };
  }

  private async uniqueSlug(source: string) {
    const base = this.normalizeSlug(source) || 'ministry';
    let slug = base;
    let suffix = 2;
    while (await this.repository.existsBy({ slug })) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
    return slug;
  }

  private normalizeSlug(source: string) {
    return slugify(source.trim()).slice(0, 180).replace(/-+$/g, '');
  }

  private requireText(values: Record<string, string | null | undefined>) {
    for (const [field, value] of Object.entries(values)) {
      if (!value?.trim()) {
        throw new BadRequestException(`${field} cannot be blank`);
      }
    }
  }

  private cleanInput<T extends Partial<CreateMinistryDto>>(input: T): T {
    const cleaned = { ...input };
    for (const key of Object.keys(cleaned) as (keyof T)[]) {
      const value = cleaned[key];
      if (typeof value === 'string') cleaned[key] = value.trim() as T[keyof T];
    }
    return cleaned;
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private assertBackendImage(imageUrl?: string | null) {
    if (!imageUrl) return;
    let url: URL;
    try {
      url = new URL(imageUrl);
    } catch {
      throw new BadRequestException('Choose an image uploaded through the backend media service');
    }
    const isCloudinaryImage = isCloudinaryImageUrl(
      imageUrl,
      this.config.get<string>('CLOUDINARY_URL'),
      this.config.get<string>('CLOUDINARY_DELIVERY_HOST'),
    );
    if (!isCloudinaryImage) {
      if (url.hostname.includes('unsplash.com')) return;
      throw new BadRequestException('Choose an image uploaded to Cloudinary through the backend media service');
    }
  }

  private emit(event: string, row: Ministry) {
    this.events.emit(event, { id: row.id, type: 'ministries' });
  }
}
