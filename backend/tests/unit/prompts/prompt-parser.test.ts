import { parsePromptMarkdown } from '../../../src/modules/prompts/services/prompt-parser';

describe('prompt-parser', () => {
  it('parses frontmatter and extracts system instructions', () => {
    const raw = `---
id: chat-agent
version: "1.0.0"
workflow: chat
variables:
  - userMessage
  - contextBlocks
---

# Chat Agent

## System Instructions

You are MeetingMind AI.

Use context: {{contextBlocks}}
`;

    const parsed = parsePromptMarkdown(raw);

    expect(parsed.id).toBe('chat-agent');
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.workflow).toBe('chat');
    expect(parsed.variables).toEqual(['userMessage', 'contextBlocks']);
    expect(parsed.system).toContain('You are MeetingMind AI');
    expect(parsed.system).toContain('{{contextBlocks}}');
  });
});
