/**
 * The three "Did you know" facts on the home page.
 *
 * Each fact restates a cited point of a published article and links to
 * that article; it renders a citation the article itself cites inline.
 * scripts/validate-content.ts checks the article and the citation
 * (lib/cited-facts.ts), and tests/unit/did-you-know.test.ts holds every fact
 * to 20 words or fewer with the citation label counted.
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
  },
  {
    id: 'act-ten-minutes',
    domain: 'data-hardware',
    slug: 'teleop-rigs',
    citationId: 'act-aloha-2023',
    before: 'ACT learned six bimanual tasks, each from about ',
    linked: '10 minutes of demonstrations',
    after: '',
  },
  {
    id: 'ernst-1961',
    domain: 'frontier',
    slug: 'dexterity',
    citationId: 'brooks-dexterity-2025',
    before: 'By 1961, Heinrich Ernst had a ',
    linked: 'computer-controlled arm and hand',
    after: ' stacking blocks at MIT',
  },
];

export function didYouKnowText(fact: DidYouKnowFact): string {
  return `${fact.before}${fact.linked}${fact.after}`;
}
