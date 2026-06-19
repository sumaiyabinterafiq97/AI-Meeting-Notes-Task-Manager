import fs from 'fs';
import path from 'path';
import type { PromptRenderContext, PromptTemplate, RenderedPrompt } from '../types/prompt.types';
import { parsePromptMarkdown } from './prompt-parser';

const PROMPTS_DIR = path.resolve(__dirname, '../../../../prompts');

function interpolate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    return variables[key] ?? '';
  });
}

export class PromptRegistryService {
  private templates = new Map<string, PromptTemplate>();

  loadFromDisk(): void {
    if (!fs.existsSync(PROMPTS_DIR)) return;

    const files = fs.readdirSync(PROMPTS_DIR).filter((file) => file.endsWith('.prompt.md'));
    for (const file of files) {
      const raw = fs.readFileSync(path.join(PROMPTS_DIR, file), 'utf8');
      const parsed = parsePromptMarkdown(raw);

      this.templates.set(parsed.id, {
        id: parsed.id,
        version: parsed.version,
        workflow: parsed.workflow,
        modelHint: parsed.modelHint,
        system: parsed.system,
        variables: parsed.variables,
        outputSchema: parsed.outputSchema,
      });
    }
  }

  get(id: string): PromptTemplate | undefined {
    if (this.templates.size === 0) {
      this.loadFromDisk();
    }
    return this.templates.get(id);
  }

  render(id: string, context: PromptRenderContext): RenderedPrompt | null {
    const template = this.get(id);
    if (!template) return null;

    const system = interpolate(template.system, context.variables);

    return {
      id: template.id,
      version: template.version,
      messages: system ? [{ role: 'system', content: system }] : [],
    };
  }

  list(): PromptTemplate[] {
    if (this.templates.size === 0) {
      this.loadFromDisk();
    }
    return Array.from(this.templates.values());
  }
}

export const promptRegistry = new PromptRegistryService();
