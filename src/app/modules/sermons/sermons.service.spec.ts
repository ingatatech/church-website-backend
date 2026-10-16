import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

import type { DomainEventService } from '../../../libs/pubsub/domain-event.service';
import { PublicationStatus, Sermon } from './entities/sermon.entity';
import { Speaker } from './entities/speaker.entity';
import { SermonsService } from './sermons.service';

describe('SermonsService', () => {
  let service: SermonsService;
  let sermonRepo: Partial<Repository<Sermon>>;
  let speakerRepo: Partial<Repository<Speaker>>;
  let pubsub: Partial<DomainEventService>;

  beforeEach(() => {
    sermonRepo = {
      create: jest.fn((dto) => dto as Sermon),
      save: jest.fn((entity) =>
        Promise.resolve({
          ...entity,
          id: entity.id || 'sermon-uuid-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Sermon),
      ),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    speakerRepo = {
      create: jest.fn((dto) => dto as Speaker),
      save: jest.fn((entity) =>
        Promise.resolve({
          ...entity,
          id: entity.id || 'speaker-uuid-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Speaker),
      ),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    pubsub = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    service = new SermonsService(
      sermonRepo as Repository<Sermon>,
      speakerRepo as Repository<Speaker>,
      pubsub as DomainEventService,
    );
  });

  describe('create sermon', () => {
    it('creates a draft sermon and generates a clean unique slug from title', async () => {
      // Mock createQueryBuilder for slug uniqueness check
      const qbMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      (sermonRepo.createQueryBuilder as jest.Mock).mockReturnValue(qbMock);

      const findSpeakerMock = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      (speakerRepo.createQueryBuilder as jest.Mock).mockReturnValue(
        findSpeakerMock,
      );

      (sermonRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'sermon-uuid-1',
        title: 'Walking in Faith',
        slug: 'walking-in-faith',
        speaker: 'Pastor John Doe',
        date: '2026-10-15',
        category: 'Faith',
        scripture: 'Hebrews 11:1',
        bibleBook: 'Hebrews',
        status: PublicationStatus.DRAFT,
      });

      const result = await service.create({
        title: 'Walking in Faith',
        speaker: 'Pastor John Doe',
        date: '2026-10-15',
        category: 'Faith',
        scripture: 'Hebrews 11:1',
      });

      expect(result).toBeDefined();
      expect(result.slug).toBe('walking-in-faith');
      expect(result.bibleBook).toBe('Hebrews');
      expect(pubsub.publish).toHaveBeenCalled();
    });

    it('extracts bible book automatically from Scripture reference when omitted', async () => {
      const qbMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      (sermonRepo.createQueryBuilder as jest.Mock).mockReturnValue(qbMock);
      (speakerRepo.createQueryBuilder as jest.Mock).mockReturnValue(qbMock);

      (sermonRepo.findOne as jest.Mock).mockImplementation(() =>
        Promise.resolve({
          id: 'sermon-uuid-2',
          title: 'The Great Commission',
          slug: 'the-great-commission',
          speaker: 'Pastor John',
          date: '2026-10-18',
          category: 'Discipleship',
          scripture: 'Matthew 28:19-20',
          bibleBook: 'Matthew',
          status: PublicationStatus.DRAFT,
        }),
      );

      const result = await service.create({
        title: 'The Great Commission',
        speaker: 'Pastor John',
        date: '2026-10-18',
        category: 'Discipleship',
        scripture: 'Matthew 28:19-20',
      });

      expect(sermonRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          bibleBook: 'Matthew',
        }),
      );
    });
  });

  describe('publish and unpublish', () => {
    it('publishes a draft sermon', async () => {
      const draftSermon = {
        id: 'sermon-uuid-1',
        title: 'Faith in Action',
        status: PublicationStatus.DRAFT,
      } as Sermon;

      (sermonRepo.findOneBy as jest.Mock).mockResolvedValue(draftSermon);
      (sermonRepo.findOne as jest.Mock).mockResolvedValue({
        ...draftSermon,
        status: PublicationStatus.PUBLISHED,
      });

      const published = await service.publish('sermon-uuid-1');
      expect(published.status).toBe(PublicationStatus.PUBLISHED);
      expect(sermonRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PublicationStatus.PUBLISHED }),
      );
    });

    it('unpublishes a published sermon', async () => {
      const publishedSermon = {
        id: 'sermon-uuid-1',
        title: 'Faith in Action',
        status: PublicationStatus.PUBLISHED,
      } as Sermon;

      (sermonRepo.findOneBy as jest.Mock).mockResolvedValue(publishedSermon);
      (sermonRepo.findOne as jest.Mock).mockResolvedValue({
        ...publishedSermon,
        status: PublicationStatus.DRAFT,
      });

      const unpublished = await service.unpublish('sermon-uuid-1');
      expect(unpublished.status).toBe(PublicationStatus.DRAFT);
      expect(sermonRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PublicationStatus.DRAFT }),
      );
    });
  });

  describe('public access security', () => {
    it('throws NotFoundException when sermon is not found or not published', async () => {
      const qbMock = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      (sermonRepo.createQueryBuilder as jest.Mock).mockReturnValue(qbMock);

      await expect(
        service.getPublishedBySlugOrId('draft-sermon-slug'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('speaker management', () => {
    it('creates a new speaker with generated slug', async () => {
      const qbMock = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      (speakerRepo.createQueryBuilder as jest.Mock).mockReturnValue(qbMock);

      const speaker = await service.createSpeaker({
        name: 'Pastor Jane Doe',
        title: 'Associate Pastor',
        bio: 'Oversees teaching and discipleship.',
      });

      expect(speaker).toBeDefined();
      expect(speakerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Pastor Jane Doe',
          slug: 'pastor-jane-doe',
          title: 'Associate Pastor',
        }),
      );
    });
  });
});
