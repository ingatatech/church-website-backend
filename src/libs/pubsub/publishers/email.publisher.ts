import { Injectable, Logger } from '@nestjs/common';
import { RedisPubSubService } from '../redis-pubsub.service';
import { DOMAIN_EVENTS } from '../../../utils/constants/events';

@Injectable()
export class EmailPublisher {
  private readonly logger = new Logger(EmailPublisher.name);

  constructor(private readonly pubsub: RedisPubSubService) {}

  async publishOtpEmail(email: string, otp: string): Promise<void> {
    this.logger.log(`[OTP] Sent verification code ${otp} to ${email}`);
    await this.pubsub.publish(DOMAIN_EVENTS.EMAIL_NOTIFICATION, {
      type: 'otp_email',
      email,
      otp,
    });
  }

  async publishWelcomeEmail(email: string, fullName: string): Promise<void> {
    this.logger.log(`[Welcome] Sent welcome email to ${email}`);
    await this.pubsub.publish(DOMAIN_EVENTS.EMAIL_NOTIFICATION, {
      type: 'welcome_email',
      email,
      fullName,
    });
  }

  async publishPasswordResetEmail(email: string, otp: string): Promise<void> {
    this.logger.log(`[PasswordReset] Sent password reset OTP ${otp} to ${email}`);
    await this.pubsub.publish(DOMAIN_EVENTS.EMAIL_NOTIFICATION, {
      type: 'password_reset_email',
      email,
      otp,
    });
  }

  async publishPasswordChangedEmail(email: string, fullName: string): Promise<void> {
    this.logger.log(`[PasswordChanged] Sent password change confirmation to ${email}`);
    await this.pubsub.publish(DOMAIN_EVENTS.EMAIL_NOTIFICATION, {
      type: 'password_changed_email',
      email,
      fullName,
    });
  }
}
