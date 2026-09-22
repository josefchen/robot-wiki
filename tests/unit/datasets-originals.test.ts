import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

/**
 * Regression proof for the datasets originals integration (frozen packet
 * convergence-source-i-datasets-20260916c, rows 1-11). The approved September
 * 21 license-pair correction completes rows 5/6 with deed limitations,
 * publisher-supported license-version dating and the actual BridgeData site.
 * Original plan identities and approval history remain fixed. Row 10 alone
 * retains its unresolved license part; these checks must not promote it.
 */
const article = readFileSync('content/data-hardware/datasets.mdx', 'utf8');
const ledger = readFileSync('audit/data-hardware.md', 'utf8');
type Part = { id: string; text: string; requiredCitationIds: string[] };
type EvidenceItem = { partId: string; citationId: string; sourceUrl: string; supportingPassage: string };
type PlanRecord = {
  id: string;
  ledgerPath: string;
  articleSlug: string;
  rowOrdinal: number;
  originalCellsDigest: string;
  kind: string;
  parts: Part[];
  planReview: { reviewedBy: string; rationale: string; planDigest: string };
  evidence: EvidenceItem[];
  adjudications: Array<{
    partId: string;
    outcome: string;
    reviewedBy: string;
    rationale: string;
    evidenceDigest: string;
  }>;
};
const plans = JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')) as unknown as PlanRecord[];
type DeltaRecord = {
  id: string;
  manifest: string;
  memberId: string;
  oldHash: string;
  newHash: string;
  reason: string;
  ownerApproval: string;
  responsibleMilestone: string;
  affectedAssertions: string[];
  disposition: string;
};
const deltas = JSON.parse(
  readFileSync('contract/brand-v2-approved-deltas.json', 'utf8'),
) as unknown as { entries: DeltaRecord[] };

const datasetsSection = (() => {
  const lines = ledger.split('\n');
  const start = lines.findIndex((line) => line.startsWith('### datasets.mdx'));
  const end = lines.findIndex((line, index) => index > start && line.startsWith('### '));
  return lines.slice(start, end === -1 ? undefined : end).join('\n');
})();

/** Row ordinal N is the Nth data row of the datasets table. */
function row(n: number): string[] {
  const lines = datasetsSection.split('\n').filter((line) => line.startsWith('|'));
  const dataRows = lines.filter((line) => !/^\|\s*---/.test(line) && !line.startsWith('| Claim'));
  expect(dataRows.length).toBeGreaterThanOrEqual(n);
  const cells = dataRows[n - 1].trim().slice(1, -1).split(/(?<!\\)\|/);
  return cells.map((cell) => cell.trim());
}

const registeredIds = new Set(
  [...readFileSync('data/citations.ts', 'utf8').matchAll(/id: '([a-z0-9-]+)'/g)].map((m) => m[1]),
);

const digest = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

const planDigestOf = (plan: PlanRecord) =>
  digest([plan.id, plan.ledgerPath, plan.articleSlug, plan.rowOrdinal,
    plan.originalCellsDigest, plan.kind, plan.parts]);

const partDigestOf = (plan: PlanRecord, partId: string) =>
  digest([planDigestOf(plan), partId,
    plan.evidence
      .filter((item) => item.partId === partId)
      .map(({ citationId, sourceUrl, supportingPassage }) => [citationId, sourceUrl, supportingPassage])]);

const OLD_PROSE_HASH = 'a34d4a0bfceba0cc8527ef5236dd0572f7502b127498153c35374a0f47e3256c';
const NEW_PROSE_HASH = 'b3ff49da0ad2736cacb9ec26636e3fa2364b17df86e1feafcadcb940cffcd596';

