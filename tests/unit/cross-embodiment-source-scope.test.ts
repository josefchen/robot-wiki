import { describe, expect, it } from 'vitest';
import { EMBODIMENTS, EEF_SPACE_DIMS, LATENT_DIMS, SHARED_WIDTH, STRATEGIES, rowSummary } from '@/lib/cross-embodiment';

describe('cross-embodiment source scope', () => {
  it('preserves numerical toy behavior without claiming hardware DoF', () => {
    expect(SHARED_WIDTH).toBe(32);
    expect(LATENT_DIMS).toBe(3);
    expect(EEF_SPACE_DIMS).toBe(8);
    expect(EMBODIMENTS.map((body) => body.nativeDims)).toEqual([8, 16, 29, 0]);
    expect(EMBODIMENTS[2].note).toMatch(/illustrative.*not hardware DoF/);
    expect(rowSummary('padded', 'arm').active).toBe(8);
    expect(rowSummary('padded', 'arm').zeroed).toBe(24);
  });
  it('does not equate an empty toy row with an architectural impossibility', () => {
    expect(STRATEGIES.padded.proponent).toBe('Original slot-layout example');
    expect(STRATEGIES.padded.humanVideoVerdict).toContain('no adapter modelled');
    expect(STRATEGIES.padded.mechanism).toContain('performs no normalization');
    expect(STRATEGIES.padded.caveat).toContain('not a claim');
  });
  it('separates the N1.7 data report from EgoScale aligned mid-training', () => {
    const eef = STRATEGIES['relative-eef'];
    expect(eef.humanVideoVerdict).toBe('N1.7 README: 20K hours of EgoScale human video');
    expect(eef.mechanism).toContain('retargeted hand joint actions');
    expect(eef.caveat).toContain('aligned human-robot mid-training');
    expect(eef.mechanism).not.toContain('EmbodimentTag');
    expect(eef.caveat).not.toContain('no domain-adaptation');
  });
});
