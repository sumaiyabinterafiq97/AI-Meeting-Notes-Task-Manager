import { describe, it, expect } from 'vitest';
import { getApiError, getApiErrorMessage, getFieldErrors } from '@/lib/api-errors';

describe('api-errors', () => {
  it('extracts API error message from axios response', () => {
    const error = {
      response: {
        data: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: [{ field: 'email', message: 'Invalid email format' }],
          },
        },
      },
    };

    expect(getApiError(error).code).toBe('VALIDATION_ERROR');
    expect(getApiErrorMessage(error)).toBe('Invalid request body');
    expect(getFieldErrors(error)).toEqual({ email: 'Invalid email format' });
  });

  it('returns fallback for unknown errors', () => {
    expect(getApiErrorMessage(new Error('Network failed'), 'Fallback')).toBe('Network failed');
    expect(getApiErrorMessage(null, 'Fallback')).toBe('Fallback');
  });
});
