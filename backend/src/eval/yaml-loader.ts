import fs from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import type { EvalCase, EvalFixtureFile, EvalManifest } from './types';

export const FIXTURES_DIR = path.resolve(__dirname, '../../prompts/evaluations/fixtures');

export function loadManifest(): EvalManifest {
  const raw = fs.readFileSync(path.join(FIXTURES_DIR, 'manifest.yaml'), 'utf8');
  return parseYaml(raw) as EvalManifest;
}

export function loadFixtureFile(fileName: string): EvalFixtureFile {
  const raw = fs.readFileSync(path.join(FIXTURES_DIR, fileName), 'utf8');
  return parseYaml(raw) as EvalFixtureFile;
}

export function collectCases(
  fixture: EvalFixtureFile,
  options: { includeV21: boolean; caseId?: string },
): EvalCase[] {
  const cases = [...(fixture.cases ?? [])];
  if (options.includeV21 && fixture.v21_cases?.length) {
    cases.push(...fixture.v21_cases);
  }

  if (options.caseId) {
    const match = cases.filter((c) => c.id === options.caseId);
    if (match.length === 0) {
      throw new Error(`Case ${options.caseId} not found in ${fixture.agent} fixture`);
    }
    return match;
  }

  return cases;
}
