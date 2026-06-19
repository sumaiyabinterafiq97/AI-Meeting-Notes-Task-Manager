import type { CalendarProvider } from '@prisma/client';
import { env } from '../../../config/env';
import { googleCalendarProvider } from './google-calendar.provider';
import { microsoftCalendarProvider } from './microsoft-calendar.provider';
import {
  mockGoogleCalendarProvider,
  mockMicrosoftCalendarProvider,
} from './mock-calendar.provider';
import type { ICalendarProvider } from '../types/calendar.types';

export function useMockCalendar(): boolean {
  return env.CALENDAR_USE_MOCK || env.AI_USE_MOCK;
}

export function getCalendarProvider(provider: CalendarProvider): ICalendarProvider {
  if (useMockCalendar()) {
    return provider === 'GOOGLE' ? mockGoogleCalendarProvider : mockMicrosoftCalendarProvider;
  }
  return provider === 'GOOGLE' ? googleCalendarProvider : microsoftCalendarProvider;
}
