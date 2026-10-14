import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisPubSubService } from '../../../libs/pubsub/redis-pubsub.service';
import { DOMAIN_EVENTS } from '../../../utils/constants/events';
import { slugify } from '../../../utils/slug';
import {
  CreateSermonDto,
  SermonFilterQueryDto,
  UpdateSermonDto,
} from './dto/sermon.dto';
import { CreateSpeakerDto, UpdateSpeakerDto } from './dto/speaker.dto';
import { PublicationStatus, Sermon } from './entities/sermon.entity';
import { Speaker } from './entities/speaker.entity';

function detectBibleBook(scripture?: string | null): string | null {
  if (!scripture) return null;
  const match = scripture.trim().match(/^([1-3]\s+)?[A-Za-z]+/);
  return match ? match[0] : null;
}

@Injectable()
export class SermonsService {
  constructor(
    @InjectRepository(Sermon)
    private readonly sermonRepository: Repository<Sermon>,
    @InjectRepository(Speaker)
    private readonly speakerRepository: Repository<Speaker>,
    private readonly pubsub: RedisPubSubService,
  ) {}

  // ==========================================
  // PUBLIC METHODS
  // ==========================================

  async listPublished(query?: SermonFilterQueryDto) {
    const qb = this.sermonRepository
      .createQueryBuilder('sermon')
      .leftJoinAndSelect('sermon.speakerRef', 'speakerRef')
      .where('sermon.status = :status', {
        status: PublicationStatus.PUBLISHED,
      });

    if (query?.search?.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        "(LOWER(sermon.title) LIKE :term OR LOWER(sermon.speaker) LIKE :term OR LOWER(COALESCE(sermon.scripture, '')) LIKE :term OR LOWER(sermon.category) LIKE :term OR LOWER(COALESCE(sermon.series, '')) LIKE :term OR LOWER(COALESCE(sermon.description, '')) LIKE :term OR LOWER(COALESCE(sermon.bibleBook, '')) LIKE :term)",
        { term },
      );
    }

    if (query?.category?.trim() && query.category !== 'all') {
      qb.andWhere('LOWER(sermon.category) = LOWER(:cat)', {
        cat: query.category.trim(),
      });
    }

    if (query?.speaker?.trim() && query.speaker !== 'all') {
      qb.andWhere(
        '(LOWER(sermon.speaker) = LOWER(:spk) OR LOWER(speakerRef.name) = LOWER(:spk))',
        { spk: query.speaker.trim() },
      );
    }

    if (query?.speakerId) {
      qb.andWhere('sermon.speakerId = :speakerId', {
        speakerId: query.speakerId,
      });
    }

    if (query?.bibleBook?.trim() && query.bibleBook !== 'all') {
      qb.andWhere('LOWER(sermon.bibleBook) = LOWER(:book)', {
        book: query.bibleBook.trim(),
      });
    }

    if (query?.series?.trim() && query.series !== 'all') {
      qb.andWhere('LOWER(sermon.series) = LOWER(:series)', {
        series: query.series.trim(),
      });
    }

    if (query?.ministry?.trim() && query.ministry !== 'all') {
      qb.andWhere('LOWER(sermon.ministry) = LOWER(:ministry)', {
        ministry: query.ministry.trim(),
      });
    }

    if (query?.service?.trim() && query.service !== 'all') {
      qb.andWhere('LOWER(sermon.service) = LOWER(:service)', {
        service: query.service.trim(),
      });
    }

    if (query?.year?.trim()) {
      qb.andWhere('EXTRACT(YEAR FROM sermon.date) = :year', {
        year: parseInt(query.year.trim(), 10),
      });
    }

    qb.orderBy('sermon.date', 'DESC').addOrderBy('sermon.createdAt', 'DESC');

