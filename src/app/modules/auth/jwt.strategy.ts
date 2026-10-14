import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { UsersService } from '../users/users.service';

const cookieOrHeaderExtractor = (req: Request) => {
  let token: string | null | undefined = null;
  const cookies = req?.cookies as Record<string, unknown> | undefined;
  const cookieToken = cookies?.access_token;
  if (typeof cookieToken === 'string') {
    token = cookieToken;
  }
  if (!token) {
    token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  }
  return token ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: cookieOrHeaderExtractor,
      ignoreExpiration: false,
      secretOrKey: config.get<string>(
        'JWT_SECRET',
        'secret-key-change-me-in-production',
      ),
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    refreshToken?: string;
  }) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('Account no longer exists');

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      refreshToken: payload.refreshToken,
    };
  }
}
