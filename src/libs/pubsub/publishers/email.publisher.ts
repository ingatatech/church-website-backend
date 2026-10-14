import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { Outbox } from '@nestjs/outbox';
import { RedisPubSubService } from '../redis-pubsub.service';
import { DOMAIN_EVENTS } from '../../../utils/constants/events';

@Injectable()
export class EmailPublisher {
  private readonly logger = new Logger(EmailPublisher.name);

  constructor(
    private readonly pubsub: RedisPubSubService,
    private readonly dataSource: DataSource,
    private readonly outbox: Outbox<EntityManager>,
  ) {}

  async publishOtpEmail(
    requestId: string,
    email: string,
    otp: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await this.outbox.add(manager, {
        topic: 'auth.verification-otp',
        key: email,
        payload: { requestId, email, otp },
      });
    });
    this.outbox.notify();
    this.logger.log('Queued an email verification message');
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
    this.logger.log('Queued a password reset notification');
    await this.pubsub.publish(DOMAIN_EVENTS.EMAIL_NOTIFICATION, {
      type: 'password_reset_email',
      email,
      otp,
    });
  }

  async publishPasswordChangedEmail(
    email: string,
    fullName: string,
  ): Promise<void> {
    this.logger.log(
      `[PasswordChanged] Sent password change confirmation to ${email}`,
    );
    await this.pubsub.publish(DOMAIN_EVENTS.EMAIL_NOTIFICATION, {
      type: 'password_changed_email',
      email,
      fullName,
    });
  }
}
