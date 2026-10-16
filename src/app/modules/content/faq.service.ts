import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { slugify } from '../../../utils/slug';
import { ContentRecord } from './content.entity';
import { FAQ_CATEGORIES, FAQ_STATUSES, type FaqStatus } from './faq.constants';
import { CreateFaqDto, UpdateFaqDto } from './faq.dto';

type Filters = { category?: string; status?: string; search?: string };
@Injectable()
export class FaqService {
  constructor(
    @InjectRepository(ContentRecord)
    private readonly records: Repository<ContentRecord>,
    private readonly events: EventEmitter2,
  ) {}

  async list(filters: Filters = {}, includeUnpublished = false) {
    const query = this.records
      .createQueryBuilder('record')
      .where('record.type = :type', { type: 'faqs' });
    if (!includeUnpublished) query.andWhere('record.published = true');
    const records = await query
      .orderBy('record.createdAt', 'ASC')
      .take(500)
      .getMany();
    let items = records.map((record) => this.present(record));
    items = items.sort(
      (left, right) =>
        left.displayOrder - right.displayOrder ||
        left.createdAt.getTime() - right.createdAt.getTime(),
    );
    if (filters.category) {
      this.validateCategory(filters.category);
      items = items.filter((item) => item.category === filters.category);
    }
    if (filters.search?.trim()) {
      const search = filters.search.trim().toLocaleLowerCase();
      items = items.filter((item) =>
        `${item.question} ${item.answer}`.toLocaleLowerCase().includes(search),
      );
    }
    if (filters.status) {
      this.validateStatus(filters.status);
      items = items.filter((item) => item.status === filters.status);
    }
    return { items, total: items.length };
  }

  async create(input: CreateFaqDto) {
    const question = this.text(input.question, 'question', 180);
    const answer = this.text(input.answer, 'answer', 10000);
    await this.uniqueQuestion(question);
    if (input.category) this.validateCategory(input.category);
    const status = this.validateStatus(input.status ?? 'DRAFT');
    const record = await this.records.save(
      this.records.create({
        type: 'faqs',
        title: question,
        slug: await this.uniqueSlug(question),
        description: answer,
        details: {
          category: input.category ?? null,
          displayOrder: input.displayOrder ?? (await this.nextOrder()),
          status,
        },
        published: status === 'PUBLISHED',
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
      }),
    );
    this.emit('content.created', record);
    return this.present(record);
  }