    return qb.getMany();
  }

  /** Backward-compatible alias for listing published sermons */
  async list() {
    return this.listPublished();
  }

  async getPublishedBySlugOrId(slugOrId: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        slugOrId,
      );

    const qb = this.sermonRepository
      .createQueryBuilder('sermon')
      .leftJoinAndSelect('sermon.speakerRef', 'speakerRef')
      .where('sermon.status = :status', {
        status: PublicationStatus.PUBLISHED,
      });

    if (isUuid) {
      qb.andWhere('(sermon.id = :identifier OR sermon.slug = :identifier)', {
        identifier: slugOrId,
      });
    } else {
      qb.andWhere('sermon.slug = :identifier', { identifier: slugOrId });
    }

    const sermon = await qb.getOne();
    if (!sermon) {
      throw new NotFoundException('Published sermon was not found');
    }

    // Load related sermons (same series, or same category, or same speaker)
    const related = await this.sermonRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.speakerRef', 'speakerRef')
      .where('s.status = :status AND s.id != :currentId', {
        status: PublicationStatus.PUBLISHED,
        currentId: sermon.id,
      })
      .andWhere(
        '( (s.series IS NOT NULL AND s.series = :series) OR s.category = :category OR s.speaker = :speaker )',
        {
          series: sermon.series || '',
          category: sermon.category,
          speaker: sermon.speaker,
        },
      )
      .orderBy('s.date', 'DESC')
      .take(3)
      .getMany();

    return {
      ...sermon,
      relatedSermons: related,
    };
  }

  /** Backward-compatible alias for get by id */
  async get(id: string) {
    return this.getPublishedBySlugOrId(id);
  }

  async getFiltersMeta() {
    const publishedSermons = await this.sermonRepository.find({
      where: { status: PublicationStatus.PUBLISHED },
      select: {
        category: true,
        speaker: true,
        bibleBook: true,
        series: true,
        ministry: true,
        service: true,
        date: true,
      },
    });

    const categories = Array.from(
      new Set(publishedSermons.map((s) => s.category).filter(Boolean)),
    ).sort();

    const speakers = Array.from(
      new Set(publishedSermons.map((s) => s.speaker).filter(Boolean)),
    ).sort();

    const series = Array.from(
      new Set(
        publishedSermons
          .map((s) => s.series)
          .filter((v): v is string => Boolean(v)),
      ),
    ).sort();

    const bibleBooks = Array.from(
      new Set(
        publishedSermons
          .map((s) => s.bibleBook)
          .filter((v): v is string => Boolean(v)),
      ),
    ).sort();

    const ministries = Array.from(
      new Set(
        publishedSermons
          .map((s) => s.ministry)
          .filter((v): v is string => Boolean(v)),
      ),
    ).sort();

    const services = Array.from(
      new Set(
        publishedSermons
          .map((s) => s.service)
          .filter((v): v is string => Boolean(v)),
      ),
    ).sort();

    return {
      categories,
      speakers,
      series,
      bibleBooks,
      ministries,
      services,
      totalPublished: publishedSermons.length,
    };
  }

  // ==========================================
  // ADMIN METHODS (SERMONS)
  // ==========================================

  async listForAdministration(query?: SermonFilterQueryDto) {
    const qb = this.sermonRepository
      .createQueryBuilder('sermon')
      .leftJoinAndSelect('sermon.speakerRef', 'speakerRef');

    if (query?.status) {
      qb.andWhere('sermon.status = :status', { status: query.status });
    }

    if (query?.category?.trim() && query.category !== 'all') {
      qb.andWhere('LOWER(sermon.category) = LOWER(:cat)', {
        cat: query.category.trim(),
      });
    }

    if (query?.speaker?.trim() && query.speaker !== 'all') {
      qb.andWhere(
        '(LOWER(sermon.speaker) = LOWER(:spk) OR LOWER(speakerRef.name) = LOWER(:spk))',
        { spk: query.speaker.trim() },
      );
    }

    if (query?.search?.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        "(LOWER(sermon.title) LIKE :term OR LOWER(sermon.speaker) LIKE :term OR LOWER(COALESCE(sermon.scripture, '')) LIKE :term OR LOWER(sermon.category) LIKE :term OR LOWER(COALESCE(sermon.series, '')) LIKE :term)",
        { term },
      );
    }

    qb.orderBy('sermon.date', 'DESC').addOrderBy('sermon.createdAt', 'DESC');

    return qb.getMany();
  }

  async getForAdmin(id: string) {
    const row = await this.sermonRepository.findOne({
      where: { id },
      relations: {
        speakerRef: true,
      },
    });
    if (!row) throw new NotFoundException('Sermon was not found');
    return row;
  }

  async create(dto: CreateSermonDto) {
    // Generate unique slug
    const desiredSlug = dto.slug?.trim() || dto.title;
    const slug = await this.generateUniqueSermonSlug(desiredSlug);

    // Auto-detect bible book if not provided
    const bibleBook = dto.bibleBook?.trim() || detectBibleBook(dto.scripture);

    // Resolve speaker relationship
    let speakerName = dto.speaker?.trim();
    let speakerId = dto.speakerId || null;

    if (speakerId) {
      const speaker = await this.speakerRepository.findOneBy({ id: speakerId });
      if (speaker) {
        speakerName = speaker.name;
      }
    } else if (speakerName) {
      // Find or auto-link existing speaker by name if matches
      const existingSpeaker = await this.speakerRepository
        .createQueryBuilder('spk')
        .where('LOWER(spk.name) = LOWER(:name)', { name: speakerName })
        .getOne();
      if (existingSpeaker) {
        speakerId = existingSpeaker.id;
      }
    }

    const sermon = this.sermonRepository.create({
      ...dto,
      title: dto.title.trim(),
      slug,
      speaker: speakerName,
      speakerId,
      bibleBook,
      series: dto.series?.trim() || null,
      ministry: dto.ministry?.trim() || null,
      service: dto.service?.trim() || null,
      allowDownload: dto.allowDownload ?? true,
      status: dto.status ?? PublicationStatus.DRAFT,
    });

    const saved = await this.sermonRepository.save(sermon);

    await this.pubsub.publish(DOMAIN_EVENTS.SERMON_CREATED, {
      id: saved.id,
      title: saved.title,
      slug: saved.slug,
      status: saved.status,
    });

    return this.getForAdmin(saved.id);
  }

  async update(id: string, dto: UpdateSermonDto) {
    const sermon = await this.sermonRepository.findOneBy({ id });
    if (!sermon) throw new NotFoundException('Sermon was not found');

    if (dto.slug && dto.slug.trim() !== sermon.slug) {
      sermon.slug = await this.generateUniqueSermonSlug(dto.slug, id);
    } else if (
      dto.title &&
      dto.title !== sermon.title &&
      !dto.slug &&
      !sermon.slug
    ) {
      sermon.slug = await this.generateUniqueSermonSlug(dto.title, id);
    }

    if (dto.scripture !== undefined) {
      sermon.scripture = dto.scripture;
      if (!dto.bibleBook) {
        sermon.bibleBook = detectBibleBook(dto.scripture);
      }
    }

    if (dto.bibleBook !== undefined) {
      sermon.bibleBook = dto.bibleBook?.trim() || null;
    }

    if (dto.speakerId !== undefined) {
      sermon.speakerId = dto.speakerId || null;
      if (sermon.speakerId) {
        const speaker = await this.speakerRepository.findOneBy({
          id: sermon.speakerId,
        });
        if (speaker) {
          sermon.speaker = speaker.name;
        }
      }
    }

    if (dto.speaker !== undefined && !dto.speakerId) {
      sermon.speaker = dto.speaker.trim();
    }

    if (dto.title !== undefined) sermon.title = dto.title.trim();
    if (dto.date !== undefined) sermon.date = dto.date;
    if (dto.category !== undefined) sermon.category = dto.category.trim();
    if (dto.series !== undefined) sermon.series = dto.series?.trim() || null;
    if (dto.ministry !== undefined)
      sermon.ministry = dto.ministry?.trim() || null;
    if (dto.service !== undefined) sermon.service = dto.service?.trim() || null;
    if (dto.description !== undefined) sermon.description = dto.description;
    if (dto.thumbnailUrl !== undefined) sermon.thumbnailUrl = dto.thumbnailUrl;
    if (dto.audioUrl !== undefined) sermon.audioUrl = dto.audioUrl;
    if (dto.videoUrl !== undefined) sermon.videoUrl = dto.videoUrl;
    if (dto.allowDownload !== undefined)
      sermon.allowDownload = dto.allowDownload;
    if (dto.status !== undefined) sermon.status = dto.status;

    await this.sermonRepository.save(sermon);
    return this.getForAdmin(id);
  }

  async publish(id: string) {
    const sermon = await this.sermonRepository.findOneBy({ id });
    if (!sermon) throw new NotFoundException('Sermon was not found');
    sermon.status = PublicationStatus.PUBLISHED;
    await this.sermonRepository.save(sermon);
    return this.getForAdmin(id);
  }

  async unpublish(id: string) {
    const sermon = await this.sermonRepository.findOneBy({ id });
    if (!sermon) throw new NotFoundException('Sermon was not found');
    sermon.status = PublicationStatus.DRAFT;
    await this.sermonRepository.save(sermon);
    return this.getForAdmin(id);
  }

  async remove(id: string) {
    const sermon = await this.sermonRepository.findOneBy({ id });
    if (!sermon) throw new NotFoundException('Sermon was not found');
    await this.sermonRepository.remove(sermon);
    return { id, message: 'Sermon removed successfully' };
  }

  // ==========================================
  // SPEAKER MANAGEMENT
  // ==========================================

  async listSpeakers() {
    const speakers = await this.speakerRepository
      .createQueryBuilder('spk')
      .leftJoin('spk.sermons', 'sermon')
      .select([
        'spk.id',
        'spk.name',
        'spk.slug',
        'spk.title',
        'spk.bio',
        'spk.photoUrl',
        'spk.email',
        'spk.phone',
        'spk.socialLinks',
        'spk.createdAt',
        'spk.updatedAt',
      ])
      .addSelect('COUNT(sermon.id)', 'sermonCount')
      .groupBy('spk.id')
      .orderBy('spk.name', 'ASC')
      .getRawAndEntities();

    return speakers.entities.map((spk, index) => ({
      ...spk,
      sermonCount: parseInt(speakers.raw[index]?.sermonCount || '0', 10),
    }));
  }

  async getSpeaker(idOrSlug: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );

    const qb = this.speakerRepository
      .createQueryBuilder('spk')
      .leftJoinAndSelect(
        'spk.sermons',
        'sermon',
        'sermon.status = :published',
        { published: PublicationStatus.PUBLISHED },
      );

    if (isUuid) {
      qb.where('spk.id = :identifier OR spk.slug = :identifier', {
        identifier: idOrSlug,
      });
    } else {
      qb.where('spk.slug = :identifier', { identifier: idOrSlug });
    }

    const speaker = await qb.getOne();
    if (!speaker) throw new NotFoundException('Speaker was not found');
    return speaker;
  }

  async createSpeaker(dto: CreateSpeakerDto) {
    const baseSlug = slugify(dto.slug || dto.name);
    const slug = await this.generateUniqueSpeakerSlug(baseSlug);

    const speaker = this.speakerRepository.create({
      ...dto,
      name: dto.name.trim(),
      slug,
      title: dto.title?.trim() || null,
      bio: dto.bio?.trim() || null,
      photoUrl: dto.photoUrl?.trim() || null,
      email: dto.email?.trim() || null,
      phone: dto.phone?.trim() || null,
      socialLinks: dto.socialLinks || {},
    });

    return this.speakerRepository.save(speaker);
  }

  async updateSpeaker(id: string, dto: UpdateSpeakerDto) {
    const speaker = await this.speakerRepository.findOneBy({ id });
    if (!speaker) throw new NotFoundException('Speaker was not found');

    if (dto.slug && dto.slug !== speaker.slug) {
      speaker.slug = await this.generateUniqueSpeakerSlug(dto.slug, id);
    } else if (dto.name && dto.name !== speaker.name && !dto.slug) {
      speaker.slug = await this.generateUniqueSpeakerSlug(dto.name, id);
    }

    if (dto.name !== undefined) speaker.name = dto.name.trim();
    if (dto.title !== undefined) speaker.title = dto.title?.trim() || null;
    if (dto.bio !== undefined) speaker.bio = dto.bio?.trim() || null;
    if (dto.photoUrl !== undefined)
      speaker.photoUrl = dto.photoUrl?.trim() || null;
    if (dto.email !== undefined) speaker.email = dto.email?.trim() || null;
    if (dto.phone !== undefined) speaker.phone = dto.phone?.trim() || null;
    if (dto.socialLinks !== undefined)
      speaker.socialLinks = dto.socialLinks || {};

    const saved = await this.speakerRepository.save(speaker);

    // If speaker name changed, update denormalized speaker name in linked sermons
    if (dto.name) {
      await this.sermonRepository.update(
        { speakerId: id },
        { speaker: saved.name },
      );
    }

    return saved;
  }

  async removeSpeaker(id: string) {
    const speaker = await this.speakerRepository.findOneBy({ id });
    if (!speaker) throw new NotFoundException('Speaker was not found');
    // sermons will have speakerId set to null via foreign key ON DELETE SET NULL, but retain speaker text
    await this.speakerRepository.remove(speaker);
    return { id, message: 'Speaker deleted successfully' };
  }

  // ==========================================
  // SLUG HELPERS
  // ==========================================

  private async generateUniqueSermonSlug(
    titleOrSlug: string,
    excludeId?: string,
  ): Promise<string> {
    const base = slugify(titleOrSlug) || 'sermon';
    let candidate = base;
    let counter = 1;

    while (true) {
      const qb = this.sermonRepository
        .createQueryBuilder('s')
        .where('s.slug = :candidate', { candidate });
      if (excludeId) {
        qb.andWhere('s.id != :excludeId', { excludeId });
      }
      const existing = await qb.getOne();
      if (!existing) return candidate;
      candidate = `${base}-${counter++}`;
    }
  }

  private async generateUniqueSpeakerSlug(
    nameOrSlug: string,
    excludeId?: string,
  ): Promise<string> {
    const base = slugify(nameOrSlug) || 'speaker';
    let candidate = base;
    let counter = 1;

    while (true) {
      const qb = this.speakerRepository
        .createQueryBuilder('spk')
        .where('spk.slug = :candidate', { candidate });
      if (excludeId) {
        qb.andWhere('spk.id != :excludeId', { excludeId });
      }
      const existing = await qb.getOne();
      if (!existing) return candidate;
      candidate = `${base}-${counter++}`;
    }
  }
}
