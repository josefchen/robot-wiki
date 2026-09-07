import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '@/data/citations';

const article = readFileSync('content/manipulation/action-chunking.mdx', 'utf8');
describe('ACT current source qualifications', () => {
  it('distinguishes six joints plus a gripper from the paper shorthand', () => {
    expect(article).toContain('six arm joints and one gripper coordinate per arm');
    expect(article).toContain('7+7=14');
  });
  it('represents the paper L1 versus MSE inconsistency rather than a universal objective', () => {
    expect(article).toContain('Section IV-C specifies L1 reconstruction');
    expect(article).toContain('Algorithm 1 prints MSE');
  });
  it('separates added delay, base model latency and experiment scope', () => {
    expect(article).toContain('76 ms for the baselines and 97 ms for RTC');
    expect(article).toContain('10 to 20 ms');
    expect(article).toContain('six tasks, ten episodes per task');
    expect(article).not.toContain('which is why the later');
    expect(article).not.toContain('Once inference latency reaches 100 to 200 ms');
  });
  it('uses the primary blog title and named byline', () => {
    const cite = CITATIONS.find(c => c.id === 'pi-real-time-chunking-blog-2025')!;
    expect(cite.title).toBe('Real-Time Action Chunking with Large Models');
    expect(cite.authors).toEqual(['Kevin Black', 'Manuel Y. Galliker', 'Sergey Levine']);
  });
  it('labels the interactive percentages and threshold as a toy', () => {
    const component = readFileSync('components/interactive/latency-comparison.tsx', 'utf8');
    expect(component).toContain('Deterministic toy, not measured throughput');
    expect(component).toContain('not a universal latency threshold');
    expect(article).toContain('toy score');
  });
});
