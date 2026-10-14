jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

import { SermonsController } from './sermons.controller';
import { AdminSermonsController } from './admin-sermons.controller';
import { SermonsService } from './sermons.service';
import { PublicationStatus } from './entities/sermon.entity';

describe('Sermons Controllers', () => {
  let sermonsController: SermonsController;
  let adminSermonsController: AdminSermonsController;
  let mockService: Partial<SermonsService>;

  beforeEach(() => {
    mockService = {
      listPublished: jest.fn().mockResolvedValue([
        {
          id: 'sermon-1',
          title: 'Grace Upon Grace',
          slug: 'grace-upon-grace',
          speaker: 'Pastor John',
          status: PublicationStatus.PUBLISHED,
        },
      ]),
      getPublishedBySlugOrId: jest.fn().mockResolvedValue({
        id: 'sermon-1',
        title: 'Grace Upon Grace',
        slug: 'grace-upon-grace',
        status: PublicationStatus.PUBLISHED,
        relatedSermons: [],
      }),
      listForAdministration: jest.fn().mockResolvedValue([
        { id: 'sermon-1', status: PublicationStatus.PUBLISHED },
        { id: 'sermon-2', status: PublicationStatus.DRAFT },
      ]),
      getForAdmin: jest.fn().mockResolvedValue({ id: 'sermon-1' }),
      create: jest
        .fn()
        .mockResolvedValue({ id: 'sermon-3', title: 'New Message' }),
      update: jest.fn().mockResolvedValue({ id: 'sermon-1', title: 'Updated' }),
      publish: jest.fn().mockResolvedValue({
        id: 'sermon-1',
        status: PublicationStatus.PUBLISHED,
      }),
      unpublish: jest
        .fn()
        .mockResolvedValue({ id: 'sermon-1', status: PublicationStatus.DRAFT }),
      remove: jest.fn().mockResolvedValue({ id: 'sermon-1' }),
    };

    sermonsController = new SermonsController(mockService as SermonsService);
    adminSermonsController = new AdminSermonsController(
      mockService as SermonsService,
    );
  });

  it('public sermons list calls listPublished on service', async () => {
    const result = await sermonsController.list({ search: 'Grace' });
    expect(mockService.listPublished).toHaveBeenCalledWith({ search: 'Grace' });
    expect(result).toHaveLength(1);
  });

  it('public sermon get by slug calls getPublishedBySlugOrId', async () => {
    const result = await sermonsController.getBySlug('grace-upon-grace');
    expect(mockService.getPublishedBySlugOrId).toHaveBeenCalledWith(
      'grace-upon-grace',
    );
    expect(result).toHaveProperty('slug', 'grace-upon-grace');
  });

  it('admin sermons list returns all sermons with wrapper', async () => {
    const result = await adminSermonsController.list();
    expect(mockService.listForAdministration).toHaveBeenCalled();
    expect(result.data).toHaveLength(2);
  });

  it('admin publish updates sermon to published', async () => {
    const result = await adminSermonsController.publish('sermon-1');
    expect(mockService.publish).toHaveBeenCalledWith('sermon-1');
    expect(result.data.status).toBe(PublicationStatus.PUBLISHED);
  });

  it('admin unpublish updates sermon to draft', async () => {
    const result = await adminSermonsController.unpublish('sermon-1');
    expect(mockService.unpublish).toHaveBeenCalledWith('sermon-1');
    expect(result.data.status).toBe(PublicationStatus.DRAFT);
  });
});
