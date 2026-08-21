import { describe, expect, it } from 'vitest';
import { findProseCitationYearDisagreements } from '@/lib/prose-citation-years';

/**
 * The scanner compares an author-year mention in prose against the registry
 * year of the <Cite> chip it introduces. The hard part is not finding the
 * disagreement, it is not reporting the many parenthesised years that are
 * not citations at all: a naive version of this check reported three phantom
 * hits on bear-case, reliability-gap and generative-video by matching bare
 * dates such as "(September 2025)".
 */

const registry = [
  { id: 'pi-rl-2026', year: 2026, authors: ['Kang Chen', 'Zhihao Liu'] },
  { id: 'conrft-2025', year: 2025, authors: ['Yuhui Chen', 'Shuai Tian'] },
  { id: 'act-2023', year: 2023, authors: ['Tony Z. Zhao'] },
];

const scan = (body: string, exceptions: string[] = []) =>
  findProseCitationYearDisagreements({
    file: 'test.mdx',
    body,
    citations: registry,
    exemptIds: new Set(exceptions),
  });

describe('findProseCitationYearDisagreements', () => {
  it('flags a prose year that disagrees with the chip that follows it', () => {
    const hits = scan('**pi_RL** (Chen et al., 2025) is the treatment <Cite id="pi-rl-2026" />.');
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ citationId: 'pi-rl-2026', proseYear: 2025, registryYear: 2026 });
  });

  it('accepts a prose year that agrees with the chip', () => {
    expect(scan('**ConRFT** (Chen et al., 2025) attacks it <Cite id="conrft-2025" />.')).toEqual([]);
  });

  it('does not match a bare parenthetical date that introduces no citation', () => {
    // The exact false-positive shape from bear-case/reliability-gap.
    expect(scan('The demo shipped (September 2025) and slipped (December 2024).')).toEqual([]);
  });

  it('does not match a bare year with no author before it', () => {
    expect(scan('Between (2019) and (2024) the field moved <Cite id="act-2023" />.')).toEqual([]);
  });

  it('handles the et al. form and a plain two-author form alike', () => {
    expect(scan('(Zhao et al., 2023) <Cite id="act-2023" />.')).toEqual([]);
    expect(scan('(Chen and Tian, 2025) <Cite id="conrft-2025" />.')).toEqual([]);
  });

  it('accepts a year range whose end matches the registry', () => {
    expect(scan('(Chen et al., 2025-2026) <Cite id="pi-rl-2026" />.')).toEqual([]);
  });

  it('stays silent when a declared divergence explains the mismatch', () => {
    expect(scan('(Chen et al., 2025) <Cite id="pi-rl-2026" />.', ['pi-rl-2026'])).toEqual([]);
  });

  it('does not bind a mention to a chip in a later paragraph', () => {
    // A mention must introduce the chip, not merely precede one eventually.
    const body = '(Chen et al., 2025) is discussed at length.\n\nA later paragraph cites <Cite id="pi-rl-2026" />.';
    expect(scan(body)).toEqual([]);
  });

  it('binds across sentences within one paragraph', () => {
    // The shipped pi_RL defect: the mention opens the paragraph and the chip
    // closes it three sentences later. A sentence-scoped rule misses it,
    // which is the whole reason this case is pinned.
    const body =
      '**pi_RL** (Chen et al., 2025) is the most complete treatment. Flow-Noise models denoising as an MDP. Flow-SDE converts the ODE into an SDE. The paper reports gains <Cite id="pi-rl-2026" />.';
    const hits = scan(body);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ proseYear: 2025, registryYear: 2026 });
  });

  it('does not bind a mention to a chip for a different paper later in the paragraph', () => {
    // Same paragraph, but the chip resolves to an entry this surname did not
    // write, so the mention is about something else.
    const body = '(Levine et al., 2024) set the stage. The method matters <Cite id="pi-rl-2026" />.';
    expect(scan(body)).toEqual([]);
  });

  it('reports the surname it matched so a hit can be verified by hand', () => {
    const hits = scan('(Chen et al., 2025) <Cite id="pi-rl-2026" />.');
    expect(hits[0].surname).toBe('Chen');
  });

  it('ignores a mention whose surname is not an author of the cited entry', () => {
    // "(Levine et al., 2024)" before an ACT chip is a different paper being
    // discussed, not a wrong year on this one.
    expect(scan('(Levine et al., 2024) motivated it <Cite id="act-2023" />.')).toEqual([]);
  });
});
