import { validateWithZod } from '../modules/llm/services/zod-validator.service';
import { resolveZodSchema, type AgentSchemaKey } from '../modules/agents/schemas/schema-resolver';

function containsAny(haystack: string, needles: string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some((needle) => lower.includes(needle.toLowerCase()));
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function getAtPath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function evaluateFieldRules(value: unknown, rules: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');

  if (rules.min_length !== undefined && text.length < Number(rules.min_length)) {
    errors.push(`min_length failed (${text.length} < ${rules.min_length})`);
  }
  if (rules.max_length !== undefined && text.length > Number(rules.max_length)) {
    errors.push(`max_length failed (${text.length} > ${rules.max_length})`);
  }
  if (rules.min_words !== undefined && wordCount(text) < Number(rules.min_words)) {
    errors.push(`min_words failed`);
  }
  if (rules.max_words !== undefined && wordCount(text) > Number(rules.max_words)) {
    errors.push(`max_words failed`);
  }
  if (rules.min_items !== undefined && Array.isArray(value) && value.length < Number(rules.min_items)) {
    errors.push(`min_items failed (${value.length} < ${rules.min_items})`);
  }
  if (rules.max_items !== undefined && Array.isArray(value) && value.length > Number(rules.max_items)) {
    errors.push(`max_items failed (${value.length} > ${rules.max_items})`);
  }
  if (rules.min_length !== undefined && Array.isArray(value) && value.length < Number(rules.min_length)) {
    errors.push(`array min_length failed`);
  }
  if (rules.max_length !== undefined && Array.isArray(value) && value.length > Number(rules.max_length)) {
    errors.push(`array max_length failed`);
  }
  if (Array.isArray(rules.must_contain)) {
    for (const needle of rules.must_contain as string[]) {
      if (!text.toLowerCase().includes(needle.toLowerCase())) {
        errors.push(`must_contain "${needle}" failed`);
      }
    }
  }
  if (Array.isArray(rules.must_not_contain)) {
    for (const needle of rules.must_not_contain as string[]) {
      if (text.toLowerCase().includes(needle.toLowerCase())) {
        errors.push(`must_not_contain "${needle}" failed`);
      }
    }
  }
  if (Array.isArray(rules.must_contain_any) && !containsAny(text, rules.must_contain_any as string[])) {
    errors.push(`must_contain_any failed`);
  }
  if (Array.isArray(rules.must_include_any) && Array.isArray(value)) {
    const joined = value.map((v) => String(v)).join(' ').toLowerCase();
    const any = (rules.must_include_any as string[]).some((needle) =>
      joined.includes(needle.toLowerCase()),
    );
    if (!any) errors.push('must_include_any failed');
  }
  if (rules.exact !== undefined && value !== rules.exact) {
    errors.push(`exact match failed (expected ${JSON.stringify(rules.exact)})`);
  }
  if (rules.min !== undefined && Number(value) < Number(rules.min)) {
    errors.push(`min failed`);
  }
  if (rules.max !== undefined && Number(value) > Number(rules.max)) {
    errors.push(`max failed`);
  }
  if (rules.enum !== undefined) {
    const allowed = rules.enum as unknown[];
    if (!allowed.includes(value)) errors.push('enum failed');
  }
  if (typeof rules.must_match_regex === 'string') {
    const re = new RegExp(rules.must_match_regex, 'i');
    if (!re.test(text)) errors.push('must_match_regex failed');
  }

  return errors;
}

export function scoreSchemaValidity(
  schemaKey: AgentSchemaKey,
  output: unknown,
): { pass: boolean; errors: string[] } {
  if (output === null || output === undefined) {
    return { pass: false, errors: ['output is null'] };
  }
  try {
    const payload = typeof output === 'string' ? output : JSON.stringify(output);
    validateWithZod(resolveZodSchema(schemaKey), payload);
    return { pass: true, errors: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'schema validation failed';
    return { pass: false, errors: [message] };
  }
}

export function scoreExactMatch(
  output: unknown,
  expect: Record<string, unknown>,
): { pass: boolean; errors: string[] } {
  const exact = expect.exact as Record<string, unknown> | undefined;
  if (!exact) return { pass: true, errors: [] };

  const errors: string[] = [];
  for (const [key, expected] of Object.entries(exact)) {
    const actual = getAtPath(output, key);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      errors.push(`exact.${key} mismatch`);
    }
  }
  return { pass: errors.length === 0, errors };
}

export function scoreRuleBased(
  output: unknown,
  expect: Record<string, unknown>,
  rawText?: string,
): { pass: boolean; errors: string[] } {
  const errors: string[] = [];
  const expectType = expect.type as string | undefined;

  if (expectType === 'markdown' || typeof output === 'string') {
    const text = typeof output === 'string' ? output : rawText ?? JSON.stringify(output);
    if (Array.isArray(expect.must_contain)) {
      for (const needle of expect.must_contain as string[]) {
        if (!text.includes(needle)) errors.push(`must_contain "${needle}" failed`);
      }
    }
    if (Array.isArray(expect.must_not_contain)) {
      for (const needle of expect.must_not_contain as string[]) {
        if (text.toLowerCase().includes(needle.toLowerCase())) {
          errors.push(`must_not_contain "${needle}" failed`);
        }
      }
    }
    if (Array.isArray(expect.must_contain_any) && !containsAny(text, expect.must_contain_any as string[])) {
      errors.push('must_contain_any failed');
    }
    if (Array.isArray(expect.refusal_patterns)) {
      if (!containsAny(text, expect.refusal_patterns as string[])) {
        errors.push('refusal_patterns not matched');
      }
    }
    if (expect.min_citations !== undefined) {
      const count = (text.match(/\[CITATION-\d+\]/g) ?? []).length;
      if (count < Number(expect.min_citations)) {
        errors.push(`min_citations failed (${count} < ${expect.min_citations})`);
      }
    }
    return { pass: errors.length === 0, errors };
  }

  const fields = expect.fields as Record<string, Record<string, unknown>> | undefined;
  if (fields) {
    for (const [field, rules] of Object.entries(fields)) {
      errors.push(...evaluateFieldRules(getAtPath(output, field), rules).map((e) => `${field}: ${e}`));
    }
  }

  const arrayPaths = expect.array_paths as Record<string, Record<string, unknown>> | undefined;
  if (arrayPaths) {
    for (const [field, rules] of Object.entries(arrayPaths)) {
      errors.push(...evaluateFieldRules(getAtPath(output, field), rules).map((e) => `${field}: ${e}`));
    }
  }

  const items = expect.items as Record<string, Array<Record<string, unknown>>> | undefined;
  if (items) {
    for (const [arrayPath, matchers] of Object.entries(items)) {
      const arr = getAtPath(output, arrayPath);
      if (!Array.isArray(arr)) {
        errors.push(`${arrayPath} is not an array`);
        continue;
      }
      for (const matcher of matchers) {
        if (matcher.fields) {
          const matched = arr.some((item) => {
            const fieldErrors = Object.entries(matcher.fields as Record<string, Record<string, unknown>>)
              .flatMap(([field, rules]) => evaluateFieldRules(getAtPath(item, field), rules));
            return fieldErrors.length === 0;
          });
          if (!matched) errors.push(`${arrayPath} item matcher failed`);
        }
        if (matcher.match_heading && Array.isArray(arr)) {
          const heading = String(matcher.match_heading);
          const section = arr.find(
            (s) =>
              typeof s === 'object' &&
              s !== null &&
              String((s as Record<string, unknown>).heading) === heading,
          ) as Record<string, unknown> | undefined;
          if (!section) {
            errors.push(`section heading "${heading}" not found`);
          } else if (matcher.fields) {
            for (const [field, rules] of Object.entries(
              matcher.fields as Record<string, Record<string, unknown>>,
            )) {
              errors.push(
                ...evaluateFieldRules(section[field], rules).map((e) => `${heading}.${field}: ${e}`),
              );
            }
          }
        }
      }
    }
  }

  const headings = expect.section_headings_must_include as string[] | undefined;
  if (headings && Array.isArray(getAtPath(output, 'sections'))) {
    const sections = getAtPath(output, 'sections') as Array<{ heading?: string }>;
    const existing = new Set(sections.map((s) => s.heading));
    for (const heading of headings) {
      if (!existing.has(heading)) errors.push(`missing section heading "${heading}"`);
    }
  }

  if (expect.must_parse === true && output === null) {
    errors.push('must_parse failed');
  }

  return { pass: errors.length === 0, errors };
}
