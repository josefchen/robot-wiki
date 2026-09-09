import { describe, expect, it } from 'vitest';
import { parseTermConsumers, termConsumerInventory } from '../e2e/helpers/term-consumer-inventory';
import { getTerm } from '../../data/glossary';

describe('bounded Term consumer identities', () => {
  it('retains repeated occurrences instead of deduplicating triggers', () => {
    const result = parseTermConsumers('<Term id="ppo">PPO</Term> and <Term id="ppo" />');
    expect(result.occurrences.map(o => [o.termId, o.ordinal, o.occurrence]))
      .toEqual([['ppo', 1, 1], ['ppo', 2, 2]]);
  });
  it('does not treat fenced source examples as rendered triggers', () => {
    const result = parseTermConsumers('```mdx\n<Term id="ppo" />\n```\n\n<Term id="mpc" />');
    expect(result.rawOpeningTags).toBe(2);
    expect(result.occurrences.map(o => o.termId)).toEqual(['mpc']);
  });
  it('reports dynamic ids, missing ids, and spreads rather than skipping them', () => {
    const result = parseTermConsumers('<Term id={value} />\n\n<Term />\n\n<Term {...props} id="ppo" />');
    expect(result.unresolved).toHaveLength(3);
    expect(result.occurrences).toHaveLength(0);
  });
  it('retains literal multiline and single-quoted bindings', () => {
    expect(parseTermConsumers("<Term\n id='ppo'\n>PPO</Term>").occurrences[0])
      .toMatchObject({ termId: 'ppo', ordinal: 1, occurrence: 1, bodyLine: 1 });
  });
  it('does not interpret an inline-code example as a trigger', () => {
    expect(parseTermConsumers('`<Term id="ppo" />`').occurrences).toEqual([]);
  });
  it('binds all published MDX without unresolved or unknown term ids', () => {
    const inventory = termConsumerInventory();
    expect(inventory).toHaveLength(47);
    expect(inventory.flatMap(a => a.unresolved)).toEqual([]);
    expect(inventory.flatMap(a => a.occurrences).filter(o => !getTerm(o.termId))).toEqual([]);
    expect(new Set(inventory.map(a => a.route)).size).toBe(47);
  });
  it('reconciles raw occurrences separately from article/term bindings', () => {
    const inventory = termConsumerInventory();
    expect(inventory.filter(a => a.occurrences.length)).toHaveLength(46);
    expect(inventory.reduce((n, a) => n + a.rawOpeningTags, 0)).toBe(227);
    expect(inventory.flatMap(a => a.occurrences)).toHaveLength(227);
    expect(inventory.reduce((n, a) => n + new Set(a.occurrences.map(o => o.termId)).size, 0)).toBe(224);
  });
});