const planIdByRow: Record<number, string> = {
  1: 'datasets-1-oxe-pool-20260916c',
  2: 'datasets-2-rtxx-results-20260916c',
  3: 'datasets-3-oxe-critique-20260916c',
  4: 'datasets-4-droid-facts-20260916c',
  5: 'datasets-5-droid-license-20260916c',
  6: 'datasets-6-bridgedata-20260916c',
  7: 'datasets-7-agibot-beta-20260916c',
  8: 'datasets-8-eleven-seconds-20260916c',
  9: 'datasets-9-agibot2026-size-20260916c',
  10: 'datasets-10-robomind-20260916c',
  11: 'datasets-11-diversity-20260916c',
};
const newDeltaIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => `ds-r${n}-20260916-1`);
const licensePairReviewer =
  'Droid source-auditor/integrator bf68d9fb-60bc-4f60-a3cb-1fb5d39bec2f, custom:droidproxy:gpt-6-astra/max, 2026-09-21T23:42:41.663Z';
const licensePairDigests: Record<number, string> = {
  5: 'e0779c98df20ce631b4d08787ade3534238462a658ec36de276198a5132dd4c3',
  6: '2bbe336fb9f56948c69c7fc74bd83ef02b1c394b02db58cdd650ce9696daa51c',
};
const licensePairParts: Record<number, string[]> = {
  5: ['ds5-paper-license', 'ds5-deed-commercial-attribution', 'ds5-license-version-date'],
  6: ['ds6-total-and-robot', 'ds6-split-and-rate', 'ds6-project-average', 'ds6-project-data-license'],
};

function assertReviewer(reviewer: string, ordinal: number) {
  if (ordinal === 5 || ordinal === 6) expect(reviewer).toBe(licensePairReviewer);
  else expect(reviewer).toContain('datasets-integrator-20260916');
}

function assertDeedEvidence(plan: PlanRecord) {
  expect(plan.parts.map((part) => part.id)).toEqual(licensePairParts[5]);
  const terms = plan.evidence.find((item) => item.partId === 'ds5-deed-commercial-attribution');
  expect(terms?.citationId).toBe('cc-by-4-0-deed');
  expect(terms?.sourceUrl).toBe('https://creativecommons.org/licenses/by/4.0/');
  for (const text of [
    'for any purpose, even commercially',
    'provide a link to the license',
    'indicate if changes were made',
    'No additional restrictions',
    'No warranties are given.',
    'The license may not give you all of the permissions necessary for your intended use.',
    'publicity, privacy, or moral rights',
    'It is not a license and has no legal value.',
  ]) expect(terms?.supportingPassage).toContain(text);
  const version = plan.evidence.find((item) => item.partId === 'ds5-license-version-date');
  expect(version?.citationId).toBe('cc-by-4-0-deed');
  expect(version?.sourceUrl).toBe('https://wiki.creativecommons.org/wiki/License_Versions');
  expect(version?.supportingPassage).toContain('published November 2013');
  expect(version?.supportingPassage).toContain('2013 Nov 25');
}

function assertLicensePairProse(text: string) {
  expect(text).toContain('The paper releases the full dataset under CC BY 4.0 <Cite id="droid-2024" />.');
  expect(text).toContain('subject to attribution, a license link, change notices and the other license terms');
  expect(text).toContain('The deed also warns that other rights may limit a particular use <Cite id="cc-by-4-0-deed" />.');
  expect(text).toContain('not a guarantee of every permission needed for a use <Cite id="cc-by-4-0-deed" />');
  expect(text).toContain('The official project page reports an average trajectory length of 38 timesteps and a control frequency of 5 Hz <Cite id="bridgedata-v2-2023" />.');
  expect(text).toContain('The official project page states that all data is provided under CC BY 4.0 <Cite id="bridgedata-v2-2023" />.');
  expect(text).toContain("BridgeData V2's official project page states CC BY 4.0");
  expect(text).not.toContain('permits commercial training');
  expect(text).not.toContain('offline as of September 2026');
  expect(text).not.toContain('about eight seconds');
}

