import { Global, Module } from '@nestjs/common';
import { DomainEventService } from './domain-event.service';
import { EmailPublisher } from './publishers/email.publisher';
import { VerificationOtpEmailService } from './services/verification-otp-email.service';

@Global()
@Module({
  providers: [DomainEventService, EmailPublisher, VerificationOtpEmailService],
  exports: [DomainEventService, EmailPublisher, VerificationOtpEmailService],
})
export class PubSubModule {}
