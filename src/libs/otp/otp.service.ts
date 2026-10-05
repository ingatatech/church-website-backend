import { HttpStatus, Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { sendError } from '../../helpers/message/sendResult';

@Injectable()
export class OtpService {
  private readonly OTP_TTL = 600; // 10 minutes

  constructor(private readonly redis: RedisService) {}

  async generate(requestId: string): Promise<string> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redis.set(this.key(requestId), otp, this.OTP_TTL);
    return otp;
  }

  async verify(requestId: string, otp: string): Promise<boolean> {
    const stored = await this.redis.get(this.key(requestId));
    if (!stored || stored !== otp) {
      sendError(
        HttpStatus.BAD_REQUEST,
        'Invalid or expired verification code',
        'INVALID_OTP',
      );
    }
    await this.redis.del(this.key(requestId));
    return true;
  }

  private key(requestId: string): string {
    return `otp:${requestId}`;
  }
}
