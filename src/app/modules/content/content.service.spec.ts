import { BadRequestException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { Repository } from 'typeorm';
import { CreateAnnouncementDto } from './announcement.dto';
import { ContentRecord } from './content.entity';
import { ContentService } from './content.service';

jest.mock('@nestjs/event-emitter');
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

const publicationDate = '2030-10-10T09:00:00.000Z';
const imageUrl =
  'https://res.cloudinary.com/church/image/upload/church-website/announcement.jpg';

function validAnnouncement(
  overrides: Partial<CreateAnnouncementDto> = {},
): CreateAnnouncementDto {
  return {
    title: 'Sunday worship',
    description: 'Join us this Sunday.',
    imageUrl,
    category: 'WORSHIP_SERVICES',
    publicationDate,
    expiryDate: null,
    status: 'DRAFT',
    ...overrides,
  };
}

describe('ContentService announcement management', () => {
  let service: ContentService;
  let saved: ContentRecord | undefined;
  let existsBy: jest.Mock;
  let findOneBy: jest.Mock;
  let save: jest.Mock;
  let events: { emit: jest.Mock };
  let announcementQuery: {
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getManyAndCount: jest.Mock;
  };
  let announcementWhereSql: string[];
  let announcementOrderSql: string[];

  beforeEach(() => {
    saved = undefined;
    existsBy = jest.fn().mockResolvedValue(false);
    findOneBy = jest
      .fn()
      .mockImplementation(() => Promise.resolve(saved ?? null));
    save = jest.fn().mockImplementation((record: ContentRecord) => {
      saved = Object.assign(record, {
        id: 'announcement-id',
        createdAt: new Date('2030-01-01T00:00:00.000Z'),
        updatedAt: new Date('2030-01-01T00:00:00.000Z'),
      });
      return Promise.resolve(saved);
    });
    events = { emit: jest.fn() };
    announcementWhereSql = [];
    announcementOrderSql = [];
    announcementQuery = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn((condition: unknown) => {
        if (typeof condition === 'string') {
          announcementWhereSql.push(condition);
        }
        return announcementQuery;
      }),
      orderBy: jest.fn((expression: unknown) => {
        if (typeof expression === 'string') {
          announcementOrderSql.push(expression);
        }
        return announcementQuery;
      }),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    const repository = {
      existsBy,
      find: jest.fn().mockResolvedValue([]),
      findOneBy,
      createQueryBuilder: jest.fn(() => announcementQuery),
      create: jest.fn(
        (record: Partial<ContentRecord>) => record as ContentRecord,
      ),
      save,
    };
    service = new ContentService(
      repository as unknown as Repository<ContentRecord>,
      events as unknown as EventEmitter2,
    );
  });

  it('creates a draft with required announcement fields', async () => {
    const item = await service.createAnnouncement(validAnnouncement());

    expect(item.published).toBe(false);
    expect(item.details).toMatchObject({
      category: 'WORSHIP_SERVICES',
      imageUrl,
      publicationDate,
      status: 'DRAFT',
    });
    expect(events.emit).toHaveBeenCalledWith(
      'content.created',
      expect.objectContaining({ slug: 'sunday-worship' }),
    );
  });

  it('rejects expiry dates at or before publication', async () => {
    await expect(
      service.createAnnouncement(
        validAnnouncement({ expiryDate: '2030-10-10T09:00:00.000Z' }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(save).not.toHaveBeenCalled();
  });

  it('generates a unique slug from the announcement title', async () => {
    existsBy.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const item = await service.createAnnouncement(validAnnouncement());

    expect(item.slug).toBe('sunday-worship-2');
  });

  it('generates a slug for general content from its title', async () => {
    const item = await service.create({
      type: 'resources',
      title: '  Worship Guide  ',
      description: 'A guide for worship.',
    });

    expect(item.title).toBe('Worship Guide');
    expect(item.slug).toBe('worship-guide');
  });

  it('quotes the camel-cased publishedAt column in announcement SQL expressions', async () => {
    await service.listPublicAnnouncements();

    expect(
      announcementWhereSql.some((condition) =>
        condition.includes('record."publishedAt"'),
      ),
    ).toBe(true);
    expect(
      announcementOrderSql.some((expression) =>
        expression.includes('record."publishedAt"'),
      ),
    ).toBe(true);
  });

  it('requires confirmed permission before publishing a testimonial', async () => {
    await expect(
      service.create({
        type: 'testimonials',
        title: 'A community member',
        description: 'A genuine approved story.',
        published: true,
        details: { consentApproved: false },
      }),
    ).rejects.toThrow('Confirm permission before publishing a testimonial.');

    expect(save).not.toHaveBeenCalled();
  });

  it('publishes a testimonial with confirmed permission', async () => {
    const item = await service.create({
      type: 'testimonials',
      title: 'A community member',
      description: 'A genuine approved story.',
      published: true,
      details: { consentApproved: true },
    });

    expect(item.published).toBe(true);
    expect(item.details).toMatchObject({ consentApproved: true });
  });

  it('accepts the homepage sections managed by the public homepage', async () => {
    const section = (order: number, extra: Record<string, unknown> = {}) => ({
      visible: true,
      order,
      heading: '',
      description: '',
      ...extra,
    });
    const item = await service.create({
      type: 'settings',
      title: 'Homepage',
      published: true,
      details: {
        contentKey: 'homepage',
        hero: {
          imageUrl: '',
          primaryCtaHref: '',
          secondaryCtaHref: '',
        },
        sections: {
          welcome: section(0, { imageUrl: '', primaryCtaHref: '' }),
          facts: section(1),
          services: section(2),
          about: section(3, { primaryCtaHref: '' }),
          ministries: section(4, { featuredMinistryIds: [] }),
          events: section(5, { limit: 3 }),
          announcements: section(6, { limit: 3 }),
          sermons: section(7, { limit: 3 }),
          testimonials: section(8, { limit: 3 }),
          gallery: section(9, { limit: 6 }),
          contact: section(10, { primaryCtaHref: '', secondaryCtaHref: '' }),
        },
      },
    });

    expect(item.published).toBe(true);
    expect(item.details.sections).toHaveProperty('facts');
    expect(item.details.sections).toHaveProperty('testimonials');
    expect(item.details.sections).toHaveProperty('gallery');
  });

  it('creates a validated published weekly service schedule', async () => {
    const item = await service.create({
      type: 'services',
      title: 'Sunday gathering',
      description: 'A weekly gathering.',
      published: true,
      details: {
        scheduleType: 'weekly',
        serviceType: 'Worship service',
        dayOfWeek: 0,
        startTime: '09:00',
        endTime: '10:30',
        location: 'Main hall',
        active: true,
        displayOrder: 1,
        publicationStatus: 'published',
      },
    });

    expect(item.published).toBe(true);
    expect(item.details).toMatchObject({
      scheduleType: 'weekly',
      dayOfWeek: 0,
      publicationStatus: 'published',
    });
  });

  it('rejects service schedules whose end time is not later than the start time', async () => {
    await expect(
      service.create({
        type: 'services',
        title: 'Invalid service',
        details: {
          scheduleType: 'weekly',
          serviceType: 'Prayer meeting',
          dayOfWeek: 2,
          startTime: '19:00',
          endTime: '18:00',
          location: 'Prayer room',
          active: true,
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('schedules future announcements without making them published', async () => {
    const item = await service.createAnnouncement(
      validAnnouncement({ status: 'SCHEDULED' }),
    );

    expect(item.published).toBe(false);
    expect(item.details.status).toBe('SCHEDULED');
  });

  it('unpublishes without deleting the announcement', async () => {
    saved = {
      id: 'announcement-id',
      type: 'announcements',
      title: 'Sunday worship',
      slug: 'sunday-worship',
      description: 'Join us this Sunday.',
      details: {
        imageUrl,
        category: 'WORSHIP_SERVICES',
        publicationDate: '2020-10-10T09:00:00.000Z',
        expiryDate: null,
        status: 'PUBLISHED',
      },
      published: true,
      publishedAt: new Date('2020-10-10T09:00:00.000Z'),
      createdAt: new Date('2020-01-01T00:00:00.000Z'),
      updatedAt: new Date('2020-01-01T00:00:00.000Z'),
    };

    const item = await service.transitionAnnouncement(
      'announcement-id',
      'unpublish',
    );

    expect(item.details.status).toBe('UNPUBLISHED');
    expect(item.published).toBe(false);
    expect(saved).toBeDefined();
  });

  it('preserves the existing image when updating other fields', async () => {
    saved = {
      id: 'announcement-id',
      type: 'announcements',
      title: 'Sunday worship',
      slug: 'sunday-worship',
      description: 'Join us this Sunday.',
      details: {
        imageUrl,
        category: 'WORSHIP_SERVICES',
        publicationDate: '2020-10-10T09:00:00.000Z',
        expiryDate: null,
        status: 'PUBLISHED',
      },
      published: true,
      publishedAt: new Date('2020-10-10T09:00:00.000Z'),
      createdAt: new Date('2020-01-01T00:00:00.000Z'),
      updatedAt: new Date('2020-01-01T00:00:00.000Z'),
    };

    const item = await service.updateAnnouncement('announcement-id', {
      title: 'Updated Sunday worship',
    });

    expect(item.title).toBe('Updated Sunday worship');
    expect(item.details.imageUrl).toBe(imageUrl);
    expect(item.details.status).toBe('PUBLISHED');
  });
});
