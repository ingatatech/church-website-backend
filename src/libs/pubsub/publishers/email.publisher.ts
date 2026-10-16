import { Injectable, Logger, Optional } from '@nestjs/common';
import { html, Mailer } from '@nestjs/mail';
import { RedisPubSubService } from '../redis-pubsub.service';
import { DOMAIN_EVENTS } from '../../../utils/constants/events';

@Injectable()
export class EmailPublisher {
  private readonly logger = new Logger(EmailPublisher.name);

  constructor(
    private readonly pubsub: RedisPubSubService,
    @Optional() private readonly mailer?: Mailer,
  ) {}

  async publishWelcomeEmail(email: string, fullName: string): Promise<void> {
    this.logger.log(`[Welcome] Sending welcome email to ${email}`);
    if (this.mailer) {
      try {
        await this.mailer.send({
          to: email,
          subject: 'Welcome to the Church Portal',
          text: `Welcome ${fullName}! Your account has been activated and your password is now set. You can sign in to the church management portal anytime.`,
          html: html`<!doctype html>
            <html lang="en">
              <body
                style="margin:0;background:#f8f7f4;padding:32px 12px;font-family:Arial,sans-serif;color:#142852"
              >
                <main
                  style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e4e7ec;border-radius:16px;padding:32px"
                >
                  <p
                    style="margin:0 0 12px;color:#a96500;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase"
                  >
                    Church Portal
                  </p>
                  <h1 style="margin:0 0 12px;font-size:24px">Welcome to the Portal</h1>
                  <p style="margin:0 0 16px;color:#475467;line-height:1.6">
                    Hello <strong>${fullName}</strong>,
                  </p>
                  <p style="margin:0 0 24px;color:#475467;line-height:1.6">
                    Your account has been activated and your password is now set. You can sign in to access church administration and ministry management.
                  </p>
                  <p style="margin:0;color:#667085;font-size:13px;line-height:1.6">
                    Thank you for serving with us!
                  </p>
                </main>
              </body>
            </html>`,
        });
        this.logger.log(`[Welcome] Delivered welcome email to ${email}`);
      } catch (error) {
        this.logger.error(
          `[Welcome] Failed to deliver welcome email to ${email}: ${error}`,
        );
      }
    }
    await this.pubsub.publish(DOMAIN_EVENTS.EMAIL_NOTIFICATION, {
      type: 'welcome_email',
      email,
      fullName,
    });
  }

  async publishPasswordResetEmail(email: string, otp: string): Promise<void> {
    this.logger.log(`[PasswordReset] Sending password reset code to ${email}`);
    if (this.mailer) {
      try {
        await this.mailer.send({
          to: email,
          subject: 'Reset your Church Portal password',
          text: `Your password reset code is ${otp}. It expires in 10 minutes. If you did not request this, please ignore this email.`,
          html: html`<!doctype html>
            <html lang="en">
              <body
                style="margin:0;background:#f8f7f4;padding:32px 12px;font-family:Arial,sans-serif;color:#142852"
              >
                <main
                  style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e4e7ec;border-radius:16px;padding:32px"
                >
                  <p
                    style="margin:0 0 12px;color:#a96500;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase"
                  >
                    Church Portal
                  </p>
                  <h1 style="margin:0 0 12px;font-size:24px">Password Reset Request</h1>
                  <p style="margin:0 0 24px;color:#475467;line-height:1.6">
                    We received a request to reset your password. Use the verification code below:
                  </p>
                  <p
                    style="margin:0 0 24px;border-radius:12px;background:#f3f5f8;padding:18px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;color:#142852"
                  >
                    ${otp}
                  </p>
                  <p style="margin:0 0 8px;color:#475467;line-height:1.6">
                    This code expires in 10 minutes.
                  </p>
                  <p style="margin:0;color:#667085;font-size:13px;line-height:1.6">
                    If you did not request this password reset, your account is still safe and you can ignore this email.
                  </p>
                </main>
              </body>
            </html>`,
        });
        this.logger.log(`[PasswordReset] Delivered password reset code to ${email}`);
      } catch (error) {
        this.logger.error(
          `[PasswordReset] Failed to deliver password reset code to ${email}: ${error}`,
        );
      }
    }
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
      `[PasswordChanged] Sending password change confirmation to ${email}`,
    );
    if (this.mailer) {
      try {
        await this.mailer.send({
          to: email,
          subject: 'Security Notice: Your password was changed',
          text: `Hello ${fullName}, the password for your Church Portal account was successfully updated. If you did not make this change, please contact an administrator immediately.`,
          html: html`<!doctype html>
            <html lang="en">
              <body
                style="margin:0;background:#f8f7f4;padding:32px 12px;font-family:Arial,sans-serif;color:#142852"
              >
                <main
                  style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e4e7ec;border-radius:16px;padding:32px"
                >
                  <p
                    style="margin:0 0 12px;color:#a96500;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase"
                  >
                    Church Portal
                  </p>
                  <h1 style="margin:0 0 12px;font-size:24px">Password Changed</h1>
                  <p style="margin:0 0 16px;color:#475467;line-height:1.6">
                    Hello <strong>${fullName}</strong>,
                  </p>
                  <p style="margin:0 0 24px;color:#475467;line-height:1.6">
                    The password for your Church Portal account was successfully updated. You can now sign in with your new password.
                  </p>
                  <p style="margin:0;color:#b42318;font-size:13px;line-height:1.6">
                    If you did not make this change, please contact church administration immediately.
                  </p>
                </main>
              </body>
            </html>`,
        });
        this.logger.log(
          `[PasswordChanged] Delivered password change confirmation to ${email}`,
        );
      } catch (error) {
        this.logger.error(
          `[PasswordChanged] Failed to deliver password change confirmation to ${email}: ${error}`,
        );
      }
    }
    await this.pubsub.publish(DOMAIN_EVENTS.EMAIL_NOTIFICATION, {
      type: 'password_changed_email',
      email,
      fullName,
    });
  }
}
