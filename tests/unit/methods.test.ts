import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { METHODS } from '@/data/methods';
import { methodSchema } from '@/data/schemas/method';
import { getCitation } from '@/data/citations';
import { filterMethods, DEFAULT_FILTERS } from '@/lib/methods';

/**
 * The comparison-matrix data contract (VAL-MAN-031, VAL-MAN-032,
 * VAL-MAN-035): rows validate against the method schema, every row carries
 * at least one citation-registry source, and rows whose vendors publish no
 * architecture stay honestly null rather than guessed.
 */

const REQUIRED_IDS = [
  'act',
  'diffusion-policy',
  'rt-1',
  'rt-2',
  'octo',
  'openvla',
  'pi0',
  'pi0-fast',
  'pi05',
  'pi06',
  'pi07',
  'gr00t-n1-7',
  'gemini-robotics-15',
  'helix-02',
];

describe('METHODS data', () => {
  it('validates against the method schema', () => {
    const parsed = z.array(methodSchema).safeParse(METHODS);
    expect(parsed.success).toBe(true);
  });

  it('covers every row VAL-MAN-031 requires at minimum', () => {
    const ids = new Set(METHODS.map((m) => m.id));
    for (const id of REQUIRED_IDS) {
      expect(ids.has(id), `missing method row: ${id}`).toBe(true);
    }
  });

  it('gives every row at least one source in the citation registry', () => {
    for (const method of METHODS) {
      expect(method.sources.length).toBeGreaterThan(0);
      for (const id of method.sources) {
        expect(
          getCitation(id),
          `${method.id} cites unregistered source ${id}`,
        ).toBeDefined();
      }
    }
  });

  it('keeps undisclosed Gemini cells null instead of guessed', () => {
    for (const id of ['gemini-robotics-15', 'gemini-robotics-2']) {
      const row = METHODS.find((m) => m.id === id);
      expect(row, `missing row ${id}`).toBeDefined();
      expect(row?.actionRepresentation).toBeNull();
      expect(row?.controlFrequencyHz).toBeNull();
      expect(row?.actionHorizon.planned).toBeNull();
      expect(row?.actionHorizon.executed).toBeNull();
    }
  });

  it('keeps Helix 02 horizon null and Skild fully undisclosed', () => {
    const helix = METHODS.find((m) => m.id === 'helix-02');
    expect(helix?.actionHorizon.planned).toBeNull();
    expect(helix?.actionHorizon.executed).toBeNull();

    const skild = METHODS.find((m) => m.id === 'skild');
    expect(skild, 'missing Skild row').toBeDefined();
    expect(skild?.actionRepresentation).toBeNull();
    expect(skild?.controlFrequencyHz).toBeNull();
    expect(skild?.backbone).toBeNull();
    expect(skild?.conditioning).toEqual([]);
    expect(skild?.crossEmbodiment).toBeNull();
    expect(skild?.hierarchy).toBeNull();
    expect(skild?.openWeights).toBe(false);
  });

  it('excludes unverified control rates rather than stating them as fact', () => {
    // Research marks the RT-2 and OpenVLA control rates [UNVERIFIED exact];
    // the matrix omits them instead of publishing a guessed number.
    expect(METHODS.find((m) => m.id === 'rt-2')?.controlFrequencyHz).toBeNull();
    expect(
      METHODS.find((m) => m.id === 'openvla')?.controlFrequencyHz,
    ).toBeNull();
  });

  it('honors the paper-verified anchor values from research/01', () => {
    const act = METHODS.find((m) => m.id === 'act');
    expect(act?.actionHorizon).toMatchObject({ planned: 100, executed: 1 });
    expect(act?.controlFrequencyHz).toBe(50);

    const dp = METHODS.find((m) => m.id === 'diffusion-policy');
    expect(dp?.actionHorizon).toMatchObject({ planned: 16, executed: 8 });

    const pi0 = METHODS.find((m) => m.id === 'pi0');
    expect(pi0?.actionHorizon.planned).toBe(50);
    expect(pi0?.actionRepresentation).toBe('flow');

    const groot = METHODS.find((m) => m.id === 'gr00t-n1-7');
    expect(groot?.actionHorizon.planned).toBe(40);
    expect(groot?.openWeights).toBe(true);
  });
});

describe('filterMethods', () => {
  it('returns everything under the default filters', () => {
    expect(filterMethods(METHODS, DEFAULT_FILTERS)).toHaveLength(
      METHODS.length,
    );
  });

  it('partitions open vs closed weights exactly (VAL-MAN-034)', () => {
    const open = filterMethods(METHODS, {
      ...DEFAULT_FILTERS,
      weights: 'open',
    });
    const openIds = new Set(open.map((m) => m.id));
    for (const hidden of [
      'pi06',
      'pi07',
      'gemini-robotics-15',
      'gemini-robotics-2',
      'helix-02',
      'skild',
    ]) {
      expect(openIds.has(hidden), `${hidden} must hide under open filter`).toBe(
        false,
      );
    }
    for (const kept of [
      'pi0',
      'pi05',
      'openvla',
      'octo',
      'act',
      'diffusion-policy',
      'gr00t-n1-7',
    ]) {
      expect(openIds.has(kept), `${kept} must stay under open filter`).toBe(
        true,
      );
    }

    const closed = filterMethods(METHODS, {
      ...DEFAULT_FILTERS,
      weights: 'closed',
    });
    expect(closed.every((m) => !m.openWeights)).toBe(true);
  });

  it('filters by action representation', () => {
    const discrete = filterMethods(METHODS, {
      ...DEFAULT_FILTERS,
      representation: 'discrete',
    });
    expect(discrete.map((m) => m.id).sort()).toEqual([
      'openvla',
      'pi0-fast',
      'rt-1',
      'rt-2',
    ]);

    const undisclosed = filterMethods(METHODS, {
      ...DEFAULT_FILTERS,
      representation: 'undisclosed',
    });
    expect(
      undisclosed.every((m) => m.actionRepresentation === null),
    ).toBe(true);
    expect(undisclosed.length).toBeGreaterThan(0);
  });

  it('matches the query against name, backbone, and conditioning', () => {
    const paligemma = filterMethods(METHODS, {
      ...DEFAULT_FILTERS,
      query: 'paligemma',
    });
    expect(paligemma.map((m) => m.id)).toContain('pi0');

    const tactile = filterMethods(METHODS, {
      ...DEFAULT_FILTERS,
      query: 'TACTILE',
    });
    expect(tactile.map((m) => m.id)).toEqual(['helix-02']);
  });

  it('supports zero-result combinations', () => {
    expect(
      filterMethods(METHODS, { ...DEFAULT_FILTERS, query: 'zzqx' }),
    ).toHaveLength(0);
    // No closed method ships a diffusion head: Octo and Diffusion Policy
    // are both open.
    expect(
      filterMethods(METHODS, {
        ...DEFAULT_FILTERS,
        weights: 'closed',
        representation: 'diffusion',
      }),
    ).toHaveLength(0);
  });
});
