import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_STATUSES,
  type AnnouncementCategory,
  type AnnouncementStatus,
} from './announcement.constants';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from './announcement.dto';
import { ContentRecord, ContentType } from './content.entity';
import { CreateContentDto, UpdateContentDto } from './content.dto';

type AnnouncementFilters = {
  category?: string;
  status?: string;
  search?: string;
};

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(ContentRecord)
    private readonly records: Repository<ContentRecord>,
    private readonly events: EventEmitter2,
  ) {}

  async listAnnouncements(filters: AnnouncementFilters = {}) {
    const query = this.records
      .createQueryBuilder('record')
      .where('record.type = :type', { type: 'announcements' });
    if (filters.category) {
      this.validateAnnouncementCategory(filters.category);
      query.andWhere("record.details ->> 'category' = :category", {
        category: filters.category,
      });
    }

    if (filters.search?.trim()) {
      query.andWhere(
        '(record.title ILIKE :search OR record.description ILIKE :search)',
        { search: `%${filters.search.trim()}%` },
      );
    }

    const records = await query
      .orderBy('record.createdAt', 'DESC')
      .take(500)
      .getMany();
    const items = records.map((record) =>
      this.withEffectiveAnnouncementStatus(record),
    );
    const selected = filters.status
      ? items.filter((record) => record.details.status === filters.status)
      : items;
    if (
      filters.status &&
      !ANNOUNCEMENT_STATUSES.includes(filters.status as AnnouncementStatus)
    ) {
      throw new BadRequestException('Unsupported announcement status');
    }
    return { items: selected, total: selected.length };
  }

  async getAnnouncement(id: string) {
    const record = await this.records.findOneBy({ id, type: 'announcements' });
    if (!record) throw new NotFoundException('Announcement was not found');
    return this.withEffectiveAnnouncementStatus(record);
  }

  async createAnnouncement(input: CreateAnnouncementDto) {
    this.validateAnnouncement(input, true);
    if (
      await this.records.existsBy({ type: 'announcements', slug: input.slug })
    ) {
      throw new ConflictException(
        'An announcement with this slug already exists',
      );
    }

    const details = this.announcementDetails(input, input.status);
    const record = await this.records.save(
      this.records.create({
        type: 'announcements',
        title: input.title.trim(),
        slug: input.slug,
        description: input.description.trim(),
        details,
        published: input.status === 'PUBLISHED',
        publishedAt:
          input.status === 'PUBLISHED' ? new Date(input.publicationDate) : null,
      }),
    );
    this.emitAnnouncementEvent('content.created', record);
    return this.withEffectiveAnnouncementStatus(record);
  }

  async updateAnnouncement(id: string, input: UpdateAnnouncementDto) {
    const record = await this.records.findOneBy({ id, type: 'announcements' });
    if (!record) throw new NotFoundException('Announcement was not found');
    const current = this.withEffectiveAnnouncementStatus(record);
    const merged = {
      title: input.title ?? record.title,
      slug: input.slug ?? record.slug,
      description: input.description ?? record.description ?? '',
      imageUrl: input.imageUrl ?? this.announcementImage(record),
      category: input.category ?? this.announcementCategory(record),
      publicationDate:
        input.publicationDate ?? this.announcementPublicationDate(record),
      expiryDate:
        input.expiryDate === undefined
          ? this.announcementExpiryDate(record)
          : input.expiryDate,
      status: input.status ?? current.details.status,
    };
    this.validateAnnouncement(merged, false);
    if (
      merged.slug !== record.slug &&
      (await this.records.existsBy({
        type: 'announcements',
        slug: merged.slug,
      }))
    ) {
      throw new ConflictException(
        'An announcement with this slug already exists',
      );
    }

    record.title = merged.title.trim();
    record.slug = merged.slug;
    record.description = merged.description.trim();
    record.details = this.announcementDetails(merged, merged.status);
    record.published = merged.status === 'PUBLISHED';
    record.publishedAt =
      merged.status === 'PUBLISHED' ? new Date(merged.publicationDate) : null;
    const saved = await this.records.save(record);
    this.emitAnnouncementEvent('content.updated', saved);
    return this.withEffectiveAnnouncementStatus(saved);
  }

  async transitionAnnouncement(
    id: string,
    action: 'publish' | 'schedule' | 'unpublish' | 'archive',
  ) {
    const record = await this.records.findOneBy({ id, type: 'announcements' });
    if (!record) throw new NotFoundException('Announcement was not found');

    const publicationDate = this.announcementPublicationDate(record);
    const expiryDate = this.announcementExpiryDate(record);
    const now = Date.now();
    let status: AnnouncementStatus;
    if (action === 'publish') {
      this.validateAnnouncement(
        {
          title: record.title,
          slug: record.slug,
          description: record.description ?? '',
          imageUrl: this.announcementImage(record),
          category: this.announcementCategory(record),
          publicationDate,
          expiryDate,
          status: 'PUBLISHED',
        },
        false,
      );
      if (Date.parse(publicationDate) > now) {
        throw new BadRequestException(
          'This announcement has a future publication date. Schedule it instead.',
        );
      }
      if (expiryDate && Date.parse(expiryDate) <= now) {
        throw new BadRequestException('This announcement has already expired.');
      }
      status = 'PUBLISHED';
    } else if (action === 'schedule') {
      this.validateAnnouncement(
        {
          title: record.title,
          slug: record.slug,
          description: record.description ?? '',
          imageUrl: this.announcementImage(record),
          category: this.announcementCategory(record),
          publicationDate,
          expiryDate,
          status: 'SCHEDULED',
        },
        false,
      );
      if (Date.parse(publicationDate) <= now) {
        throw new BadRequestException(
          'Choose a future publication date to schedule this announcement.',
        );
      }
      status = 'SCHEDULED';
    } else {
      status = action === 'unpublish' ? 'UNPUBLISHED' : 'ARCHIVED';
    }

    record.details = { ...record.details, status };
    record.published = status === 'PUBLISHED';
    record.publishedAt =
      status === 'PUBLISHED' ? new Date(publicationDate) : null;
    const saved = await this.records.save(record);
    this.emitAnnouncementEvent('content.updated', saved);
    return this.withEffectiveAnnouncementStatus(saved);
  }

  async listPublicAnnouncements(category?: string, limit = 50, page = 1) {
    if (category) this.validateAnnouncementCategory(category);
    const now = new Date();
    const query = this.publicAnnouncementsQuery(now);
    if (category) {
      query.andWhere("record.details ->> 'category' = :category", { category });
    }
    const [records, total] = await query
      .orderBy(
        "COALESCE(NULLIF(record.details ->> 'publicationDate', '')::timestamptz, record.publishedAt)",
        'DESC',
      )
      .skip((Math.max(page, 1) - 1) * Math.min(Math.max(limit, 1), 100))
      .take(Math.min(Math.max(limit, 1), 100))
      .getManyAndCount();
    return {
      items: records.map((record) =>
        this.withEffectiveAnnouncementStatus(record),
      ),
      pagination: {
        page: Math.max(page, 1),
        limit: Math.min(Math.max(limit, 1), 100),
        total,
        pages: Math.ceil(total / Math.min(Math.max(limit, 1), 100)),
      },
    };
  }

  async getPublicAnnouncement(slug: string) {
    const item = await this.publicAnnouncementsQuery(new Date())
      .andWhere('record.slug = :slug', { slug })
      .getOne();
    if (!item)
      throw new NotFoundException('Published announcement was not found');
    return this.withEffectiveAnnouncementStatus(item);
  }

  async list(type: ContentType, page = 1, limit = 20, includeDrafts = false) {
    if (type === 'announcements') {
      const query = includeDrafts
        ? this.records
            .createQueryBuilder('record')
            .where('record.type = :type', { type })
        : this.publicAnnouncementsQuery(new Date());
      const [items, total] = await query
        .orderBy(
          includeDrafts
            ? 'record.createdAt'
            : "COALESCE(NULLIF(record.details ->> 'publicationDate', '')::timestamptz, record.publishedAt)",
          'DESC',
        )
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();
      return {
        items: items.map((record) =>
          this.withEffectiveAnnouncementStatus(record),
        ),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      };
    }

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
    if (type === 'announcements') {
      return this.getPublicAnnouncement(slug);
    }

    const item = await this.records.findOne({
      where: { type, slug, published: true },
    });
    if (!item) throw new NotFoundException('Published content was not found');
    return item;
  }
  async create(dto: CreateContentDto) {
    if (dto.type === 'announcements')
      throw new BadRequestException(
        'Use the announcement management endpoint to create announcements.',
      );
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
    if (item.type === 'announcements')
      throw new BadRequestException(
        'Use the announcement management endpoint to update announcements.',
      );
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
    if (item.type === 'announcements')
      throw new BadRequestException(
        'Announcements are retained for history. Archive them instead of deleting.',
      );
    await this.records.remove(item);
    this.events.emit('content.deleted', {
      id,
      type: item.type,
      slug: item.slug,
    });
    return { id };
  }

  private publicAnnouncementsQuery(now: Date) {
    const query = this.records
      .createQueryBuilder('record')
      .where('record.type = :type', { type: 'announcements' });
    const status = `COALESCE(record.details ->> 'status', CASE
      WHEN record.details ->> 'publicationStatus' = 'archived' THEN 'ARCHIVED'
      WHEN record.details ->> 'publicationStatus' = 'scheduled' THEN 'SCHEDULED'
      WHEN record.published = true THEN 'PUBLISHED'
      ELSE 'DRAFT'
    END)`;
    const publicationDate = `COALESCE(
      NULLIF(record.details ->> 'publicationDate', '')::timestamptz,
      NULLIF(record.details ->> 'scheduledAt', '')::timestamptz,
      record.publishedAt
    )`;
    const expiryDate = `COALESCE(
      NULLIF(record.details ->> 'expiryDate', '')::timestamptz,
      NULLIF(record.details ->> 'expiresAt', '')::timestamptz
    )`;
    return query
      .andWhere(
        `(${status} = 'PUBLISHED' OR (${status} = 'SCHEDULED' AND ${publicationDate} <= :now))`,
        { now },
      )
      .andWhere(`${publicationDate} <= :now`, { now })
      .andWhere(`(${expiryDate} IS NULL OR ${expiryDate} > :now)`, { now });
  }

  private validateAnnouncement(
    input: CreateAnnouncementDto | UpdateAnnouncementDto,
    creating: boolean,
  ) {
    const status = input.status;
    if (
      !input.title?.trim() ||
      input.title.length > 180 ||
      !input.slug ||
      input.slug.length > 200 ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug) ||
      !input.description?.trim() ||
      input.description.length > 10000 ||
      !input.imageUrl ||
      input.imageUrl.length > 2048 ||
      !input.category
    ) {
      throw new BadRequestException(
        'Title, a valid slug, description, image and category are required.',
      );
    }
    const publicationDate = this.parseAnnouncementDate(
      input.publicationDate,
      'publication',
    );
    const expiryDate = this.parseAnnouncementDate(input.expiryDate, 'expiry');
    if (creating && !publicationDate) {
      throw new BadRequestException('A publication date is required.');
    }
    if (input.category) this.validateAnnouncementCategory(input.category);
    if (input.imageUrl) this.validateAnnouncementImage(input.imageUrl);
    if (status && !ANNOUNCEMENT_STATUSES.includes(status)) {
      throw new BadRequestException('Unsupported announcement status');
    }
    if (
      creating &&
      status !== 'DRAFT' &&
      status !== 'SCHEDULED' &&
      status !== 'PUBLISHED'
    ) {
      throw new BadRequestException(
        'New announcements can only be saved as drafts, published, or scheduled.',
      );
    }
    if (status === 'SCHEDULED' && !publicationDate) {
      throw new BadRequestException(
        'A publication date is required for a scheduled announcement.',
      );
    }
    if (
      status === 'SCHEDULED' &&
      publicationDate !== null &&
      publicationDate <= Date.now()
    ) {
      throw new BadRequestException(
        'A scheduled announcement must have a future publication date.',
      );
    }
    if (
      status === 'PUBLISHED' &&
      publicationDate &&
      publicationDate > Date.now()
    ) {
      throw new BadRequestException(
        'A future announcement must be scheduled instead of published now.',
      );
    }
    if (
      status === 'PUBLISHED' &&
      expiryDate !== null &&
      expiryDate <= Date.now()
    ) {
      throw new BadRequestException(
        'An announcement with an expiry date in the past cannot be published.',
      );
    }
    if (
      expiryDate !== null &&
      publicationDate !== null &&
      expiryDate <= publicationDate
    ) {
      throw new BadRequestException(
        'The expiry date must be later than the publication date.',
      );
    }
  }

  private validateAnnouncementCategory(
    category: string,
  ): asserts category is AnnouncementCategory {
    if (!(ANNOUNCEMENT_CATEGORIES as readonly string[]).includes(category)) {
      throw new BadRequestException('Choose a valid announcement category.');
    }
  }

  private validateAnnouncementImage(value: string) {
    let image: URL;
    try {
      image = new URL(value);
    } catch {
      throw new BadRequestException('Upload a valid announcement image.');
    }
    if (
      image.protocol !== 'https:' ||
      image.hostname !== 'res.cloudinary.com' ||
      !image.pathname.includes('/image/upload/')
    ) {
      throw new BadRequestException(
        'Announcement images must be uploaded through the church media library.',
      );
    }
  }

  private parseAnnouncementDate(value: unknown, label: string): number | null {
    if (value == null || value === '') return null;
    if (typeof value !== 'string') {
      throw new BadRequestException(
        `The announcement ${label} date is invalid.`,
      );
    }
    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) {
      throw new BadRequestException(
        `The announcement ${label} date is invalid.`,
      );
    }
    return timestamp;
  }

  private announcementDetails(
    input: CreateAnnouncementDto | UpdateAnnouncementDto,
    status?: AnnouncementStatus,
  ) {
    return {
      imageUrl: input.imageUrl,
      category: input.category,
      publicationDate: input.publicationDate,
      expiryDate: input.expiryDate || null,
      status,
    };
  }

  private announcementImage(record: ContentRecord) {
    const value = record.details?.imageUrl;
    return typeof value === 'string' ? value : '';
  }

  private announcementCategory(record: ContentRecord): AnnouncementCategory {
    const value = record.details?.category;
    return typeof value === 'string' &&
      (ANNOUNCEMENT_CATEGORIES as readonly string[]).includes(value)
      ? (value as AnnouncementCategory)
      : 'OTHER';
  }

  private announcementPublicationDate(record: ContentRecord) {
    const details = record.details ?? {};
    const value = details.publicationDate ?? details.scheduledAt;
    if (typeof value === 'string' && !Number.isNaN(Date.parse(value)))
      return value;
    return record.publishedAt?.toISOString() ?? record.createdAt.toISOString();
  }

  private announcementExpiryDate(record: ContentRecord) {
    const value = record.details?.expiryDate ?? record.details?.expiresAt;
    return typeof value === 'string' ? value : null;
  }

  private withEffectiveAnnouncementStatus(record: ContentRecord) {
    const details = { ...(record.details ?? {}) };
    const publicationDate = this.announcementPublicationDate(record);
    const expiryDate = this.announcementExpiryDate(record);
    const storedStatus =
      typeof details.status === 'string'
        ? details.status
        : details.publicationStatus === 'archived'
          ? 'ARCHIVED'
          : details.publicationStatus === 'scheduled'
            ? 'SCHEDULED'
            : record.published
              ? 'PUBLISHED'
              : 'DRAFT';
    let status = storedStatus as AnnouncementStatus;
    if (
      (status === 'PUBLISHED' || status === 'SCHEDULED') &&
      expiryDate &&
      Date.parse(expiryDate) <= Date.now()
    ) {
      status = 'EXPIRED';
    } else if (
      status === 'SCHEDULED' &&
      Date.parse(publicationDate) <= Date.now()
    ) {
      status = 'PUBLISHED';
    }
    return {
      ...record,
      details: {
        ...details,
        imageUrl: this.announcementImage(record),
        category: this.announcementCategory(record),
        publicationDate,
        expiryDate,
        status,
      },
    };
  }

  private emitAnnouncementEvent(event: string, record: ContentRecord) {
    this.events.emit(event, {
      id: record.id,
      type: record.type,
      slug: record.slug,
    });
  }
}
