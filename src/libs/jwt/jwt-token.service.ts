import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RedisService } from '../redis/redis.service';

export interface TokenPayload {
  sub: string;
  email: string;
  phone?: string | null;
}

@Injectable()
export class JwtTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async generateTokenPair(payload: TokenPayload) {
    const secret = this.config.get<string>('JWT_SECRET', 'secret-key-change-me-in-production');
    
    const accessTokenExpiresIn = '1h';
    const refreshTokenExpiresIn = '7d';

    const accessToken = await this.jwtService.signAsync(payload, {
      secret,
      expiresIn: accessTokenExpiresIn as any,
    });

    const refreshToken = await this.jwtService.signAsync(
      { sub: payload.sub, tokenType: 'refresh' },
      {
        secret,
        expiresIn: refreshTokenExpiresIn as any,
      },
    );

    return { accessToken, refreshToken };
  }

  async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const hashed = await bcrypt.hash(refreshToken, 10);
    await this.redis.set(`refresh_token:${userId}`, hashed, 30 * 24 * 3600);
  }

  async validateRefreshToken(userId: string, refreshToken: string): Promise<boolean> {
    const storedHashed = await this.redis.get(`refresh_token:${userId}`);
    if (!storedHashed) return false;
    return bcrypt.compare(refreshToken, storedHashed);
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    await this.redis.del(`refresh_token:${userId}`);
  }
}
