import type { Repository } from 'typeorm';
import type { ConfigService } from '@nestjs/config';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { Ministry } from './entities/ministry.entity';
import { MinistriesService } from './ministries.service';

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

describe('MinistriesService', () => {
  it('generates a unique slug from the ministry name', async () => {
    const existsBy = jest
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const create = jest.fn((ministry: Partial<Ministry>) => ministry);
    const save = jest.fn((ministry: Partial<Ministry>) =>
      Promise.resolve(ministry),
    );
    const events = { emit: jest.fn() };
    const config = {
      get: jest.fn((key: string, fallback?: string) =>
        key === 'APP_URL' ? 'http://localhost:5005' : fallback,
      ),
    };
    const repository = { existsBy, create, save };
    const service = new MinistriesService(
      repository as unknown as Repository<Ministry>,
      events as unknown as EventEmitter2,
      config as unknown as ConfigService,
    );

    const created = await service.create({
      name: 'Youth Ministry',
      description: 'A place for young people.',
      targetAudience: 'Young adults',
      meetingSchedule: 'Weekly',
      location: 'Church hall',
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/church-website/youth.jpg',
    });

    expect(created).toMatchObject({
      name: 'Youth Ministry',
      slug: 'youth-ministry-2',
    });
  });
});
