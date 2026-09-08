import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BIN_COUNT, binCenter, binIndex } from '@/lib/action-tokenization';

const article = (slug: string) => readFileSync(join(process.cwd(), 'content/manipulation', `${slug}.mdx`), 'utf8');

describe('source-specific VLA and generalist closeout wording', () => {
  it('separates RT-1 transformer size, full-system size and measured timing', () => {
    const body = article('vla-models');
    expect(body).toContain('19M parameters');
    expect(body).toContain('35M parameters for the full system');
    expect(body).toContain('280 ms');
    expect(body).toContain('3,000 real-world evaluation trials');
  });

  it('retains OpenVLA quantile bounds and the two evaluation populations', () => {
    const body = article('vla-models');
    expect(body).toContain('1st and 99th quantiles');
    expect(body).toContain('17 WidowX tasks with ten trials each');
    expect(body).toContain('12 Google-robot tasks with five trials each');
    expect(body).toContain('partial credit');
  });

  it('restores ACT as a required VLA reference without dropping OFT', () => {
    const body = article('vla-models');
    const frontmatter = body.split('---')[1];
    expect(frontmatter).toContain('act-aloha-2023');
    expect(frontmatter).toContain('openvla-oft-2025');
    expect(body).toContain('35.3%');
    expect(body).toContain('44%');
  });

  it('attributes the OXE data-quality criticism rather than declaring consensus', () => {
    for (const slug of ['vla-models', 'cross-embodiment']) {
      const body = article(slug);
      expect(body).toContain('October 2025');
      expect(body).toContain('Reuss');
      expect(body).toMatch(/personal|his stated assessment/);
    }
  });

  it('reconstructs every illustrative bin center with exactly zero error', () => {
    expect(BIN_COUNT).toBe(256);
    for (let index = 0; index < BIN_COUNT; index += 1) {
      const center = binCenter(index);
      expect(binIndex(center)).toBe(index);
      expect(binCenter(binIndex(center)) - center).toBe(0);
    }
  });
});
