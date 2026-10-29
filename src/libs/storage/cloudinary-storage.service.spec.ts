import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import { ContentRecord } from '../../app/modules/content/content.entity';
import { ChurchEvent } from '../../app/modules/events/entities/church-event.entity';
import { Ministry } from '../../app/modules/ministries/entities/ministry.entity';
import { Sermon } from '../../app/modules/sermons/entities/sermon.entity';
import { Speaker } from '../../app/modules/sermons/entities/speaker.entity';
import { MediaAsset } from './entities/media-asset.entity';
import { CloudinaryStorageService } from './cloudinary-storage.service';

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

describe('CloudinaryStorageService', () => {
  const asset = {
    id: 'asset-1',
    publicId: 'church-website/images/worship',
    secureUrl: 'https://res.cloudinary.com/example/image/upload/church-website/images/worship.jpg',
    resourceType: 'image',
    format: 'jpg',
    width: 1200,
    height: 800,
    bytes: '1200',
    altText: '',
    folder: 'church-website/images',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    cloudinaryCreatedAt: new Date('2026-01-01T00:00:00.000Z'),
  } as MediaAsset;

  let service: CloudinaryStorageService;
  let assets: Record<string, jest.Mock>;
  let content: Record<string, jest.Mock>;
  let events: Record<string, jest.Mock>;
  let sermons: Record<string, jest.Mock>;
  let ministries: Record<string, jest.Mock>;
  let speakers: Record<string, jest.Mock>;

  beforeEach(() => {
    assets = {
      findOneBy: jest.fn().mockResolvedValue(asset),
      findOne: jest.fn().mockResolvedValue(asset),
      save: jest.fn(async (value) => value),
      remove: jest.fn().mockResolvedValue(asset),
    };
    content = { find: jest.fn().mockResolvedValue([]) };
    events = { find: jest.fn().mockResolvedValue([]) };
    sermons = { find: jest.fn().mockResolvedValue([]) };
    ministries = { find: jest.fn().mockResolvedValue([]) };
    speakers = { find: jest.fn().mockResolvedValue([]) };
    service = new CloudinaryStorageService(
      { get: jest.fn() } as unknown as ConfigService,
      assets as unknown as Repository<MediaAsset>,
      content as unknown as Repository<ContentRecord>,
      events as unknown as Repository<ChurchEvent>,
      sermons as unknown as Repository<Sermon>,
      ministries as unknown as Repository<Ministry>,
      speakers as unknown as Repository<Speaker>,
    );
  });

  it('does not delete a media asset referenced by published content', async () => {
    content.find.mockResolvedValue([
      { id: 'homepage', details: { hero: { imageUrl: asset.secureUrl } } },
    ]);
    const fetch = jest.spyOn(globalThis, 'fetch');

    await expect(service.deleteAsset(asset.id)).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(fetch).not.toHaveBeenCalled();
    expect(assets.remove).not.toHaveBeenCalled();
    fetch.mockRestore();
  });

  it('saves trimmed alternative text in the media record', async () => {
    const updated = await service.updateAltText(asset.id, '  Congregation at worship  ');

    expect(assets.save).toHaveBeenCalledWith(
      expect.objectContaining({ altText: 'Congregation at worship' }),
    );
    expect(updated.altText).toBe('Congregation at worship');
  });

  it('rejects alternative text that exceeds the database limit', async () => {
    await expect(service.updateAltText(asset.id, 'a'.repeat(501))).rejects.toBeInstanceOf(BadRequestException);
    expect(assets.save).not.toHaveBeenCalled();
  });

  it('returns not found when an asset id does not exist', async () => {
    assets.findOneBy.mockResolvedValue(null);
    await expect(service.updateAltText('missing', 'Description')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
