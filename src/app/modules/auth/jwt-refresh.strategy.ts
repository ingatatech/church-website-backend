import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

const refreshExtractor = (req: Request) => {
  return req?.cookies?.['refresh_token'] ?? null;
};

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: refreshExtractor,
      ignoreExpiration: false,
      secretOrKey: config.get<string>(
        'JWT_SECRET',
        'secret-key-change-me-in-production',
      ),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: { sub: string }) {
    const refreshToken = refreshExtractor(req);
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }
    return { id: payload.sub, refreshToken };
  }
}
