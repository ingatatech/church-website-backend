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
import { slugify } from '../../../utils/slug';
import { isCloudinaryImageUrl } from '../../../libs/storage/cloudinary-url';
import { CloudinaryStorageService } from '../../../libs/storage/cloudinary-storage.service';

type AnnouncementFilters = {
  category?: string;
  status?: string;
  search?: string;
};

type AnnouncementInput = {
  title?: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  publicationDate?: string | null;
  expiryDate?: string | null;
  status?: AnnouncementStatus;
  slug?: string;
};

const SERVICE_STATUSES = ['draft', 'published', 'unpublished', 'archived'] as const;
const WEEKDAY_COUNT = 7;
const serviceDraftKey = '_serviceDraft';
type ServiceStatus = (typeof SERVICE_STATUSES)[number];
type ServiceDraft = {
  title: string;
  description: string | null;
  details: Record<string, unknown>;
};

@Injectable()
export class ContentService {
  private readonly settingsDraftKey = '_draft';

  constructor(
    @InjectRepository(ContentRecord)
    private readonly records: Repository<ContentRecord>,
    private readonly events: EventEmitter2,
    @Optional() private readonly config?: ConfigService,
    @Optional() private readonly storage?: CloudinaryStorageService,
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
    const slug = await this.uniqueSlug(
      'announcements',
      input.title.trim(),
      'announcement',
    );

    const details = this.announcementDetails(input, input.status);
    const record = await this.records.save(
      this.records.create({
        type: 'announcements',
        title: input.title.trim(),
        slug,
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
    const oldImageUrl = this.announcementImage(record);
    if (input.imageUrl && oldImageUrl && input.imageUrl !== oldImageUrl) {
      this.storage?.deleteFile(oldImageUrl).catch(() => null);
    }
    const current = this.withEffectiveAnnouncementStatus(record);
    const merged = {
      title: input.title ?? record.title,
      slug: record.slug,
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
    record.title = merged.title.trim();
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
        `COALESCE(NULLIF(record.details ->> 'publicationDate', '')::timestamptz, record."publishedAt")`,
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
            : `COALESCE(NULLIF(record.details ->> 'publicationDate', '')::timestamptz, record."publishedAt")`,
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

    const query = this.records.createQueryBuilder('record').where('record.type = :type', { type });
    if (!includeDrafts) {
      query.andWhere('record.published = true')
        .andWhere("COALESCE(record.details ->> 'publicationStatus', '') <> 'archived'");
      if (type === 'services') {
        query
          .andWhere("COALESCE(record.details ->> 'publicationStatus', 'published') = 'published'")
          .andWhere("COALESCE(record.details ->> 'active', 'true') = 'true'");
      }
    }
    if (type === 'leaders') {
      query.orderBy("CAST(COALESCE(NULLIF(record.details ->> 'displayOrder', ''), '0') AS INTEGER)", 'ASC')
        .addOrderBy('record.createdAt', 'ASC');
    } else if (type === 'services') {
      query
        .orderBy("CASE WHEN record.details ->> 'scheduleType' = 'weekly' THEN 0 ELSE 1 END", 'ASC')
        .addOrderBy("CAST(COALESCE(NULLIF(record.details ->> 'displayOrder', ''), '0') AS INTEGER)", 'ASC')
        .addOrderBy("CAST(COALESCE(NULLIF(record.details ->> 'dayOfWeek', ''), '7') AS INTEGER)", 'ASC')
        .addOrderBy("COALESCE(record.details ->> 'serviceDate', '9999-12-31')", 'ASC')
        .addOrderBy("COALESCE(record.details ->> 'startTime', '23:59')", 'ASC');
    } else {
      query.orderBy('record.createdAt', 'DESC');
    }
    const [items, total] = await query.skip((page - 1) * limit).take(limit).getManyAndCount();
    return {
      items: items.map((item) => type === 'settings' && !includeDrafts
        ? this.withoutSettingsDraft(item)
        : type === 'services' && !includeDrafts
          ? this.withoutServiceDraft(item)
        : type === 'leaders' && !includeDrafts
          ? this.withoutUnapprovedLeaderContact(item)
          : item),
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
    if (type === 'settings') return this.withoutSettingsDraft(item);
    if (type === 'services') return this.withoutServiceDraft(item);
    return type === 'leaders' ? this.withoutUnapprovedLeaderContact(item) : item;
  }
  async create(dto: CreateContentDto) {
    if (dto.type === 'faqs')
      throw new BadRequestException(
        'Use the FAQ management endpoint to create FAQs.',
      );
    if (dto.type === 'announcements')
      throw new BadRequestException(
        'Use the announcement management endpoint to create announcements.',
      );
    const title = dto.title.trim();
    this.validateManagedSettings(dto.type, title, dto.description, dto.details);
    const leaderDetails = this.validateLeader(dto.type, title, dto.description, dto.details);
    const serviceDetails = this.validateService(dto.type, dto.details, dto.published === true);
    const testimonialDetails = this.validateTestimonial(
      dto.type,
      title,
      dto.description,
      dto.details,
      dto.published === true,
    );
    const settingsKey = this.managedSettingsKey(dto.type, dto.details);
    if (settingsKey) {
      const existing = await this.records.find({ where: { type: 'settings' } });
      if (existing.some((record) => this.managedSettingsKey(record.type, record.details) === settingsKey)) {
        throw new ConflictException(`The ${settingsKey} settings record already exists`);
      }
    }
    const slug = await this.uniqueSlug(dto.type, title, dto.type);
    const item = await this.records.save(
      this.records.create({
        ...dto,
        ...(dto.type === 'leaders' ? { details: leaderDetails } : {}),
        ...(dto.type === 'testimonials' ? { details: testimonialDetails } : {}),
        ...(dto.type === 'services' ? { details: serviceDetails, published: dto.published === true && serviceDetails.publicationStatus === 'published' && serviceDetails.active === true } : {}),
        title,
        slug,
        publishedAt: dto.type === 'services'
          ? dto.published === true && serviceDetails.publicationStatus === 'published' && serviceDetails.active === true ? new Date() : null
          : dto.published ? new Date() : null,
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
    if (item.type === 'faqs')
      throw new BadRequestException(
        'Use the FAQ management endpoint to update FAQs.',
      );
    if (item.type === 'announcements')
      throw new BadRequestException(
        'Use the announcement management endpoint to update announcements.',
      );
    const detailsForKey = dto.details ?? item.details;
    const leaderDetails = item.type === 'leaders'
      ? this.validateLeader(
          item.type,
          dto.title ?? item.title,
          dto.description === undefined ? item.description ?? undefined : dto.description,
          detailsForKey,
        )
      : undefined;
    const settingsKey = this.managedSettingsKey(item.type, detailsForKey);
    const serviceDetails = item.type === 'services'
      ? this.validateService(
          item.type,
          { ...this.publicServiceDetails(item.details), ...(dto.details ?? {}) },
          dto.published === true,
        )
      : undefined;
    const testimonialDetails = item.type === 'testimonials'
      ? this.validateTestimonial(
          item.type,
          dto.title ?? item.title,
          dto.description === undefined ? item.description : dto.description,
          detailsForKey,
          dto.published === true,
        )
      : undefined;
    if (item.type === 'settings') {
      this.validateManagedSettings(
        item.type,
        dto.title ?? item.title,
        dto.description === undefined ? item.description ?? undefined : dto.description,
        dto.details,
      );
    }

    if (item.type === 'services' && dto.unpublish === true) {
      item.published = false;
      item.publishedAt = null;
      item.details = {
        ...this.publicServiceDetails(item.details),
        publicationStatus: 'unpublished',
      };
    } else if (item.type === 'services' && (serviceDetails?.publicationStatus === 'archived' || serviceDetails?.publicationStatus === 'unpublished' || serviceDetails?.active === false)) {
      item.published = false;
      item.publishedAt = null;
      item.details = serviceDetails!;
    } else if (item.type === 'services' && dto.published === false && item.published) {
      if (!serviceDetails) {
        throw new BadRequestException('Service details are required.');
      }
      item.details = {
        ...this.publicServiceDetails(item.details),
        [serviceDraftKey]: {
          title: dto.title?.trim() ?? item.title,
          description: dto.description ?? item.description,
          details: serviceDetails,
        } satisfies ServiceDraft,
      };
      // A draft deliberately leaves the currently published schedule untouched.
    } else if (item.type === 'services') {
      Object.assign(item, dto);
      item.title = dto.title?.trim() ?? item.title;
      item.details = serviceDetails ?? this.publicServiceDetails(item.details);
      item.published = dto.published === true && item.details.publicationStatus === 'published' && item.details.active === true;
      item.publishedAt = item.published ? new Date() : null;
    } else if (settingsKey && dto.unpublish === true) {
      const draft = this.settingsDraft(item.details);
      item.published = false;
      item.publishedAt = null;
      if (draft) {
        item.title = draft.title;
        item.description = draft.description;
        item.details = draft.details;
      } else {
        item.details = this.publicSettingsDetails(item.details);
      }
    } else if (settingsKey && dto.published === false && item.published) {
      const details = dto.details ?? this.publicSettingsDetails(item.details);
      const draft = {
        title: dto.title?.trim() ?? item.title,
        description: dto.description ?? item.description,
        details,
      };
      item.details = {
        ...this.publicSettingsDetails(item.details),
        [this.settingsDraftKey]: draft,
      };
      // Keep the live version published while the submitted values wait for approval.
    } else {
      const { unpublish: _unpublish, ...contentUpdate } = dto;
      Object.assign(item, contentUpdate);
      if (leaderDetails) {
        const oldLeaderImage =
          typeof item.details?.imageUrl === 'string'
            ? item.details.imageUrl
            : null;
        const newLeaderImage =
          typeof leaderDetails.imageUrl === 'string'
            ? leaderDetails.imageUrl
            : null;
        if (
          oldLeaderImage &&
          newLeaderImage &&
          oldLeaderImage !== newLeaderImage
        ) {
          this.storage?.deleteFile(oldLeaderImage).catch(() => null);
        }
        item.details = leaderDetails;
      }
      if (testimonialDetails) item.details = testimonialDetails;
      if (settingsKey && dto.published === true) {
        item.details = this.publicSettingsDetails(item.details);
      }
      if (dto.published === true && !item.publishedAt)
        item.publishedAt = new Date();
    }
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
    if (item.type === 'faqs')
      throw new BadRequestException(
        'Use the FAQ management endpoint to delete FAQs.',
      );
    if (item.type === 'announcements')
      throw new BadRequestException(
        'Announcements are retained for history. Archive them instead of deleting.',
      );
    const itemImage =
      typeof item.details?.imageUrl === 'string'
        ? item.details.imageUrl
        : null;
    await this.records.remove(item);
    if (itemImage) {
      this.storage?.deleteFile(itemImage).catch(() => null);
    }
    this.events.emit('content.deleted', {
      id,
      type: item.type,
      slug: item.slug,
    });
    return { id };
  }

  private validateService(
    type: ContentType,
    input: Record<string, unknown> | undefined,
    publishing: boolean,
  ): Record<string, unknown> {
    if (type !== 'services') return input ?? {};
    const details = { ...(input ?? {}) };
    const text = (key: string, label: string, max: number, required = false) => {
      const value = details[key];
      if (value == null || value === '') {
        if (required) throw new BadRequestException(`${label} is required.`);
        return '';
      }
      if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim()))
        throw new BadRequestException(`${label} must be no longer than ${max} characters.`);
      return value.trim();
    };
    const scheduleType = details.scheduleType;
    if (scheduleType !== 'weekly' && scheduleType !== 'special')
      throw new BadRequestException('Choose either a weekly or special service schedule.');
    const serviceType = text('serviceType', 'Service type', 80, true);
    const location = text('location', 'Location', 250, true);
    const startTime = text('startTime', 'Start time', 5, true);
    const endTime = text('endTime', 'End time', 5);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || (endTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)))
      throw new BadRequestException('Use 24-hour HH:mm times for the service schedule.');
    if (endTime && endTime <= startTime)
      throw new BadRequestException('End time must be later than start time. Overnight services are not supported.');

    let dayOfWeek: number | null = null;
    let serviceDate: string | null = null;
    if (scheduleType === 'weekly') {
      const day = Number(details.dayOfWeek);
      if (!Number.isInteger(day) || day < 0 || day >= WEEKDAY_COUNT)
        throw new BadRequestException('Choose a day of the week for a recurring service.');
      dayOfWeek = day;
    } else {
      const date = text('serviceDate', 'Special service date', 10, true);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)))
        throw new BadRequestException('Enter a valid special service date.');
      serviceDate = date;
    }
    const publicationStatus = (details.publicationStatus ?? (publishing ? 'published' : 'draft')) as string;
    if (!(SERVICE_STATUSES as readonly string[]).includes(publicationStatus))
      throw new BadRequestException('Choose a valid publication status.');
    if (publishing && publicationStatus !== 'published')
      throw new BadRequestException('Only a published service can be made public.');
    const active = details.active === undefined ? true : details.active;
    if (typeof active !== 'boolean') throw new BadRequestException('Service active status must be true or false.');
    const displayOrder = details.displayOrder === '' || details.displayOrder === undefined ? 0 : Number(details.displayOrder);
    if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 999)
      throw new BadRequestException('Display order must be a whole number from 0 to 999.');
    return {
      scheduleType,
      serviceType,
      dayOfWeek,
      serviceDate,
      startTime,
      endTime: endTime || null,
      location,
      targetAudience: text('targetAudience', 'Target audience', 140) || null,
      instructions: text('instructions', 'Additional instructions', 3000) || null,
      active,
      displayOrder,
      publicationStatus: publicationStatus as ServiceStatus,
    };
  }

