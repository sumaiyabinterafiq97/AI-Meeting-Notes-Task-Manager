import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  jti: string;
}

export function signAccessToken(user: { id: string; email: string }): string {
  const payload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    jti: randomUUID(),
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload & AccessTokenPayload;

  if (!payload.sub || !payload.email) {
    throw new jwt.JsonWebTokenError('Invalid token payload');
  }

  return {
    sub: payload.sub,
    email: payload.email,
    jti: payload.jti ?? randomUUID(),
  };
}
