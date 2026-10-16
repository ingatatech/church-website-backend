import { HttpStatus, Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { MemoryStoreService } from '../cache/memory-store.service';
import { sendError } from '../../helpers/message/sendResult';

@Injectable()
export class OtpService {
  private readonly OTP_TTL = 600; // 10 minutes

  constructor(private readonly store: MemoryStoreService) {}

  async generate(requestId: string): Promise<string> {
    const otp = randomInt(100_000, 1_000_000).toString();
    await this.store.set(this.key(requestId), otp, this.OTP_TTL);
    return otp;
  }

  async verify(requestId: string, otp: string): Promise<boolean> {
    const stored = await this.store.get(this.key(requestId));
    if (!stored || stored !== otp) {
      sendError(
        HttpStatus.BAD_REQUEST,
        'Invalid or expired verification code',
        'INVALID_OTP',
      );
    }
    await this.store.del(this.key(requestId));
    return true;
  }

  async isCurrent(requestId: string, otp: string): Promise<boolean> {
    return (await this.store.get(this.key(requestId))) === otp;
  }

  private key(requestId: string): string {
    return `otp:${requestId}`;
  }
}
