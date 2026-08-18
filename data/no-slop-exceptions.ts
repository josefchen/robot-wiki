/**
 * Registered verbatim-quotation exceptions for the no-slop lint
 * (scripts/lint-no-slop.ts, lib/no-slop.ts; VAL-BUILD-008/009).
 *
 * The marker lint bans AI-writing markers in shipped prose, including em
 * and en dashes. Audit work replaces our paraphrase with a source's own
 * words, and a quotation we did not write may legitimately contain a
 * banned marker. The exemption for such text lives HERE, never in the
 * matcher: an entry masks exactly its `quote` text (whitespace-insensitive,
 * word-exact) and nothing else, so unregistered text inside quotation
 * marks still fails the gate, and a registered entry whose quote no longer
 * matches the content is reported [STALE] by the lint.
 *
 * Every entry is evidence, not suppression, in the house pattern of
 * data/link-check-exceptions.ts: it must name the source (a citation id
 * from data/citations.ts, or an explicit sourceUrl), record WHY the text
 * must stay verbatim, HOW a human last verified it against that source,
 * and WHEN. The lint validates all of this before scanning a single file.
 *
 * Never reword a registered quotation to satisfy the lint; if the lint
 * flags text inside a quotation, re-check the quotation against its
 * source and leave the words alone (AGENTS.md, library/content-quality.md).
 *
 * Type-only relative import so this file loads under plain node, Vitest,
 * and Next.js alike.
 */
import type { SlopQuotationException } from '../lib/no-slop.ts';

export const NO_SLOP_EXCEPTIONS: SlopQuotationException[] = [
  {
    id: 'brooks-better-lesson-2019',
    quote:
      'we can not afford to put even the results of machine learning (let alone the actual learning) on many of our small robots–self driving cars require about 2,500 Watts of power for computation–a human brain only requires 20 Watts',
    reason:
      "Verbatim quotation from Brooks's reply to Sutton, quoted in content/frontier/competing-theses.mdx. The two en dashes and the two-word 'can not' are Brooks's own; rewording either would corrupt the primary source.",
    verifiedBy:
      'Fetched the live essay (rodneybrooks.com/a-better-lesson/, HTTP 200) and byte-checked the HTML source: both dashes are &#8211; (U+2013) in "robots&#8211;self" and "computation&#8211;a"; the sentence matches the quote token for token.',
    verifiedOn: '2026-08-18',
  },
  {
    id: 'yang-autonomy-2017',
    quote:
      'Medical robotics—Regulatory, ethical, and legal considerations for increasing levels of autonomy',
    reason:
      'Published title of the Science Robotics editorial, rendered verbatim in the References bibliography and glossary sourcing of the surgical module. The em dash is part of the journal\'s own title, not our prose; titles are never reworded.',
    verifiedBy:
      'Crossref content negotiation for doi:10.1126/scirobotics.aam8638 returns the title with U+2014 exactly where the registry entry has it; the data/citations.ts entry carries the same verification against the live Science Robotics page.',
    verifiedOn: '2026-08-18',
  },
  {
    id: 'xela-press-2026',
    sourceUrl:
      'https://xelarobotics.com/press-release/xela-robotics-unlocks-enhanced-automation-for-humanoid-and-industrial-robots/',
    quote: 'XELA Robotics Unlocks Enhanced Automation',
    reason:
      "Third-party press-release title stored as a market-map company source (data/companies.ts) and rendered verbatim in its source list. 'Unlocks' is XELA's marketing, not our prose; the stored title is a prefix of the live release's headline.",
    verifiedBy:
      'Fetched the live press release (HTTP 200, redirects to ...-industrial-robots/): the page title is "XELA Robotics Unlocks Enhanced Automation for Humanoid and Industrial Robots", which begins with the stored string.',
    verifiedOn: '2026-08-18',
  },
];
