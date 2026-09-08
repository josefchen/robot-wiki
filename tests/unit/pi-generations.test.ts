import { describe, expect, it } from 'vitest';
import { getCitation } from '@/data/citations';
import {
  PI_GENERATIONS,
  generationsBehind,
  openWeightsFrontier,
} from '@/lib/pi-generations';

describe('PI_GENERATIONS registry', () => {
  it('covers the five headline generations plus the named variants', () => {
    const names = PI_GENERATIONS.map((g) => g.name);
    for (const required of ['π0', 'π0-FAST', 'π0.5', 'π0.6', 'π0.7']) {
      expect(names).toContain(required);
    }
  });

  it('orders established dates without inventing a MEM month', () => {
    const dates = PI_GENERATIONS.map((g) => g.released).filter((date) => date !== null);
    expect([...dates].sort()).toEqual(dates);
    expect(PI_GENERATIONS.find((g) => g.id === 'pi06-mem')?.released).toBeNull();
  });

  it('marks exactly pi0, pi0-FAST, and pi0.5 as open weights', () => {
    const open = PI_GENERATIONS.filter((g) => g.openWeights).map((g) => g.name);
    expect(open).toEqual(['π0', 'π0-FAST', 'π0.5']);
  });

  it('counts four unlisted model entries without declaring them closed', () => {
    expect(openWeightsFrontier().name).toBe('π0.5');
    expect(generationsBehind()).toBe(4);
    expect(PI_GENERATIONS.filter((g) => g.openWeights === null)).toHaveLength(4);
    expect(PI_GENERATIONS.some((g) => g.openWeights === false)).toBe(false);
  });

  it('every generation cites a registered source', () => {
    for (const g of PI_GENERATIONS) {
      expect(
        getCitation(g.citationId),
        `${g.name} citation ${g.citationId}`,
      ).toBeDefined();
    }
  });

  it('open generations cite arXiv papers', () => {
    for (const g of PI_GENERATIONS.filter((x) => x.openWeights)) {
      const citation = getCitation(g.citationId);
      expect(citation?.arxiv, `${g.name} should have an arXiv id`).toMatch(
        /^\d{4}\.\d{4,5}$/,
      );
    }
  });

  it('unverified-availability entries cite the lab PDFs, not invented arXiv links', () => {
    for (const g of PI_GENERATIONS.filter((x) => !x.openWeights)) {
      const citation = getCitation(g.citationId);
      expect(citation, g.name).toBeDefined();
      expect(citation?.arxiv, `${g.name} must not invent an arXiv id`).toBeUndefined();
      expect(citation?.url).toMatch(/^https:\/\/(www\.pi\.website|website\.pi-asset\.com)\//);
    }
  });
});
