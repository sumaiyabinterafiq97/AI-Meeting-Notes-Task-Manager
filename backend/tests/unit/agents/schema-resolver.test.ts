import {
  resolveJsonSchema,
  resolveZodSchema,
} from '../../../src/modules/agents/schemas/schema-resolver';
import { ChatResponseSchema } from '../../../src/modules/agents/schemas/zod-schemas';

describe('schema resolver', () => {
  it('resolves chat JSON schema with strict mode', () => {
    const schema = resolveJsonSchema('chat');
    expect(schema).toMatchObject({
      name: expect.stringContaining('chat_response'),
      strict: true,
      schema: expect.objectContaining({
        type: 'object',
        properties: expect.objectContaining({
          content: expect.any(Object),
        }),
      }),
    });
  });

  it('resolves chat zod schema for validation', () => {
    expect(resolveZodSchema('chat')).toBe(ChatResponseSchema);
  });
});
