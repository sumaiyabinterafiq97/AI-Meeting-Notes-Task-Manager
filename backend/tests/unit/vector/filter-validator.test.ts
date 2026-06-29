import {
  filterValidatorService,
  RetrievalFilterValidationError,
} from '../../../src/modules/vector/services/filter-validator.service';

describe('FilterValidatorService', () => {
  const validQuery = {
    workspaceId: '00000000-0000-0000-0000-000000000001',
    query: 'authentication',
    mode: 'hybrid' as const,
  };

  it('requires workspaceId', () => {
    expect(() =>
      filterValidatorService.validate({ ...validQuery, workspaceId: '' }),
    ).toThrow(RetrievalFilterValidationError);
  });

  it('rejects invalid source types', () => {
    expect(() =>
      filterValidatorService.validate({
        ...validQuery,
        sourceTypes: ['invalid' as never],
      }),
    ).toThrow(RetrievalFilterValidationError);
  });

  it('rejects inverted date range', () => {
    expect(() =>
      filterValidatorService.validate({
        ...validQuery,
        dateFrom: '2026-06-20',
        dateTo: '2026-06-01',
      }),
    ).toThrow(RetrievalFilterValidationError);
  });

  it('blocks cross-meeting scope', () => {
    expect(() =>
      filterValidatorService.assertMeetingScope(
        validQuery.workspaceId,
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000003',
      ),
    ).toThrow(RetrievalFilterValidationError);
  });
});
