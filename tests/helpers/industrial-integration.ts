import { readFileSync } from 'node:fs';
import { expect } from 'vitest';
import { WITHDRAWAL_REGISTRY_RUNS } from '../../lib/audit-local-basis';
import { committedSource } from './continuation-integration';

// Keep old transaction assertions on their actual bytes. The two LEI additions
// and their undated rendering are checked separately by undated-citations.
export function preservedPreIndustrialCitations(ref: string): void {
  const source = readFileSync('data/citations.ts', 'utf8');
  const oldComment = `    // This is Money coverage of the Kroger closures (Reuters-sourced
    // facts): three of the eight built Ocado sheds close in January
    // 2026, a 20-site agreement, ~$38M annual fee revenue lost,
    // ~£190M compensation, Kroger $2.6B impairment.`;
  const archiveComment = `    // Emily Hawkins, This is Money, 18 November 2025. The intended article
    // reports planned January closures of three warehouses, monitoring of
    // five remaining sites, and expected compensation of around £190 million.
    // The original live URL returned HTTP 403. The HTTPS capture of the same
    // article preserves its dated source body; see audit/citations.md.`;
  const liveUrl = 'https://www.thisismoney.co.uk/money/markets/article-15303311/Warehouse-closures-crush-Ocado-shares-US-partner-shuts-three-sites-devastating-blow-UK-firm.html';
  const archiveUrl = 'https://web.archive.org/web/20251118224554/https://www.thisismoney.co.uk/money/markets/article-15303311/Warehouse-closures-crush-Ocado-shares-US-partner-shuts-three-sites-devastating-blow-UK-firm.html';
  const astromMember = `    // Verified against the free second-edition PDF on the book site
    // (2026-08-11): chapter 1 states "More than 95% of all industrial
    // control problems are solved by PID control"; chapters 10-11 cover PID
    // and chapter 7 state feedback with the algebraic Riccati equation.
    id: 'astrom-murray-2008',
    title: 'Feedback Systems: An Introduction for Scientists and Engineers',
    authors: ['Karl Johan Åström', 'Richard M. Murray'],
    year: 2008,
    venue: 'Princeton University Press',
    url: 'https://fbswiki.org/wiki/index.php/Feedback_Systems:_An_Introduction_for_Scientists_and_Engineers',
    type: 'docs',
  },
  {
`;
  const zieglerComment = '    // DOI verified via Crossref (2026-08-11): the record is the 1993 JDSMC';
  const kalmanOld = `    // Kalman's 1960 Bol. Soc. Mat. Mexicana paper, which introduced the
    // optimal state-feedback problem LQR solves.`;
  const kalmanNew = `    // Kalman's 1960 Bol. Soc. Mat. Mexicana paper. The catalogue/reprint
    // identifies the work; it does not prove historical LQR priority.`;
  expect(source.split(archiveComment)).toHaveLength(2);
  expect(source).toContain(archiveUrl);
  expect(source).not.toContain("id: 'astrom-murray-2008'");
  expect(source).not.toContain("id: 'technology-org-deployed-2026'");
  const additions = /  \/\/ Official LEI definition has no stated date; access is the retained 2026-09-22 observation\.\n  \{\n      "id": "lei-(?:takt|cycle)-time-definition",[\s\S]*?\n  \},\n/g;
  expect(source.match(additions)).toHaveLength(2);
  let reconstructed = source;
  for (const [from, to] of [...WITHDRAWAL_REGISTRY_RUNS].reverse()) {
    expect(reconstructed.split(to)).toHaveLength(2);
    reconstructed = reconstructed.replace(to, from);
  }
  expect(reconstructed).toContain("id: 'technology-org-deployed-2026'");
  const prior = reconstructed.replace(archiveComment, () => oldComment)
    .replace(archiveUrl, liveUrl)
    .replace(kalmanNew, kalmanOld)
    .replace(additions, '')
    .replace("typeof citation.year === 'number' && (citation.venue?.includes(String(citation.year)) ?? false)",
      'citation.venue?.includes(String(citation.year)) ?? false')
    .replace("${citation.year}${citation.year === 'n.d.' ? `; accessed ${citation.accessedOn}` : ''}",
      '${citation.year}')
    .replace(zieglerComment, () => astromMember + zieglerComment);
  expect(prior).toBe(committedSource(ref, 'data/citations.ts'));
}
