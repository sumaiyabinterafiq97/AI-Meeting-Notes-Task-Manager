import jwt from 'jsonwebtoken';
import { CalendarProvider } from '@prisma/client';
import { env } from '../../../config/env';
import { AppError, ErrorCodes } from '../../../utils/errors';

export interface CalendarOAuthState {
  workspaceId: string;
  userId: string;
  provider: CalendarProvider;
}

export class CalendarOAuthService {
  createState(payload: CalendarOAuthState): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
  }

  verifyState(state: string): CalendarOAuthState {
    try {
      const decoded = jwt.verify(state, env.JWT_ACCESS_SECRET) as CalendarOAuthState;
      if (!decoded.workspaceId || !decoded.userId || !decoded.provider) {
        throw new Error('Invalid state payload');
      }
      return decoded;
    } catch {
      throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid or expired OAuth state');
    }
  }
}

export const calendarOAuthService = new CalendarOAuthService();
