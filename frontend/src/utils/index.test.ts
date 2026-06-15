import { describe, it, expect } from 'vitest';
import { APP_NAME } from '@/lib/constants';

describe('constants', () => {
  it('exports app name', () => {
    expect(APP_NAME).toBe('AI Meeting Notes & Task Manager');
  });
});
