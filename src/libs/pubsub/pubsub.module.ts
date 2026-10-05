import { Global, Module } from '@nestjs/common';
import { RedisPubSubService } from './redis-pubsub.service';
import { EmailPublisher } from './publishers/email.publisher';

@Global()
@Module({
  providers: [RedisPubSubService, EmailPublisher],
  exports: [RedisPubSubService, EmailPublisher],
})
export class PubSubModule {}