  async update(id: string, input: UpdateFaqDto) {
    const record = await this.find(id);
    const question =
      input.question === undefined
        ? record.title
        : this.text(input.question, 'question', 180);
    const answer =
      input.answer === undefined
        ? (record.description ?? '')
        : this.text(input.answer, 'answer', 10000);
    if (question.toLocaleLowerCase() !== record.title.toLocaleLowerCase())
      await this.uniqueQuestion(question, id);
    if (input.category) this.validateCategory(input.category);
    const status = this.validateStatus(input.status ?? this.statusOf(record));
    if (question !== record.title)
      record.slug = await this.uniqueSlug(question);
    record.title = question;
    record.description = answer;
    record.details = {
      ...record.details,
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.displayOrder !== undefined
        ? { displayOrder: input.displayOrder }
        : {}),
      status,
    };
    record.published = status === 'PUBLISHED';
    record.publishedAt = record.published
      ? (record.publishedAt ?? new Date())
      : null;
    const saved = await this.records.save(record);
    this.emit('content.updated', saved);
    return this.present(saved);
  }

  async setStatus(id: string, status: string) {
    const record = await this.find(id);
    const next = this.validateStatus(status);
    if (next === 'PUBLISHED') {
      this.text(record.title, 'question', 180);
      this.text(record.description ?? '', 'answer', 10000);
    }
    record.details = { ...record.details, status: next };
    record.published = next === 'PUBLISHED';
    record.publishedAt = record.published
      ? (record.publishedAt ?? new Date())
      : null;
    const saved = await this.records.save(record);
    this.emit('content.updated', saved);
    return this.present(saved);
  }

  async reorder(ids: string[]) {
    if (new Set(ids).size !== ids.length)
      throw new BadRequestException('FAQ order contains duplicate IDs.');
    const records = await this.records.find({
      where: { type: 'faqs' },
      take: 500,
    });
    if (
      records.length !== ids.length ||
      ids.some((id) => !records.some((record) => record.id === id))
    ) {
      throw new BadRequestException(
        'The order must include every FAQ. Refresh the list and try again.',
      );
    }
    const byId = new Map(records.map((record) => [record.id, record]));
    await this.records.manager.transaction(async (manager) => {
      for (const [displayOrder, id] of ids.entries()) {
        const record = byId.get(id)!;
        record.details = { ...record.details, displayOrder };
        await manager.save(record);
      }
    });
    this.events.emit('content.updated', { id: 'faqs', type: 'faqs' });
    return this.list({}, true);
  }

  async remove(id: string) {
    const record = await this.find(id);
    await this.records.remove(record);
    this.emit('content.deleted', record);
    return { id };
  }

  private async find(id: string) {
    const record = await this.records.findOneBy({ id, type: 'faqs' });
    if (!record) throw new NotFoundException('FAQ was not found.');
    return record;
  }
  private statusOf(record: ContentRecord): FaqStatus {
    const status = record.details?.status;
    return typeof status === 'string' &&
      (FAQ_STATUSES as readonly string[]).includes(status)
      ? (status as FaqStatus)
      : record.published
        ? 'PUBLISHED'
        : 'DRAFT';
  }
  private present(record: ContentRecord) {
    return {
      ...record,
      question: record.title,
      answer: record.description ?? '',
      category:
        typeof record.details?.category === 'string' &&
        (FAQ_CATEGORIES as readonly string[]).includes(record.details.category)
          ? record.details.category
          : null,
      displayOrder:
        typeof record.details?.displayOrder === 'number' &&
        Number.isSafeInteger(record.details.displayOrder) &&
        record.details.displayOrder >= 0
          ? record.details.displayOrder
          : 0,
      status: this.statusOf(record),
    };
  }
  private text(value: string, label: string, limit: number) {
    const clean = value.trim();
    if (!clean || clean.length > limit)
      throw new BadRequestException(
        `FAQ ${label} is required and must be ${limit} characters or fewer.`,
      );
    if (/<\/?[a-z][^>]*>/i.test(clean))
      throw new BadRequestException(
        `FAQ ${label} must be plain text; HTML is not allowed.`,
      );
    return clean;
  }
  private validateCategory(category: string) {
    if (!(FAQ_CATEGORIES as readonly string[]).includes(category))
      throw new BadRequestException('Choose a valid FAQ category.');
  }
  private validateStatus(status: string): FaqStatus {
    if (!(FAQ_STATUSES as readonly string[]).includes(status))
      throw new BadRequestException('Choose a valid FAQ publication status.');
    return status as FaqStatus;
  }
  private async uniqueQuestion(question: string, exceptId?: string) {
    const query = this.records
      .createQueryBuilder('record')
      .where("record.type = 'faqs'")
      .andWhere('LOWER(BTRIM(record.title)) = LOWER(:question)', { question });
    if (exceptId) query.andWhere('record.id != :exceptId', { exceptId });
    if (await query.getOne())
      throw new BadRequestException('A FAQ with this question already exists.');
  }
  private async uniqueSlug(question: string) {
    const base = slugify(question) || 'faq';
    let slug = base;
    let suffix = 2;
    while (await this.records.existsBy({ type: 'faqs', slug }))
      slug = `${base}-${suffix++}`;
    return slug;
  }
  private async nextOrder() {
    const records = await this.records.find({
      where: { type: 'faqs' },
      select: { details: true },
      take: 500,
    });
    return (
      records.reduce((max, item) => {
        const value = item.details?.displayOrder;
        return typeof value === 'number' &&
          Number.isSafeInteger(value) &&
          value >= 0
          ? Math.max(max, value)
          : max;
      }, -1) + 1
    );
  }
  private emit(event: string, record: ContentRecord) {
    this.events.emit(event, { id: record.id, type: 'faqs', slug: record.slug });
  }
}
