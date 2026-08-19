import { describe, expect, it } from 'vitest';
import {
  bannedOpeners,
  digitTokens,
  normalizeDigits,
  validateChartDescription,
  validateChartDescriptions,
} from '@/lib/chart-description-rules';

const ENTRY = {
  component: 'ReliabilityCompounding',
  file: 'components/interactive/reliability-compounding.tsx',
  text: 'At 95.0 percent per-step success, episode success collapses from 100 percent at 1 step to 21.5 percent at 30 steps and 0.6 percent at 100 steps.',
  quantityNames: ['episode success', 'steps'],
};

describe('digitTokens', () => {
  it('counts words carrying digits, not digit characters', () => {
    expect(digitTokens('4,096 envs and 924k FPS')).toEqual(['4,096', '924k']);
  });
  it('returns an empty list for digit-free text', () => {
    expect(digitTokens('a caption with no numbers')).toEqual([]);
  });
});

describe('normalizeDigits', () => {
  it('collides same-shaped sentences with different numbers', () => {
    expect(normalizeDigits('falls from 3.6 h at 64')).toBe(
      normalizeDigits('falls from 1.5 h at 32'),
    );
  });
  it('keeps genuinely different sentences apart', () => {
    expect(normalizeDigits('loss falls to 0.015')).not.toBe(
      normalizeDigits('loop closes under 20 ms'),
    );
  });
});

describe('bannedOpeners (VAL-EDU-026 list)', () => {
  it('rejects "this chart" and "the figure" openers case-insensitively', () => {
    expect(bannedOpeners('This chart shows the decay of reliability')).toHaveLength(1);
    expect(bannedOpeners('the diagram plots latency')).toHaveLength(1);
  });
  it('rejects "line chart of" openers', () => {
    expect(bannedOpeners('Line chart of episode success against steps')).toHaveLength(1);
  });
  it('rejects "diagram showing" openers', () => {
    expect(bannedOpeners('Diagram showing the footfall pattern')).toHaveLength(1);
  });
  it('rejects "shows the relationship" anywhere, not only at the start', () => {
    expect(bannedOpeners('Latency doubles, and it shows the relationship between size and speed')).toHaveLength(1);
  });
  it('accepts a sentence that opens on its own subject', () => {
    expect(bannedOpeners(ENTRY.text)).toEqual([]);
  });
});

describe('validateChartDescription', () => {
  it('passes the authored reliability takeaway', () => {
    expect(validateChartDescription(ENTRY)).toEqual([]);
  });
  it('fails a missing description', () => {
    expect(
      validateChartDescription({ ...ENTRY, text: '' }),
    ).toHaveLength(1);
  });
  it('fails fewer than two digit-bearing tokens', () => {
    const problems = validateChartDescription({
      ...ENTRY,
      text: 'Episode success decays toward 0 as steps grow.',
    });
    expect(problems[0].message).toMatch(/fewer than two digit-bearing tokens/);
  });
  it('fails a missing plotted quantity name', () => {
    const problems = validateChartDescription({
      ...ENTRY,
      text: 'At 95.0 percent per-step success, the probability collapses to 21.5 percent at 30 steps.',
    });
    expect(problems[0].message).toMatch(/plotted quantity "episode success"/);
  });
  it('fails a banned opener naming the component', () => {
    const problems = validateChartDescription({
      ...ENTRY,
      text: 'This chart shows episode success falling to 21.5 percent at 30 steps.',
    });
    expect(problems[0].component).toBe('ReliabilityCompounding');
    expect(problems[0].message).toMatch(/banned opener/);
  });
});

describe('validateChartDescriptions (rule 4, set-level)', () => {
  it('fails a digit-normalised duplicate across two charts', () => {
    const problems = validateChartDescriptions([
      ENTRY,
      {
        ...ENTRY,
        component: 'OtherChart',
        text: 'At 99.0 percent per-step success, episode success collapses from 100 percent at 1 step to 74.0 percent at 30 steps and 9.0 percent at 100 steps.',
      },
    ]);
    expect(problems).toHaveLength(1);
    expect(problems[0].component).toBe('OtherChart');
    expect(problems[0].message).toMatch(/digit-normalised duplicate/);
  });
  it('passes six distinct takeaways', () => {
    const base = { file: 'x.tsx' };
    const entries = [
      { ...ENTRY },
      { ...base, component: 'B', quantityNames: ['loss', 'hours'], text: 'Loss falls from 0.024 at 1k hours to 0.015 at 20k hours over the measured range.' },
      { ...base, component: 'C', quantityNames: ['inference', 'ms'], text: 'Inference takes 52.6 ms against a 20 ms budget, so the loop runs 19 Hz.' },
      { ...base, component: 'D', quantityNames: ['DROID', 'Llama 3'], text: 'DROID holds 350 hours where Llama 3 holds 15 trillion tokens.' },
      { ...base, component: 'E', quantityNames: ['wall-clock', 'envs'], text: 'Wall-clock falls from 1.9 h at 64 envs to 4.0 min at 4,096 envs.' },
      { ...base, component: 'F', quantityNames: ['walk', 'feet'], text: 'The walk keeps 3 feet down at duty factor 0.75 across the whole cycle.' },
    ];
    expect(validateChartDescriptions(entries)).toEqual([]);
  });
});
