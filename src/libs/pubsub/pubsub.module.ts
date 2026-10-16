import { Global, Module } from '@nestjs/common';
import { RedisPubSubService } from './redis-pubsub.service';
import { EmailPublisher } from './publishers/email.publisher';
import { VerificationOtpEmailService } from './services/verification-otp-email.service';

@Global()
@Module({
  providers: [RedisPubSubService, EmailPublisher, VerificationOtpEmailService],
  exports: [RedisPubSubService, EmailPublisher, VerificationOtpEmailService],
})
export class PubSubModule {}
