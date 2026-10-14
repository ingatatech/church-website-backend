export class ConfigService {
  get = jest.fn();
}
export const ConfigModule = {
  forRoot: jest.fn(() => ({ module: class FakeConfigModule {} })),
};