  private publicServiceDetails(details: Record<string, unknown> | undefined) {
    const { [serviceDraftKey]: _draft, ...publicDetails } = details ?? {};
    return publicDetails;
  }

  private withoutServiceDraft(record: ContentRecord) {
    return { ...record, details: this.publicServiceDetails(record.details) };
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
      record."publishedAt"
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

  private validateAnnouncement(input: AnnouncementInput, creating: boolean) {
    const status = input.status;
    if (
      !input.title?.trim() ||
      input.title.length > 180 ||
      !input.description?.trim() ||
      input.description.length > 10000 ||
      !input.imageUrl ||
      input.imageUrl.length > 2048 ||
      !input.category
    ) {
      throw new BadRequestException(
        'Title, description, image and category are required.',
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

  private async uniqueSlug(
    type: ContentType,
    title: string,
    fallback: string,
  ): Promise<string> {
    const base = slugify(title) || fallback;
    let candidate = base;
    let suffix = 2;
    while (await this.records.existsBy({ type, slug: candidate })) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  private managedSettingsKey(type: ContentType, details?: Record<string, unknown> | null) {
    if (type !== 'settings') return null;
    const key = details?.contentKey;
    return key === 'homepage' || key === 'church-information' ? key : null;
  }

  private validateLeader(
    type: ContentType,
    title: string,
    description: string | undefined,
    input?: Record<string, unknown> | null,
  ) {
    if (type !== 'leaders') return input ?? {};
    const details = { ...(input ?? {}) };
    const role = details.role;
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 180) {
      throw new BadRequestException('Enter a leader name no longer than 180 characters.');
    }
    if (typeof role !== 'string' || !role.trim() || role.trim().length > 120) {
      throw new BadRequestException('Enter a position or leadership title no longer than 120 characters.');
    }
    if (description != null && (typeof description !== 'string' || description.length > 10000)) {
      throw new BadRequestException('Biography must be no longer than 10,000 characters.');
    }
    const responsibilities = details.ministryResponsibilities;
    if (responsibilities != null && (typeof responsibilities !== 'string' || responsibilities.length > 5000)) {
      throw new BadRequestException('Ministry responsibilities must be no longer than 5,000 characters.');
    }
    const order = details.displayOrder == null || details.displayOrder === '' ? 0 : Number(details.displayOrder);
    if (!Number.isSafeInteger(order) || order < 0 || order > 100000) {
      throw new BadRequestException('Display order must be a whole number between 0 and 100,000.');
    }
    details.displayOrder = order;
    if (details.imageUrl != null && details.imageUrl !== '') this.validateImageSetting(details.imageUrl, 'Leader photograph');
    for (const [key, label, maxLength] of [['email', 'Email', 254], ['phone', 'Phone', 40]] as const) {
      const value = details[key];
      if (value == null || value === '') continue;
      if (typeof value !== 'string' || value.length > maxLength) {
        throw new BadRequestException(`${label} contact information is invalid.`);
      }
      if (key === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        throw new BadRequestException('Enter a valid public email address.');
      }
      if (key === 'phone' && !/^[+\d][\d\s().-]{5,38}$/.test(value)) {
        throw new BadRequestException('Enter a valid public phone number.');
      }
    }
    if (details.contactApproved != null && typeof details.contactApproved !== 'boolean') {
      throw new BadRequestException('Contact approval must be confirmed.');
    }
    if (details.contactApproved !== true) {
      delete details.email;
      delete details.phone;
    }
    return details;
  }

  private validateTestimonial(
    type: ContentType,
    title: string,
    description: string | null | undefined,
    input?: Record<string, unknown> | null,
    publishing = false,
  ) {
    if (type !== 'testimonials') return input ?? {};
    const details = { ...(input ?? {}) };
    if (
      details.consentApproved != null &&
      typeof details.consentApproved !== 'boolean'
    ) {
      throw new BadRequestException('Testimonial consent must be confirmed.');
    }
    if (publishing) {
      this.requireSettingText(title, 'testimonial attribution', 180, true);
      this.requireSettingText(description, 'testimonial', 10000, true);
      if (details.consentApproved !== true) {
        throw new BadRequestException(
          'Confirm permission before publishing a testimonial.',
        );
      }
    }
    if (details.imageUrl != null && details.imageUrl !== '') {
      this.validateImageSetting(details.imageUrl, 'Testimonial photograph');
    }
    return details;
  }

  private withoutUnapprovedLeaderContact(record: ContentRecord) {
    const details = { ...(record.details ?? {}) };
    if (details.contactApproved !== true) {
      delete details.email;
      delete details.phone;
    }
    delete details.contactApproved;
    return { ...record, details };
  }

  private settingsDraft(details: Record<string, unknown>) {
    const draft = details[this.settingsDraftKey];
    if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return null;
    const value = draft as { title?: unknown; description?: unknown; details?: unknown };
    if (typeof value.title !== 'string' || !value.details || typeof value.details !== 'object' || Array.isArray(value.details)) return null;
    return {
      title: value.title,
      description: typeof value.description === 'string' ? value.description : null,
      details: value.details as Record<string, unknown>,
    };
  }

  private publicSettingsDetails(details: Record<string, unknown>) {
    const { [this.settingsDraftKey]: _draft, ...publicDetails } = details;
    return publicDetails;
  }

  private withoutSettingsDraft(record: ContentRecord) {
    return { ...record, details: this.publicSettingsDetails(record.details ?? {}) };
  }

  private validateManagedSettings(
    type: ContentType,
    title: string,
    description?: string | null,
    details?: Record<string, unknown>,
  ) {
    const key = this.managedSettingsKey(type, details);
    if (!key || !details) return;
    this.requireSettingText(title, 'title', 180, true);
    if (description != null) this.requireSettingText(description, 'description', 5000, false);
    if (key === 'homepage') {
      const hero = this.objectSetting(details.hero, 'hero');
      this.validateImageSetting(hero.imageUrl, 'hero image');
      this.validateLinkSetting(hero.primaryCtaHref, 'primary hero link');
      this.validateLinkSetting(hero.secondaryCtaHref, 'secondary hero link');
      const sections = this.objectSetting(details.sections, 'sections');
      const sectionKeys = ['welcome', 'facts', 'services', 'about', 'ministries', 'events', 'announcements', 'sermons', 'testimonials', 'gallery', 'contact'];
      for (const sectionKey of sectionKeys) {
        const section = this.objectSetting(sections[sectionKey], `${sectionKey} section`);
        if (typeof section.visible !== 'boolean') throw new BadRequestException(`${sectionKey} visibility must be a boolean`);
        if (!Number.isInteger(section.order) || Number(section.order) < 0 || Number(section.order) > 100) {
          throw new BadRequestException(`${sectionKey} order must be between 0 and 100`);
        }
        this.requireSettingText(section.heading, `${sectionKey} heading`, 180, false);
        this.requireSettingText(section.description, `${sectionKey} description`, 500, false);
        if (sectionKey === 'welcome') {
          this.validateImageSetting(section.imageUrl, 'welcome image');
          this.validateLinkSetting(section.primaryCtaHref, 'welcome section link');
        }
        if (sectionKey === 'about') {
          this.validateLinkSetting(section.primaryCtaHref, 'about section link');
        }
        if (sectionKey === 'contact') {
          this.validateLinkSetting(section.primaryCtaHref, 'primary contact link');
          this.validateLinkSetting(section.secondaryCtaHref, 'secondary contact link');
        }
        if (sectionKey === 'ministries') {
          const ids = section.featuredMinistryIds;
          if (!Array.isArray(ids) || ids.length > 12 || ids.some((id) => typeof id !== 'string' || id.length > 80)) {
            throw new BadRequestException('Choose up to 12 featured ministry records');
          }
        }
        if (['events', 'announcements', 'sermons', 'testimonials', 'gallery'].includes(sectionKey) &&
            (!Number.isInteger(section.limit) || Number(section.limit) < 1 || Number(section.limit) > 12)) {
          throw new BadRequestException(`${sectionKey} display count must be between 1 and 12`);
        }
      }
    } else {
      const profile = this.objectSetting(details.profile, 'church profile');
      this.requireSettingText(profile.history, 'church history', 10000, false);
      this.validateImageSetting(profile.imageUrl, 'church profile image');
      for (const field of ['city', 'country', 'address', 'phone', 'email', 'directionsUrl', 'mapUrl']) {
        const value = details.contact && typeof details.contact === 'object'
          ? (details.contact as Record<string, unknown>)[field]
          : undefined;
        this.requireSettingText(value, `contact ${field}`, field === 'address' || field === 'mapUrl' ? 1000 : 300, false);
      }
      const contact = this.objectSetting(details.contact, 'contact information');
      this.validateLinkSetting(contact.directionsUrl, 'directions link');
      this.validateLinkSetting(contact.mapUrl, 'map link');
      for (const field of ['mission', 'vision']) {
        const statement = this.objectSetting(details[field], field);
        this.requireSettingText(statement.heading, `${field} heading`, 180, false);
        this.requireSettingText(statement.statement, `${field} statement`, 3000, false);
        this.requireSettingText(statement.description, `${field} description`, 5000, false);
        if (typeof statement.visible !== 'boolean') throw new BadRequestException(`${field} visibility must be a boolean`);
      }
      this.validateOrderedEntries(details.coreValues, 'core values');
      this.validateOrderedEntries(details.beliefs, 'beliefs');
      const socials = details.socialLinks;
      if (!Array.isArray(socials) || socials.length > 12) throw new BadRequestException('Add no more than 12 social links');
      for (const [index, item] of socials.entries()) {
        const link = this.objectSetting(item, `social link ${index + 1}`);
        this.requireSettingText(link.label, `social link ${index + 1} label`, 80, false);
        this.validateLinkSetting(link.url, `social link ${index + 1}`);
        if (typeof link.visible !== 'boolean') throw new BadRequestException('Social link visibility must be a boolean');
      }
    }
  }

  private objectSetting(value: unknown, label: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException(`Enter valid ${label} settings`);
    }
    return value as Record<string, unknown>;
  }

  private requireSettingText(value: unknown, label: string, maxLength: number, required: boolean) {
    if (value == null && !required) return;
    if (typeof value !== 'string' || (required && !value.trim()) || value.length > maxLength) {
      throw new BadRequestException(`${label} must be ${required ? 'present and ' : ''}no longer than ${maxLength} characters`);
    }
  }

  private validateOrderedEntries(value: unknown, label: string) {
    if (!Array.isArray(value) || value.length > 50) throw new BadRequestException(`Add no more than 50 ${label}`);
    for (const [index, item] of value.entries()) {
      const entry = this.objectSetting(item, `${label} item ${index + 1}`);
      this.requireSettingText(entry.title, `${label} title`, 180, true);
      this.requireSettingText(entry.description, `${label} description`, 2000, false);
      if (!Number.isInteger(entry.order) || Number(entry.order) !== index) {
        throw new BadRequestException(`${label} must use consecutive display order`);
      }
      if (typeof entry.visible !== 'boolean') throw new BadRequestException(`${label} visibility must be a boolean`);
    }
  }

  private validateImageSetting(value: unknown, label: string) {
    if (value == null || value === '') return;
    if (typeof value !== 'string') throw new BadRequestException(`${label} must be uploaded through the backend media service`);
    let url: URL;
    try { url = new URL(value); } catch {
      throw new BadRequestException(`${label} must be uploaded through the backend media service`);
    }
    const cloudinary = isCloudinaryImageUrl(
      value,
      this.config?.get<string>('CLOUDINARY_URL'),
      this.config?.get<string>('CLOUDINARY_DELIVERY_HOST'),
    );
    if (!cloudinary) {
      if (url.hostname.includes('unsplash.com')) return;
      throw new BadRequestException(`${label} must be uploaded to Cloudinary through the backend media service`);
    }
  }

  private validateLinkSetting(value: unknown, label: string) {
    if (value == null || value === '') return;
    if (typeof value !== 'string') throw new BadRequestException(`${label} must be a site path or secure HTTPS URL`);
    if (value.startsWith('/') && !value.startsWith('//')) return;
    try {
      const url = new URL(value);
      if (url.protocol === 'https:' && !url.username && !url.password) return;
    } catch { /* Convert invalid values into a field-specific validation error. */ }
    throw new BadRequestException(`${label} must be a site path or secure HTTPS URL`);
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
    if (!isCloudinaryImageUrl(
      value,
      this.config?.get<string>('CLOUDINARY_URL'),
      this.config?.get<string>('CLOUDINARY_DELIVERY_HOST'),
    )) {
      if (image.hostname.includes('unsplash.com')) return;
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
    input: AnnouncementInput,
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
