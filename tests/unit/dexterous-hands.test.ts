import { describe, expect, it } from 'vitest';
import { getCitation } from '@/data/citations';
import {
  DEXTEROUS_HANDS,
  TRAINING_BET_LABEL,
  defaultDirectionFor,
  sortHands,
} from '@/lib/dexterous-hands';

const byId = new Map(DEXTEROUS_HANDS.map((hand) => [hand.id, hand]));

describe('dexterous-hands data', () => {
  it('carries the five hands the module compares', () => {
    expect(DEXTEROUS_HANDS).toHaveLength(5);
    for (const id of [
      'tesla-optimus-gen3',
      'figure-02-03',
      'sanctuary-phoenix',
      'shadow-dexterous',
      'unitree-h2',
    ]) {
      expect(byId.has(id), `missing ${id}`).toBe(true);
    }
  });

  it('matches the documented spec figures', () => {
    // Tesla Optimus Gen 3: 22 DoF, tendon-driven from the forearm.
    const tesla = byId.get('tesla-optimus-gen3');
    expect(tesla?.dofSort).toBe(22);
    expect(tesla?.dofDisplay).toBe('22');
    expect(tesla?.actuation.toLowerCase()).toContain('tendon');

    // Figure: 16 DoF on the Figure 02 hand; 3 g fingertip threshold on
    // Figure 03, which is 3 gf = 29.4 mN.
    const figure = byId.get('figure-02-03');
    expect(figure?.dofSort).toBe(16);
    expect(figure?.tactileSort).toBeCloseTo(29.4, 1);
    expect(figure?.tactileDisplay).toContain('3 g');

    // Sanctuary Phoenix: hydraulic, 21 DoF, ~5 mN tactile threshold.
    const sanctuary = byId.get('sanctuary-phoenix');
    expect(sanctuary?.dofSort).toBe(21);
    expect(sanctuary?.actuation.toLowerCase()).toContain('hydraulic');
    expect(sanctuary?.tactileSort).toBe(5);

    // Shadow Dexterous Hand: 20 actuated DoF, EUR 110,000 in 2022.
    const shadow = byId.get('shadow-dexterous');
    expect(shadow?.dofSort).toBe(20);
    expect(shadow?.costSort).toBe(110000);
    expect(shadow?.costDisplay).toContain('110,000');

    // Unitree H2: the whole robot lists at $29,900.
    const unitree = byId.get('unitree-h2');
    expect(unitree?.costSort).toBe(29900);
    expect(unitree?.costDisplay).toContain('29,900');
  });

  it('never fabricates an unknown: undisclosed specs are null', () => {
    // Tesla publishes no tactile threshold or hand price for the V3 hand.
    expect(byId.get('tesla-optimus-gen3')?.tactileSort).toBeNull();
    expect(byId.get('tesla-optimus-gen3')?.tactileDisplay).toBeNull();
    expect(byId.get('tesla-optimus-gen3')?.costSort).toBeNull();
    // Shadow fits tactile fingertips but publishes no force threshold.
    expect(byId.get('shadow-dexterous')?.tactileSort).toBeNull();
    // Neither Sanctuary nor Unitree publishes a hand price.
    expect(byId.get('sanctuary-phoenix')?.costSort).toBeNull();
    expect(byId.get('unitree-h2')?.tactileSort).toBeNull();
  });

  it('gives every row sources that resolve in the citation registry', () => {
    for (const hand of DEXTEROUS_HANDS) {
      const ids = [hand.sourceId, hand.secondarySourceId].filter(
        (id): id is string => Boolean(id),
      );
      expect(ids.length).toBeGreaterThan(0);
      for (const id of ids) {
        const citation = getCitation(id);
        expect(citation, `row ${hand.id} cites ${id}`).toBeDefined();
        expect(citation?.url.startsWith('https://')).toBe(true);
      }
    }
  });

  it('gives every row an as-of date, a bet label, and a trade-off line', () => {
    for (const hand of DEXTEROUS_HANDS) {
      expect(hand.asOf, `${hand.id} asOf`).toMatch(/^[A-Z][a-z]{2} \d{4}$/);
      expect(
        TRAINING_BET_LABEL[hand.bet].length,
        `${hand.id} bet label`,
      ).toBeGreaterThan(0);
      expect(hand.tradeoff.length, `${hand.id} tradeoff`).toBeGreaterThan(0);
    }
  });
});

describe('sortHands', () => {
  it('sorts by DoF, most first', () => {
    const ids = sortHands(DEXTEROUS_HANDS, 'dof', 'desc').map((h) => h.id);
    expect(ids).toEqual([
      'tesla-optimus-gen3',
      'sanctuary-phoenix',
      'shadow-dexterous',
      'figure-02-03',
      'unitree-h2',
    ]);
  });

  it('sorts by tactile threshold, most sensitive first, unknowns last', () => {
    const rows = sortHands(DEXTEROUS_HANDS, 'tactile', 'asc');
    expect(rows[0]?.id).toBe('sanctuary-phoenix');
    expect(rows[1]?.id).toBe('figure-02-03');
    expect(rows.slice(2).every((h) => h.tactileSort === null)).toBe(true);
  });

  it('keeps unknowns last in the descending direction too', () => {
    const rows = sortHands(DEXTEROUS_HANDS, 'tactile', 'desc');
    expect(rows[0]?.id).toBe('figure-02-03');
    expect(rows[1]?.id).toBe('sanctuary-phoenix');
    expect(rows.slice(2).every((h) => h.tactileSort === null)).toBe(true);
  });

  it('sorts by cost, cheapest first, unknowns last', () => {
    const rows = sortHands(DEXTEROUS_HANDS, 'cost', 'asc');
    expect(rows[0]?.id).toBe('unitree-h2');
    expect(rows[1]?.id).toBe('shadow-dexterous');
    expect(rows.slice(2).every((h) => h.costSort === null)).toBe(true);
  });

  it('does not mutate the input array', () => {
    const before = DEXTEROUS_HANDS.map((h) => h.id);
    sortHands(DEXTEROUS_HANDS, 'dof', 'asc');
    expect(DEXTEROUS_HANDS.map((h) => h.id)).toEqual(before);
  });
});

describe('defaultDirectionFor', () => {
  it('opens DoF descending and the spec thresholds ascending', () => {
    expect(defaultDirectionFor('dof')).toBe('desc');
    expect(defaultDirectionFor('tactile')).toBe('asc');
    expect(defaultDirectionFor('cost')).toBe('asc');
  });
});
