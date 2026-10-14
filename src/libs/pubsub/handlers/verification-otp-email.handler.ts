import { Injectable } from '@nestjs/common';
import { html, MailError, Mailer } from '@nestjs/mail';
import {
  NonRetryableMessageError,
  OnOutboxMessage,
  type OutboxHandlerContext,
} from '@nestjs/outbox';
import { OtpService } from '../../otp/otp.service';

interface VerificationOtpPayload {
  requestId: string;
  email: string;
  otp: string;
}

@Injectable()
export class VerificationOtpEmailHandler {
  constructor(
    private readonly mailer: Mailer,
    private readonly otpService: OtpService,
  ) {}

  @OnOutboxMessage('auth.verification-otp', {
    consumer: 'auth-verification-email',
  })
  async sendVerificationCode(
    { requestId, email, otp }: VerificationOtpPayload,
    context: OutboxHandlerContext,
  ): Promise<void> {
    if (!(await this.otpService.isCurrent(requestId, otp))) return;

    try {
      await this.mailer.send(
        {
          to: email,
          subject: 'Your Church Portal verification code',
          text: `Your email verification code is ${otp}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
          html: html`<!doctype html>
            <html lang="en">
              <body style="margin:0;background:#f8f7f4;padding:32px 12px;font-family:Arial,sans-serif;color:#142852">
                <main style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e4e7ec;border-radius:16px;padding:32px">
                  <p style="margin:0 0 12px;color:#a96500;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase">Church Portal</p>
                  <h1 style="margin:0 0 12px;font-size:24px">Verify your email</h1>
                  <p style="margin:0 0 24px;color:#475467;line-height:1.6">Enter this verification code to continue creating your account.</p>
                  <p style="margin:0 0 24px;border-radius:12px;background:#f3f5f8;padding:18px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;color:#142852">${otp}</p>
                  <p style="margin:0 0 8px;color:#475467;line-height:1.6">This code expires in 10 minutes.</p>
                  <p style="margin:0;color:#667085;font-size:13px;line-height:1.6">If you did not request this code, you can ignore this email.</p>
                </main>
              </body>
            </html>`,
          idempotencyKey: context.message.id,
          signal: context.signal,
          retry: false,
        },
      );
    } catch (error) {
      if (error instanceof MailError && error.permanent) {
        throw new NonRetryableMessageError(
          'The verification email was rejected permanently',
          { cause: error },
        );
      }
      throw error;
    }
  }
}