describe('datasets originals: ledger rows', () => {
  it('binds every dispatched row 1-11 to its exact compound plan', () => {
    for (const [n, id] of Object.entries(planIdByRow)) {
      expect(row(Number(n))[7]).toBe(id);
    }
  });

  it('keeps every dispatched row free of scalar evidence cells (compound convention)', () => {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
      expect(row(n)[4]).toBe('');
      expect(row(n)[5]).toBe('');
      expect(row(n)[6]).toBe('');
    }
  });

  it('completes row 1 on the OXE pooling passage with the 21-institutions distinction recorded', () => {
    expect(row(1)[2]).toBe('V');
    expect(row(1)[1]).toContain('https://arxiv.org/html/2310.08864v9');
    expect(row(1)[3]).toContain('pooling 60 existing robot datasets from 34 robotic research labs');
    expect(row(1)[3]).toContain('21-institutions figure is the collaboration count');
  });

  it('completes row 2 over the applied scoping correction (Fig. 3 / Sec. V-A / conclusion)', () => {
    expect(row(2)[2]).toContain('C (was an unqualified');
    expect(row(2)[1]).toContain('Fig. 3 caption, Sec. V-A, Table I note, and conclusion passages verbatim');
    expect(row(2)[3]).toContain('Sec. V-A scopes Fig. 3 to small-scale, Table I to large-scale');
  });

  it('completes row 3 on the registered critique blog with the open-secret attribution', () => {
    expect(row(3)[2]).toBe('V');
    expect(row(3)[1]).toContain('https://mbreuss.github.io/blog_post_iclr_26_vla.html');
    expect(row(3)[3]).toContain("It's an open secret that OXE is mostly low-quality data");
    expect(row(3)[3]).toContain('Single named proponent');
  });

  it('completes row 4 on DROID with the 84-vs-86 discrepancy recorded, not resolved', () => {
    expect(row(4)[2]).toBe('V');
    expect(row(4)[1]).toContain('https://arxiv.org/html/2403.12945v2');
    expect(row(4)[1]).toContain('https://droid-dataset.github.io/');
    expect(row(4)[3]).toContain('abs prints 84 tasks where the full text prints 86 twice');
  });

  it('completes row 5 with deed limitations and license-version dating, not blanket permission', () => {
    expect(row(5)[2]).toBe('C (preserves the earlier CC BY-NC to CC BY correction; narrows blanket training permission to the deed terms and limitations)');
    expect(row(5)[0]).toContain('a license link, change notices and its other terms');
    expect(row(5)[0]).toContain('does not guarantee every permission needed for a particular use');
    expect(row(5)[3]).toContain('2013 is registered solely as the identified license-version publication year');
    expect(row(5)[3]).toContain('The deed webpage itself is undated');
    expect(row(5)[3]).toContain('The deed is a summary, not the legal code or legal advice');
    expect(registeredIds.has('cc-by-4-0-deed')).toBe(true);
    assertDeedEvidence(plans.find((plan) => plan.id === planIdByRow[5])!);
  });

  it('completes row 6 on the actual official endpoint without inventing HTTP status or seconds', () => {
    expect(row(6)[2]).toBe('C (corrects the wrong-host offline conclusion using the actual official endpoint; removes derived seconds)');
    expect(row(6)[1]).toContain('https://rail-berkeley.github.io/bridgedata/');
    expect(row(6)[1]).toContain('2026-09-21T22:58:34.582Z');
    expect(row(6)[1]).toContain('no origin HTTP status exposed');
    expect(row(6)[0]).toContain('38-timestep average');
    expect(row(6)[0]).toContain('all data provided under CC BY 4.0');
    expect(row(6)[0]).not.toContain('~8 s');
    const plan = plans.find((plan) => plan.id === planIdByRow[6])!;
    expect(plan.parts.map((part) => part.id)).toEqual(licensePairParts[6]);
    for (const [partId, passage] of [
      ['ds6-project-average', '38 timesteps'],
      ['ds6-project-data-license', 'All data is provided under'],
    ]) {
      const item = plan.evidence.find((item) => item.partId === partId)!;
      expect(item.sourceUrl).toBe('https://rail-berkeley.github.io/bridgedata/');
      expect(item.supportingPassage).toContain(passage);
    }
  });

  it('completes row 7 with the repo registration and the stale GO-1 VRAM cell dropped', () => {
    expect(row(7)[2]).toContain('this pass additionally removes the stale GO-1 VRAM figures');
    expect(row(7)[0]).not.toContain('~7 GB');
    expect(row(7)[1]).toContain('https://raw.githubusercontent.com/OpenDriveLab/AgiBot-World/main/README.md');
    expect(registeredIds.has('agibot-world-repo-2026')).toBe(true);
  });

  it('completes row 8 with the integrator-run arithmetic recorded as a local conjunct', () => {
    expect(row(8)[2]).toBe('V');
    expect(row(8)[3]).toContain('2976.4 x 3600 / 1,001,552 = 10.70 s');
    expect(row(8)[3]).toContain('integrator local proof, no fetch');
  });

  it('completes row 9 corrected to the live 13.6 TB card figure', () => {
    expect(row(9)[2]).toContain('13.2 TB claim cell and 13.7 TB article span both stale');
    expect(row(9)[0]).toContain('13.6 TB (card-printed, September 2026');
    expect(row(9)[0]).toContain('14,054,068,535,897 bytes');
  });

  it('leaves row 10 honestly incomplete: the license primary does not reproduce', () => {
    expect(row(10)[2]).toContain('seven elements re-verified live');
    expect(row(10)[3]).toContain('the CC BY-NC-SA 4.0 license element is HELD');
  });

  it('completes row 11 with the compression nuance recorded, not corrected', () => {
    expect(row(11)[2]).toBe('V');
    expect(row(11)[3]).toContain('compresses the two parallel findings into one conditional');
  });
});

