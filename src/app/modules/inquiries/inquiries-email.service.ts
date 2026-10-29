import { Injectable, Logger, Optional } from '@nestjs/common';
import { html, Mailer } from '@nestjs/mail';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentRecord } from '../content/content.entity';

@Injectable()
export class InquiriesEmailService {
  private readonly logger = new Logger(InquiriesEmailService.name);

  constructor(
    @InjectRepository(ContentRecord)
    private readonly contentRepo: Repository<ContentRecord>,
    @Optional() private readonly mailer?: Mailer,
  ) {}

  private async getChurchName(): Promise<string> {
    try {
      const settings = await this.contentRepo.findOne({
        where: { type: 'settings' },
      });
      return settings?.title?.trim() || 'Seventh-day Adventist Church';
    } catch {
      return 'Seventh-day Adventist Church';
    }
  }

  async sendAcknowledgmentEmail(
    to: string,
    name: string,
    type: string,
    message: string,
    referenceId: string,
  ): Promise<boolean> {
    const churchName = await this.getChurchName();
    const typeLabel =
      type === 'prayer'
        ? 'Prayer Request'
        : type === 'visitor'
        ? 'Plan a Visit'
        : 'Contact Inquiry';

    this.logger.log(
      `[InquiryAcknowledgment] Sending confirmation to ${to} for inquiry ${referenceId}`,
    );

    if (!this.mailer) {
      this.logger.warn(
        `[InquiryAcknowledgment] Mailer not configured. Skipping email to ${to}`,
      );
      return false;
    }

    try {
      const subject = `We Have Received Your Message - ${churchName}`;
      const previewText = message.length > 200 ? `${message.slice(0, 197)}...` : message;

      await this.mailer.send({
        to,
        subject,
        text: `Hello ${name},\n\nThank you for reaching out to ${churchName}. We have received your ${typeLabel.toLowerCase()} and our pastoral care team will review it as soon as possible.\n\nYour message:\n"${message}"\n\nReference ID: ${referenceId}\n\nWarm regards,\n${churchName} Pastoral Care Team`,
        html: html`<!doctype html>
          <html lang="en">
            <body
              style="margin:0;background:#f8f9fa;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;color:#1e293b"
            >
              <main
                style="max-width:540px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.05)"
              >
                <div style="border-bottom:2px solid #00387b;padding-bottom:16px;margin-bottom:24px">
                  <p
                    style="margin:0 0 6px;color:#f4a900;font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase"
                  >
                    ${churchName}
                  </p>
                  <h1 style="margin:0;font-size:22px;color:#00387b;font-weight:bold">
                    We Have Received Your Message
                  </h1>
                </div>

                <p style="margin:0 0 16px;font-size:15px;line-height:1.6">
                  Hello <strong>${name}</strong>,
                </p>

                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569">
                  Thank you for reaching out to <strong>${churchName}</strong>. We have successfully received your <strong>${typeLabel.toLowerCase()}</strong> and our pastoral staff and ministry leaders will review your message promptly.
                </p>

                <div
                  style="margin:0 0 24px;background:#f8fafc;border-left:4px solid #00387b;border-radius:0 12px 12px 0;padding:16px"
                >
                  <p style="margin:0 0 6px;font-size:11px;font-weight:bold;color:#64748b;text-transform:uppercase;letter-spacing:1px">
                    Your Message
                  </p>
                  <p style="margin:0;font-size:13px;line-height:1.6;color:#334155;white-space:pre-wrap">
                    ${previewText}
                  </p>
                </div>

                <p style="margin:0 0 24px;font-size:12px;color:#64748b;line-height:1.5">
                  Reference ID: <code style="font-family:monospace;background:#f1f5f9;padding:2px 6px;border-radius:4px;color:#0f172a">${referenceId}</code>
                </p>

                <div style="border-top:1px solid #e2e8f0;padding-top:20px;margin-top:24px">
                  <p style="margin:0 0 4px;font-size:13px;font-weight:bold;color:#00387b">
                    ${churchName}
                  </p>
                  <p style="margin:0;font-size:12px;color:#94a3b8">
                    Faith, Hope, and Christian Fellowship
                  </p>
                </div>
              </main>
            </body>
          </html>`,
      });

      this.logger.log(`[InquiryAcknowledgment] Delivered confirmation email to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(
        `[InquiryAcknowledgment] Failed to send acknowledgment email to ${to}: ${
          (error as Error).message
        }`,
      );
      return false;
    }
  }

  async sendReplyEmail(
    to: string,
    name: string,
    type: string,
    replyText: string,
    originalMessage: string,
  ): Promise<{ delivered: boolean; error?: string }> {
    const churchName = await this.getChurchName();

    this.logger.log(`[InquiryReply] Sending admin reply to ${to}`);

    if (!this.mailer) {
      this.logger.warn(`[InquiryReply] Mailer not configured. Skipping reply to ${to}`);
      return { delivered: false, error: 'Email service is not configured' };
    }

    try {
      const subject = `Response to your inquiry - ${churchName}`;

      await this.mailer.send({
        to,
        subject,
        text: `Hello ${name},\n\nThank you for reaching out to ${churchName}. Here is our response to your message:\n\n${replyText}\n\n---\nYour original message:\n"${originalMessage}"\n\nWarm regards,\n${churchName} Pastoral Care Team`,
        html: html`<!doctype html>
          <html lang="en">
            <body
              style="margin:0;background:#f8f9fa;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;color:#1e293b"
            >
              <main
                style="max-width:540px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.05)"
              >
                <div style="border-bottom:2px solid #00387b;padding-bottom:16px;margin-bottom:24px">
                  <p
                    style="margin:0 0 6px;color:#f4a900;font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase"
                  >
                    ${churchName}
                  </p>
                  <h1 style="margin:0;font-size:22px;color:#00387b;font-weight:bold">
                    Reply From Church Leadership
                  </h1>
                </div>

                <p style="margin:0 0 16px;font-size:15px;line-height:1.6">
                  Hello <strong>${name}</strong>,
                </p>

                <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#475569">
                  Thank you for connecting with us. Our ministry leadership has responded to your inquiry:
                </p>

                <div
                  style="margin:0 0 24px;background:#f0fdf4;border-left:4px solid #16a34a;border-radius:0 12px 12px 0;padding:18px"
                >
                  <p style="margin:0 0 6px;font-size:11px;font-weight:bold;color:#15803d;text-transform:uppercase;letter-spacing:1px">
                    Pastoral Response
                  </p>
                  <p style="margin:0;font-size:14px;line-height:1.65;color:#1e293b;white-space:pre-wrap">
                    ${replyText}
                  </p>
                </div>

                <div
                  style="margin:0 0 24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px"
                >
                  <p style="margin:0 0 6px;font-size:11px;font-weight:bold;color:#64748b;text-transform:uppercase;letter-spacing:1px">
                    Original Message
                  </p>
                  <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;white-space:pre-wrap">
                    ${originalMessage}
                  </p>
                </div>

                <div style="border-top:1px solid #e2e8f0;padding-top:20px;margin-top:24px">
                  <p style="margin:0 0 4px;font-size:13px;font-weight:bold;color:#00387b">
                    ${churchName}
                  </p>
                  <p style="margin:0;font-size:12px;color:#94a3b8">
                    Feel free to reply directly to this email or visit our church during our worship services.
                  </p>
                </div>
              </main>
            </body>
          </html>`,
      });

      this.logger.log(`[InquiryReply] Delivered admin reply to ${to}`);
      return { delivered: true };
    } catch (error) {
      const msg = (error as Error).message;
      this.logger.error(`[InquiryReply] Failed to send reply to ${to}: ${msg}`);
      return { delivered: false, error: msg };
    }
  }

  async sendStatusChangeEmail(
    to: string,
    name: string,
    type: string,
    newStatus: string,
    previousStatus: string,
  ): Promise<boolean> {
    if (newStatus === previousStatus || newStatus === 'new') {
      return false;
    }

    const churchName = await this.getChurchName();
    this.logger.log(
      `[InquiryStatusUpdate] Sending status update (${previousStatus} -> ${newStatus}) to ${to}`,
    );

    if (!this.mailer) {
      this.logger.warn(`[InquiryStatusUpdate] Mailer not configured. Skipping email to ${to}`);
      return false;
    }

    const statusTitle =
      newStatus === 'resolved'
        ? 'Your Request Has Been Attended To'
        : 'Your Request Is In Progress';

    const statusMessage =
      newStatus === 'resolved'
        ? `We are pleased to inform you that your message or prayer request has been attended to by our pastoral care team. If you require further assistance or would like to speak with a minister, please feel free to reach out to us again.`
        : `Your inquiry has been assigned and is currently being attended to by our ministry team. We appreciate your patience and will follow up with you as needed.`;

    try {
      const subject = `Update regarding your message - ${churchName}`;

      await this.mailer.send({
        to,
        subject,
        text: `Hello ${name},\n\nThis is an update regarding your message to ${churchName}.\n\nStatus: ${newStatus.toUpperCase()}\n\n${statusMessage}\n\nWarm regards,\n${churchName} Pastoral Care Team`,
        html: html`<!doctype html>
          <html lang="en">
            <body
              style="margin:0;background:#f8f9fa;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;color:#1e293b"
            >
              <main
                style="max-width:540px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.05)"
              >
                <div style="border-bottom:2px solid #00387b;padding-bottom:16px;margin-bottom:24px">
                  <p
                    style="margin:0 0 6px;color:#f4a900;font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase"
                  >
                    ${churchName}
                  </p>
                  <h1 style="margin:0;font-size:22px;color:#00387b;font-weight:bold">
                    ${statusTitle}
                  </h1>
                </div>

                <p style="margin:0 0 16px;font-size:15px;line-height:1.6">
                  Hello <strong>${name}</strong>,
                </p>

                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569">
                  ${statusMessage}
                </p>

                <div
                  style="margin:0 0 24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;display:flex;align-items:center;gap:12px"
                >
                  <div>
                    <span style="font-size:11px;font-weight:bold;color:#64748b;text-transform:uppercase;letter-spacing:1px;display:block">
                      Current Status
                    </span>
                    <strong style="font-size:14px;color:#00387b;text-transform:capitalize">
                      ${newStatus.replace('_', ' ')}
                    </strong>
                  </div>
                </div>

                <div style="border-top:1px solid #e2e8f0;padding-top:20px;margin-top:24px">
                  <p style="margin:0 0 4px;font-size:13px;font-weight:bold;color:#00387b">
                    ${churchName}
                  </p>
                  <p style="margin:0;font-size:12px;color:#94a3b8">
                    Seventh-day Adventist Church · Faith, Hope, and Love
                  </p>
                </div>
              </main>
            </body>
          </html>`,
      });

      this.logger.log(`[InquiryStatusUpdate] Delivered status email to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(
        `[InquiryStatusUpdate] Failed to send status email to ${to}: ${(error as Error).message}`,
      );
      return false;
    }
  }
}

