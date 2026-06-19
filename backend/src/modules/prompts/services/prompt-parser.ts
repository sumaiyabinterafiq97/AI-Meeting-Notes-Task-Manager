export interface ParsedPromptFile {
  id: string;
  version: string;
  workflow: string;
  modelHint?: string;
  variables: string[];
  outputSchema?: string;
  system: string;
}

function parseFrontmatterValue(raw: string): string {
  return raw.trim().replace(/^["']|["']$/g, '');
}

function parseFrontmatter(block: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  let currentKey: string | null = null;
  let listItems: string[] = [];

  for (const line of block.split('\n')) {
    const listMatch = line.match(/^\s*-\s+(.+)$/);
    if (listMatch && currentKey) {
      listItems.push(parseFrontmatterValue(listMatch[1]));
      continue;
    }

    if (listItems.length > 0 && currentKey) {
      result[currentKey] = listItems;
      listItems = [];
      currentKey = null;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyMatch) continue;

    currentKey = keyMatch[1];
    const value = parseFrontmatterValue(keyMatch[2]);
    if (value) {
      result[currentKey] = value;
      currentKey = null;
    }
  }

  if (listItems.length > 0 && currentKey) {
    result[currentKey] = listItems;
  }

  return result;
}

function extractSystemPrompt(body: string): string {
  const sections = [
    '## System Instructions',
    '## Anti-Hallucination Instructions',
    '## Instructions',
  ];

  for (const heading of sections) {
    const index = body.indexOf(heading);
    if (index === -1) continue;

    const afterHeading = body.slice(index + heading.length);
    const nextHeading = afterHeading.search(/\n##\s+/);
    const section =
      nextHeading === -1 ? afterHeading : afterHeading.slice(0, nextHeading);

    const cleaned = section
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/_TBD_/g, '')
      .trim();

    if (cleaned) return cleaned;
  }

  return body
    .replace(/^#[^\n]*\n?/m, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/_TBD_/g, '')
    .trim();
}

export function parsePromptMarkdown(raw: string): ParsedPromptFile {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return {
      id: 'unknown',
      version: '0.0.0',
      workflow: 'shared',
      variables: [],
      system: raw.trim(),
    };
  }

  const frontmatter = parseFrontmatter(match[1]);
  const body = match[2];
  const variables = frontmatter.variables;

  return {
    id: String(frontmatter.id ?? 'unknown'),
    version: String(frontmatter.version ?? '0.0.0'),
    workflow: String(frontmatter.workflow ?? 'shared'),
    modelHint: frontmatter.model_hint ? String(frontmatter.model_hint) : undefined,
    variables: Array.isArray(variables) ? variables : [],
    outputSchema: frontmatter.output_schema ? String(frontmatter.output_schema) : undefined,
    system: extractSystemPrompt(body),
  };
}
