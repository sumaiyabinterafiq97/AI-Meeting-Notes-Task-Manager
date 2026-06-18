import { describe, it, expect } from 'vitest';
import { createWorkspaceSchema } from '@/features/workspaces/schemas/workspace.schemas';

describe('createWorkspaceSchema', () => {
  it('accepts valid workspace data', () => {
    const result = createWorkspaceSchema.safeParse({
      name: 'Product Team',
      description: 'Our main workspace',
    });
    expect(result.success).toBe(true);
  });

  it('rejects names shorter than 3 characters', () => {
    const result = createWorkspaceSchema.safeParse({ name: 'AB' });
    expect(result.success).toBe(false);
  });

  it('rejects descriptions longer than 2000 characters', () => {
    const result = createWorkspaceSchema.safeParse({
      name: 'Valid Name',
      description: 'a'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});
