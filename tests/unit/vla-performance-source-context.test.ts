import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HARDWARE } from '@/data/hardware';

const article = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const realtime = () => article('content/manipulation/realtime-execution.mdx');
const hardware = () => article('content/data-hardware/hardware-taxonomy.mdx');

describe('VLA-Perf source context', () => {
  it('distinguishes analytical predictions from empirical profiling in both articles', () => {
    expect(realtime()).toContain('roofline-based analytical model');
    expect(realtime()).toContain('not a hardware-wide profiling campaign');
    expect(realtime()).toContain('hypothetical variant');
    expect(realtime()).toContain('baseline is 2.7B parameters');
    expect(hardware()).toContain('batch-one analytical predictions');
    expect(hardware()).toContain('not measurements from running the policy on all five GPUs');
    for (const text of [realtime(), hardware()]) {
      expect(text).toContain('224×224');
      expect(text).toContain('32 language tokens');
      expect(text).toContain('14 action dimensions');
      expect(text).toContain('chunk size 50');
      expect(text).toContain('10 denoising steps');
      expect(text).toContain('BF16');
      expect(text).toContain('FP16');
    }
  });

  it('preserves all five predicted GPU rates and the quantified chunk-size caveat', () => {
    const text = hardware();
    for (const rate of ['19.0 Hz', '32.2 Hz', '61.7 Hz', '162.5 Hz', '314.4 Hz']) {
      expect(text).toContain(rate);
    }
    expect(text).toContain('expert latency 5× and total VLA latency 2.15×');
    expect(text).toContain('expert latency 40% and total latency 11%');
    expect(text).toContain('gigabytes per second');
    expect(text).toContain('gigabits per second');
  });

  it('keeps the exact four GPU configurations and source-scoped null prices', () => {
    const expected = [
      ['rtx-4090', '24 GB, 1,008 GB/s', '32.2 Hz'],
      ['a100-80gb', '80 GB, 2,039 GB/s', '61.7 Hz'],
      ['h100-80gb', '80 GB, 3,350 GB/s', '162.5 Hz'],
      ['b100', '192 GB, 8,000 GB/s', '314.4 Hz'],
    ] as const;
    for (const [id, configuration, rate] of expected) {
      const entries = HARDWARE.filter((entry) => entry.id === id);
      expect(entries).toHaveLength(1);
      const entry = entries[0];
      expect(entry.priceUsd).toBeNull();
      expect(entry.priceMaxUsd).toBeNull();
      expect(entry.sources).toContain('vla-perf-2026');
      expect(entry.highlight).toContain(configuration);
      expect(entry.highlight).toContain(`predicted pi0 inference ${rate}, no network`);
      expect(entry.highlight).toContain('Price not established by this source.');
      expect(entry.highlight).not.toContain('runs pi0');
    }
    expect(hardware()).toContain('not because no manufacturer or seller publishes prices');
    expect(hardware()).not.toContain('The paper publishes no card prices');
  });

  it('keeps network exceptions, quantization uncertainty, and toy defaults explicit', () => {
    const text = realtime();
    expect(text).toContain('RTX 4090 over 5G is slower at 55.7 ms');
    expect(text).toContain('not an FP4/FP8 2 to 4× speedup result or an accuracy-loss validation');
    expect(text).toContain('not universal robot-control requirements');
    expect(text).toContain('defaultParamsB={1.1}');
    expect(text).toContain('answer="one-b"');
    expect(text).toContain('deliberately chosen 3.0B reference coordinate');
    expect(text).toContain('five-tick linear blend');
    expect(text).toContain('not physical jerk');
  });
});
