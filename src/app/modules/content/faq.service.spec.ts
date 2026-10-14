/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/require-await, @typescript-eslint/no-unnecessary-type-assertion */
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));
import { BadRequestException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminFaqsController } from './admin-faqs.controller';
import { FaqService } from './faq.service';
import { ContentRecord } from './content.entity';

const makeRecord = (overrides: Partial<ContentRecord> = {}): ContentRecord =>
  ({
    id: '550e8400-e29b-41d4-a716-446655440000',
    type: 'faqs',
    title: 'Service times?',
    slug: 'service-times',
    description: 'Please contact the church for current details.',
    details: { category: 'Church Services', displayOrder: 0, status: 'DRAFT' },
    published: false,
    publishedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }) as ContentRecord;

function setup(record = makeRecord()) {
  const events = { emit: jest.fn() };
  const repository: any = {
    create: jest.fn((input) => ({ ...input, id: record.id })),
    save: jest.fn(async (value) => ({
      ...value,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    })),
    findOneBy: jest.fn(async () => record),
    find: jest.fn(async () => []),
    existsBy: jest.fn(async () => false),
    remove: jest.fn(async () => undefined),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => null),
      getMany: jest.fn(async () => [record]),
    })),
    manager: {
      transaction: jest.fn(async (work) =>
        work({ save: jest.fn(async (value) => value) }),
      ),
    },
  };
  return {
    service: new FaqService(repository, events as any),
    repository,
    events,
    record,
  };
}

describe('FaqService', () => {
  it('requires JWT authorization for every FAQ management route', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminFaqsController)).toContain(
      JwtAuthGuard,
    );
  });
  it('creates trimmed FAQs as drafts by default', async () => {
    const { service, repository } = setup();
    const created = await service.create({
      question: '  What time are services? ',
      answer: '  Contact the church for current details.  ',
    });
    expect(created.question).toBe('What time are services?');
    expect(created.answer).toBe('Contact the church for current details.');
    expect(created.status).toBe('DRAFT');
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        published: false,
        details: expect.objectContaining({ displayOrder: 0 }),
      }),
    );
  });
  it('rejects duplicate questions and unsafe HTML answers', async () => {
    const duplicate = setup();
    duplicate.repository.createQueryBuilder.mockImplementation(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => duplicate.record),
    }));
    await expect(
      duplicate.service.create({
        question: 'Service times?',
        answer: 'An answer',
      }),
    ).rejects.toThrow(BadRequestException);
    const unsafe = setup();
    await expect(
      unsafe.service.create({
        question: 'A question?',
        answer: '<script>alert(1)</script>',
      }),
    ).rejects.toThrow(BadRequestException);
  });
  it('updates an answer and can publish or unpublish its record', async () => {
    const { service, record, repository, events } = setup();
    const changed = await service.update(record.id, {
      answer: 'Approved updated answer.',
    });
    expect(changed.answer).toBe('Approved updated answer.');
    expect((await service.setStatus(record.id, 'PUBLISHED')).published).toBe(
      true,
    );
    expect((await service.setStatus(record.id, 'UNPUBLISHED')).published).toBe(
      false,
    );
    expect(events.emit).toHaveBeenCalledWith(
      'content.updated',
      expect.objectContaining({ type: 'faqs' }),
    );
    expect(repository.save).toHaveBeenCalledTimes(3);
  });
  it('reorders all FAQ records transactionally and deletes by identifier', async () => {
    const first = makeRecord();
    const second = makeRecord({
      id: '650e8400-e29b-41d4-a716-446655440001',
      title: 'Where is the church?',
      slug: 'church-location',
    });
    const { service, repository } = setup();
    repository.find.mockResolvedValue([first, second]);
    await service.reorder([second.id, first.id]);
    expect(repository.manager.transaction).toHaveBeenCalled();
    await service.remove(first.id);
    expect(repository.remove).toHaveBeenCalledWith(
      expect.objectContaining({ id: first.id, type: 'faqs' }),
    );
  });
  it('lists published FAQ records only for public visitors', async () => {
    const { service, repository } = setup(
      makeRecord({
        published: true,
        details: { displayOrder: 2, status: 'PUBLISHED' },
      }),
    );
    expect((await service.list({}, false)).items).toHaveLength(1);
    expect(
      repository.createQueryBuilder.mock.results[0].value.andWhere,
    ).toHaveBeenCalledWith('record.published = true');
  });
});
