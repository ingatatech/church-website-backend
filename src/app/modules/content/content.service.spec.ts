import { BadRequestException, ConflictException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { Repository } from 'typeorm';
import { CreateAnnouncementDto } from './announcement.dto';
import { ContentRecord } from './content.entity';
import { ContentService } from './content.service';

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
    slug: 'sunday-worship',
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
    const repository = {
      existsBy,
      findOneBy,
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

  it('rejects a duplicate slug', async () => {
    existsBy.mockResolvedValue(true);

    await expect(
      service.createAnnouncement(validAnnouncement()),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(save).not.toHaveBeenCalled();
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
