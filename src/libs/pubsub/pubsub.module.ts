import { Global, Module } from '@nestjs/common';
import { RedisPubSubService } from './redis-pubsub.service';
import { EmailPublisher } from './publishers/email.publisher';
import { VerificationOtpEmailHandler } from './handlers/verification-otp-email.handler';

@Global()
@Module({
  providers: [RedisPubSubService, EmailPublisher, VerificationOtpEmailHandler],
  exports: [RedisPubSubService, EmailPublisher],
})
export class PubSubModule {}
