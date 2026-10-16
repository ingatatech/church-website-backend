import { MemoryStoreService } from '../cache/memory-store.service';
import { OtpService } from './otp.service';

describe('OtpService', () => {
  let store: MemoryStoreService;
  let service: OtpService;

  beforeEach(() => {
    store = new MemoryStoreService();
    service = new OtpService(store);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps the generated code current until it is verified', async () => {
    const otp = await service.generate('registration-1');

    expect(otp).toMatch(/^\d{6}$/);
    expect(await service.isCurrent('registration-1', otp)).toBe(true);
    await expect(service.verify('registration-1', otp)).resolves.toBe(true);
    expect(await service.isCurrent('registration-1', otp)).toBe(false);
  });

  it('expires the code after ten minutes', async () => {
    let now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);

    const otp = await service.generate('registration-2');
    now += 10 * 60 * 1000;

    expect(await service.isCurrent('registration-2', otp)).toBe(false);
  });
});
