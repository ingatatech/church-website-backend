export class EventEmitter2 {
  emit = jest.fn();
  on = jest.fn();
}
export const EventEmitterModule = {
  forRoot: jest.fn(() => ({ module: class FakeEventEmitterModule {} })),
};
