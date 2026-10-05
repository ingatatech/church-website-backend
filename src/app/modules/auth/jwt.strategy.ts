import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

const cookieOrHeaderExtractor = (req: Request) => {
  let token: string | null | undefined = null;
  if (req && req.cookies) {
    token = req.cookies['access_token'] as string | undefined;
  }
  if (!token) {
    token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  }
  return token ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: cookieOrHeaderExtractor,
      ignoreExpiration: false,
      secretOrKey: config.get<string>(
        'JWT_SECRET',
        'secret-key-change-me-in-production',
      ),
    });
  }

  validate(payload: { sub: string; email: string; refreshToken?: string }) {
    return {
      id: payload.sub,
      email: payload.email,
      refreshToken: payload.refreshToken,
    };
  }
}
