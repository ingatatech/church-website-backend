import type { Response } from 'express';

export function setTokenCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
) {
  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('access_token', tokens.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 3600 * 1000,
  });

  res.cookie('refresh_token', tokens.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 3600 * 1000,
  });
}

export function clearTokenCookies(res: Response) {
  const isProd = process.env.NODE_ENV === 'production';

  res.clearCookie('access_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  });

  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  });
}
