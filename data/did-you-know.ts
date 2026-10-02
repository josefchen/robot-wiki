/**
 * The three "Did you know" facts on the home page.
 *
 * Each fact restates one cited sentence of a published article and links
 * to that article. `passage` is the article's own wording, and the
 * paragraph holding it carries `<Cite id={citationId} />`; the fact renders
 * that same citation. tests/unit/did-you-know.test.ts holds every fact to
 * its article, and to 20 words or fewer with the citation label counted.
 */
export type DidYouKnowFact = {
  id: string;
  domain: string;
  slug: string;
  citationId: string;
  /** The fact reads before + linked + after, then the citation chip. */
  before: string;
  linked: string;
  after: string;
  passage: string;
};

export const DID_YOU_KNOW: readonly DidYouKnowFact[] = [
  {
    id: 'anymal-four-minutes',
    domain: 'rl-sim2real',
    slug: 'why-rl-locomotion',
    citationId: 'rudin-2021',
    before: 'An ANYmal quadruped ',
    linked: 'learned to walk',
    after: ' on flat ground in under four minutes on one GPU',
    passage:
      'trained an ANYmal quadruped to walk on flat ground in under four minutes, and on uneven terrain in twenty minutes, on a single workstation GPU',
  },
  {
    id: 'act-ten-minutes',
    domain: 'data-hardware',
    slug: 'teleop-rigs',
    citationId: 'act-aloha-2023',
    before: 'ACT reached 80-90% success on six bimanual tasks, each from about ',
    linked: '10 minutes of demonstrations',
    after: '',
    passage:
      'learned six difficult bimanual tasks to 80-90% success, each from about 10 minutes of demonstrations',
  },
  {
    id: 'ernst-1961',
    domain: 'frontier',
    slug: 'dexterity',
    citationId: 'brooks-dexterity-2025',
    before: 'By 1961, Heinrich Ernst had a ',
    linked: 'computer-controlled arm and hand',
    after: ' stacking blocks at MIT',
    passage:
      'Ernst had connected a computer-controlled arm and hand to MIT',
  },
];

export function didYouKnowText(fact: DidYouKnowFact): string {
  return `${fact.before}${fact.linked}${fact.after}`;
}
