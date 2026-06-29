import fs from 'fs';
import path from 'path';

const FIXTURES_DIR = path.resolve(__dirname, '../../prompts/evaluations/fixtures');

describe('prompt eval fixtures', () => {
  it('includes all seven agent fixture files', () => {
    const expected = [
      'summarizer.yaml',
      'task-extractor.yaml',
      'decision-agent.yaml',
      'risk-analyzer.yaml',
      'chat-agent.yaml',
      'weekly-report.yaml',
      'knowledge-agent.yaml',
    ];
    for (const file of expected) {
      expect(fs.existsSync(path.join(FIXTURES_DIR, file))).toBe(true);
    }
  });

  it('manifest references existing fixture files', () => {
    const manifest = fs.readFileSync(path.join(FIXTURES_DIR, 'manifest.yaml'), 'utf8');
    const fileRefs = [...manifest.matchAll(/file:\s*(\S+\.yaml)/g)].map((m) => m[1]);
    expect(fileRefs.length).toBeGreaterThanOrEqual(7);
    for (const file of fileRefs) {
      expect(fs.existsSync(path.join(FIXTURES_DIR, file))).toBe(true);
    }
  });

  it('includes adversarial injection cases in summarizer fixtures', () => {
    const content = fs.readFileSync(path.join(FIXTURES_DIR, 'summarizer.yaml'), 'utf8');
    expect(content).toMatch(/injection/);
    expect(content).toMatch(/adversarial/);
  });
});