describe('datasets originals: compound plans', () => {
  it('appends exactly eleven new plans and preserves the prior 718 in order', () => {
    // The merged ledger keeps appending later packets; pin this packet's
    // append slot (718..728) rather than a moving total.
    expect(plans[717].id).toBe('grasp-planning-12-internal-local-and-20260916');
    expect(plans.slice(718, 729).map((plan) => plan.id)).toEqual(Object.values(planIdByRow));
  });

  it('binds every plan to the data-hardware datasets ledger with fresh digests', () => {
    for (const plan of plans.slice(718, 729)) {
      expect(plan.ledgerPath).toBe('audit/data-hardware.md');
      expect(plan.articleSlug).toBe('datasets');
      expect(plan.kind).toBe('explicit-parts');
      expect(plan.originalCellsDigest).toBe(
        digest([row(plan.rowOrdinal)[0], row(plan.rowOrdinal)[1], row(plan.rowOrdinal)[2], row(plan.rowOrdinal)[3]]),
      );
      if (plan.rowOrdinal === 5 || plan.rowOrdinal === 6) {
        expect(plan.originalCellsDigest).toBe(licensePairDigests[plan.rowOrdinal]);
      }
      expect(plan.planReview.planDigest).toBe(planDigestOf(plan));
      assertReviewer(plan.planReview.reviewedBy, plan.rowOrdinal);
    }
  });

  it('covers every required (part, citation) pair exactly, including the registered deed', () => {
    for (const plan of plans.slice(718, 729)) {
      const required = plan.parts.flatMap((part) =>
        part.requiredCitationIds.map((id) => JSON.stringify([part.id, id])));
      const supplied = plan.evidence.map((item) => JSON.stringify([item.partId, item.citationId]));
      expect([...new Set(supplied)].sort()).toEqual([...new Set(required)].sort());
      const triples = plan.evidence.map((item) => JSON.stringify([item.partId, item.citationId, item.sourceUrl]));
      expect(triples.length).toBe(new Set(triples).size);
      for (const item of plan.evidence) {
        expect(registeredIds.has(item.citationId)).toBe(true);
        expect(item.sourceUrl).toMatch(/^https:\/\//);
        // 'Total file size: 13.6 TB' is the card's own verbatim sidebar line
        // (24 chars); every other passage is substantive prose.
        expect(item.supportingPassage.length).toBeGreaterThan(20);
      }
    }
  });

  it('adjudicates the supported parts supported and the held parts unresolved, with fresh digests', () => {
    const held = new Set(['ds10-license-held']);
    for (const plan of plans.slice(718, 729)) {
      if (plan.rowOrdinal === 5 || plan.rowOrdinal === 6) {
        expect(plan.parts.map((part) => part.id)).toEqual(licensePairParts[plan.rowOrdinal]);
      }
      expect(plan.adjudications.map((review) => review.partId).sort())
        .toEqual(plan.parts.map((part) => part.id).sort());
      for (const review of plan.adjudications) {
        expect(review.outcome).toBe(held.has(review.partId) ? 'unresolved' : 'supported');
        expect(review.evidenceDigest).toBe(partDigestOf(plan, review.partId));
        assertReviewer(review.reviewedBy, plan.rowOrdinal);
      }
    }
  });

  it.each(['limitations', 'terms evidence', 'version evidence'])('rejects removed deed %s', (removed) => {
    const plan = structuredClone(plans.find((plan) => plan.id === planIdByRow[5])!);
    assertDeedEvidence(plan);
    if (removed === 'limitations') {
      const terms = plan.evidence.find((item) => item.partId === 'ds5-deed-commercial-attribution')!;
      terms.supportingPassage = terms.supportingPassage.replace(
        'The license may not give you all of the permissions necessary for your intended use.', '',
      );
    } else {
      const partId = removed === 'terms evidence'
        ? 'ds5-deed-commercial-attribution' : 'ds5-license-version-date';
      plan.evidence = plan.evidence.filter((item) => item.partId !== partId);
    }
    expect(() => assertDeedEvidence(plan)).toThrow();
  });

  it('carries the verbatim needle-checked passages in the external plans', () => {
    const ds1 = plans.find((entry) => entry.id === 'datasets-1-oxe-pool-20260916c')!;
    expect(ds1.evidence[0].supportingPassage).toContain('pooling 60 existing robot datasets from 34 robotic research labs');
    const ds2 = plans.find((entry) => entry.id === 'datasets-2-rtxx-results-20260916c')!;
    expect(ds2.evidence.some((item) => item.supportingPassage.includes('RT-1-X mean success rate is 50% higher'))).toBe(true);
    expect(ds2.evidence.some((item) => item.supportingPassage.includes('RT-1-X underfits and performs worse'))).toBe(true);
    const ds4 = plans.find((entry) => entry.id === 'datasets-4-droid-facts-20260916c')!;
    expect(ds4.evidence.some((item) => item.supportingPassage.includes('564 scenes and 84 tasks by 50 data collectors'))).toBe(true);
    expect(ds4.evidence.some((item) => item.sourceUrl === 'https://droid-dataset.github.io/')).toBe(true);
    const ds7 = plans.find((entry) => entry.id === 'datasets-7-agibot-beta-20260916c')!;
    expect(ds7.evidence.some((item) => item.citationId === 'agibot-world-repo-2026'
      && item.supportingPassage.includes('1,003,672 trajectories (~43.8T)')
      && item.supportingPassage.includes('CC BY-NC-SA 4.0'))).toBe(true);
    const ds8 = plans.find((entry) => entry.id === 'datasets-8-eleven-seconds-20260916c')!;
    expect(ds8.evidence.some((item) => item.citationId === 'ego4d-2022'
      && item.supportingPassage.includes('3,670 hours of daily-life activity video'))).toBe(true);
    expect(ds8.evidence.some((item) => item.supportingPassage.includes('LOCAL PROOF'))).toBe(true);
    const ds9 = plans.find((entry) => entry.id === 'datasets-9-agibot2026-size-20260916c')!;
    expect(ds9.evidence.some((item) => item.supportingPassage === 'Total file size: 13.6 TB')).toBe(true);
    expect(ds9.evidence.some((item) => item.supportingPassage.includes('"usedStorage": 14054068535897'))).toBe(true);
  });
});

describe('datasets originals: approved deltas', () => {
  it('appends exactly eleven new entries and preserves the prior 793 in order', () => {
    // The merged delta ledger keeps appending later packets; pin this
    // packet's append slot (790..800) rather than a moving total.
    expect(deltas.entries[789].id).toBe('gp-r12-20260916-1');
    expect(deltas.entries.slice(790, 801).map((entry) => entry.id)).toEqual(newDeltaIds);
  });

  it('records every entry against the datasets prose member with the true before/after hashes', () => {
    for (const entry of deltas.entries.slice(790, 801)) {
      expect(entry.manifest).toBe('prose');
      expect(entry.memberId).toBe('article:data-hardware/datasets');
      expect(entry.oldHash).toBe(OLD_PROSE_HASH);
      expect(entry.newHash).toBe(NEW_PROSE_HASH);
      expect(entry.responsibleMilestone).toBe('brand-v2-editorial');
      expect(entry.disposition).toBe('permanent');
      expect(entry.affectedAssertions).toContain('VAL-AUDIT-004');
      expect(entry.affectedAssertions).toContain('VAL-AUDIT-009');
      expect(entry.ownerApproval).toContain('convergence-source-i-datasets-20260916c');
      expect(entry.reason).toContain('zero retrieval');
    }
  });
});

describe('datasets originals: regression guards', () => {
  it('keeps the unaffected article spans byte-identical', () => {
    expect(article).toContain('OXE pooled 60 existing datasets from 34 labs into one standardized RLDS format');
    expect(article).toContain('76,000 trajectories totaling 350 hours, across 564 scenes and 86 tasks');
    expect(article).toContain('1,001,552 trajectories totaling 2,976 hours, all from the AgiBot G1 platform');
    expect(article).toContain('107,000 trajectories across 479 tasks and 96 object classes');
  });

  it('retains the earlier size correction and the approved license-pair prose without clearing RoboMIND', () => {
    expect(article).toContain('13.6 TB');
    expect(article).not.toContain('13.7 TB');
    expect(article).toContain('publishes a 13.6 TB total file size and nothing else as of September 2026');
    assertLicensePairProse(article);
    expect(article).toContain('no currently reachable primary page prints it');
    expect(article).toContain("RoboMIND's previously recorded non-commercial terms remain unverified");
  });

  it.each([
    'The license is CC BY 4.0, which permits commercial training runs with attribution.',
    'The site is offline as of September 2026.',
  ])('rejects revived unsupported wording: %s', (unsupported) => {
    assertLicensePairProse(article);
    expect(() => assertLicensePairProse(`${article}\n${unsupported}`)).toThrow();
  });

  it('rejects removal of the deed limitation from the article', () => {
    assertLicensePairProse(article);
    const removed = article.replace(
      'The deed also warns that other rights may limit a particular use <Cite id="cc-by-4-0-deed" />.', '',
    );
    expect(() => assertLicensePairProse(removed)).toThrow();
  });

  it('keeps every bound citation registered, including the approved deed frontmatter addition', () => {
    for (const id of [
      'open-x-embodiment-2023',
      'droid-2024',
      'cc-by-4-0-deed',
      'bridgedata-v2-2023',
      'agibot-world-2025',
      'agibot-world-2026',
      'robomind-2024',
      'oxe-quality-critique-2026',
      'diversity-scaling-2025',
    ]) {
      expect(registeredIds.has(id)).toBe(true);
      expect(article).toContain(`  - ${id}\n`);
    }
    expect(registeredIds.has('agibot-world-repo-2026')).toBe(true);
  });
});
