import { describe, expect, it } from 'vitest';
import { parseTermConsumers, termConsumerInventory } from '../e2e/helpers/term-consumer-inventory';
import { getTerm } from '../../data/glossary';
import pinned from '../fixtures/term-consumer-identities.json';

function identities(inventory: ReturnType<typeof termConsumerInventory>) {
  return inventory.map(a => ({ route: a.route, rawOpeningTags: a.rawOpeningTags, termIds: a.occurrences.map(o => o.termId) }));
}
function assertPopulation(actual: ReturnType<typeof identities>) {
  expect(actual.length).toBeGreaterThan(0);
  expect(new Set(actual.map(a => a.route)).size).toBe(actual.length);
  expect(actual).toEqual(pinned.articles);
}

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
    // 53d2cf8 added legged-locomotion/teleoperation occurrence 1.
    // 6af0bdd removed competing-theses/imitation-learning occurrence 1.
    // Pin ordered members, not just a total that a replacement could preserve.
    assertPopulation(identities(inventory));
    expect(inventory.reduce((n, a) => n + a.rawOpeningTags, 0)).toBe(pinned.articles.reduce((n, a) => n + a.rawOpeningTags, 0));
    expect(inventory.flatMap(a => a.occurrences)).toHaveLength(pinned.articles.flatMap(a => a.termIds).length);
    expect(inventory.reduce((n, a) => n + new Set(a.occurrences.map(o => o.termId)).size, 0)).toBe(pinned.articles.reduce((n, a) => n + new Set(a.termIds).size, 0));
  });
  it.each(['empty', 'omitted-route', 'duplicate-route', 'omitted-trigger', 'same-count-substitution'])('rejects %s population mutation', mutation => {
    const changed = structuredClone(pinned.articles);
    if (mutation === 'empty') changed.length = 0;
    if (mutation === 'omitted-route') changed.pop();
    if (mutation === 'duplicate-route') changed[1] = structuredClone(changed[0]);
    const legged = changed.find(a => a.route === '/rl-sim2real/legged-locomotion/');
    if (mutation === 'omitted-trigger') legged!.termIds.splice(legged!.termIds.indexOf('teleoperation'), 1);
    if (mutation === 'same-count-substitution') legged!.termIds[legged!.termIds.indexOf('teleoperation')] = 'retargeting';
    expect(() => assertPopulation(changed)).toThrow();
  });

  it.each(['restored-trigger', 'reordered-triggers', 'same-count-thesis-substitution'])('rejects %s in the corrected thesis population', mutation => {
    const changed = structuredClone(pinned.articles);
    const thesis = changed.find(a => a.route === '/frontier/competing-theses/')!;
    if (mutation === 'restored-trigger') { thesis.termIds.splice(4, 0, 'imitation-learning'); thesis.rawOpeningTags++; }
    if (mutation === 'reordered-triggers') [thesis.termIds[3], thesis.termIds[4]] = [thesis.termIds[4], thesis.termIds[3]];
    if (mutation === 'same-count-thesis-substitution') thesis.termIds[4] = 'imitation-learning';
    expect(() => assertPopulation(changed)).toThrow();
  });
});
