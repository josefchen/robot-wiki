import { describe, expect, it } from 'vitest';
import { planPacket } from '../helpers/audit-plan-history';
import { readFileSync } from 'node:fs';
import {
  compoundPartDigest,
  compoundPlanDigest,
  parseCompoundPlans,
} from '../../lib/audit-ledger';
import { CITATIONS } from '../../data/citations';
import { committedJson } from '../helpers/editorial-current-context';

/**
 * Red-first proof for the generative-video originals integration (frozen
 * packet convergence-source-n-generative-video-20260916e, rows
 * 6, 11, 12, 15, 16, 17, 20, 21, 22, all selected). Every applied-state
 * assertion here failed before application and must pass after it. The
 * regression guards (protected neighbor sections, prior plan stability,
 * held-row honesty) passed before and must stay green.
 *
 * Row 12 is the dispatched source correction: the article said Genie 2
 * "moved to 3D at 360p with 10 to 20 second horizons", but the 360p figure
 * is printed by no fetchable text (the Genie 3 blog's comparison table is
 * an image; the models page carries no Genie 2 text), so it is cut and the
 * horizons are rescoped to the sentence the Genie 2 blog prints. Rows 6,
 * 11 and 22 attach newly registered citations to previously uncited spans;
 * every other row is an evidence completion with no article change.
 */
const article = readFileSync('content/world-models/generative-video.mdx', 'utf8');
const ledger = readFileSync('audit/world-models.md', 'utf8');
const citationsRegistry = readFileSync('data/citations.ts', 'utf8');
const citationLedger = readFileSync('audit/citations.md', 'utf8');

type Part = { id: string; text: string; requiredCitationIds: string[] };
type EvidenceItem = { partId: string; citationId: string; sourceUrl: string; supportingPassage: string };
type PlanRecord = {
  id: string;
  ledgerPath: string;
  articleSlug: string;
  rowOrdinal: number;
  originalCellsDigest: string;
  kind: 'explicit-parts' | 'frontmatter-p1';
  parts: Part[];
  planReview: { reviewedBy: string; rationale: string; planDigest: string };
  evidence: EvidenceItem[];
  adjudications: Array<{
    partId: string;
    outcome: 'supported' | 'unresolved' | 'contradicted';
    reviewedBy: string;
    rationale: string;
    evidenceDigest: string;
  }>;
};
const plans = parseCompoundPlans(
  JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')),
) as unknown as PlanRecord[];
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
) as { entries: DeltaRecord[] };

const GV_PLAN_IDS = [
  'generative-video-6-cosmos3-launch-20260916e',
  'generative-video-11-genie1-20260916e',
  'generative-video-12-genie2-scope-20260916e',
  'generative-video-15-project-genie-cap-20260916e',
  'generative-video-16-gr1-calvin-20260916e',
  'generative-video-17-gr2-scale-20260916e',
  'generative-video-20-1x-lab-20260916e',
  'generative-video-21-odyssey2-20260916e',
  'generative-video-22-starchild-agora-20260916e',
];

const gvPlans = plans.filter(
  (plan) => plan.ledgerPath === 'audit/world-models.md' && plan.articleSlug === 'generative-video',
);
const mine = gvPlans.filter((plan) => GV_PLAN_IDS.includes(plan.id));

describe('generative-video originals: ledger rows and compound plans', () => {
  it('keeps all 759 prior plans first and appends exactly the 9 dispatched plans', () => {
    // Preserve the selected packet and preceding survivors by identity.
    expect(planPacket(plans, GV_PLAN_IDS).map((plan) => plan.id)).toEqual(GV_PLAN_IDS);
    expect(plans.slice(0, plans.findIndex(p => p.id === GV_PLAN_IDS[0])).every((plan) => !plan.id.startsWith('generative-video-6-'))).toBe(true);
    expect(mine.map((plan) => plan.id)).toEqual(GV_PLAN_IDS);
    expect(mine.map((plan) => plan.rowOrdinal)).toEqual([6, 11, 12, 15, 16, 17, 20, 21, 22]);
    // The 13 prior generative-video closeout plans survive unchanged.
    expect(gvPlans).toHaveLength(22);
    expect(gvPlans.filter((plan) => !GV_PLAN_IDS.includes(plan.id))).toHaveLength(13);
  });

  it('binds every dispatched ledger row to its exact plan with empty scalar evidence cells', () => {
    const section = ledger.split('## generative-video.mdx')[1].split('## jepa.mdx')[0];
    const rows = section
      .split('\n')
      .filter((line) => line.startsWith('| '))
      .filter((line) => !line.includes('Claim (quoted)') && !line.includes(' --- |'));
    expect(rows).toHaveLength(22);
    for (const [index, row] of rows.entries()) {
      const cells = row.split('|').slice(1, -1).map((cell) => cell.trim());
      const ordinal = index + 1;
      const dispatched = [6, 11, 12, 15, 16, 17, 20, 21, 22].includes(ordinal);
      if (!dispatched) continue;
      expect(cells).toHaveLength(8);
      expect(cells[4]).toBe('');
      expect(cells[5]).toBe('');
      expect(cells[6]).toBe('');
      expect(cells[7]).toBe(GV_PLAN_IDS[[6, 11, 12, 15, 16, 17, 20, 21, 22].indexOf(ordinal)]);
      expect(cells[1].length).toBeGreaterThan(0);
      expect(cells[3].length).toBeGreaterThan(0);
    }
  });

  it('records the row-12 source correction in the claim and verdict cells', () => {
    expect(ledger).toContain(
      'Genie 2 (December 2024) moved to 3D, with consistent worlds for up to a minute and most examples lasting 10 to 20 seconds',
    );
    expect(ledger).not.toContain('"Genie 2 (December 2024) moved to 3D at 360p');
    const row12 = mine.find((plan) => plan.rowOrdinal === 12);
    expect(row12?.originalCellsDigest).toBe(
      'e1f84ac195b3f6c172645b58e87d4c977ccfe975973179d27498fd7883d8b027',
    );
  });

  it('carries valid integrator-review digests on every dispatched plan and adjudication', () => {
    for (const plan of mine) {
      expect(plan.planReview.planDigest).toBe(compoundPlanDigest(plan));
      expect(plan.planReview.reviewedBy).toContain('generative-video-integrator-20260916');
      expect(plan.planReview.rationale).toContain('needle-verified');
      const partIds = new Set(plan.parts.map((part) => part.id));
      expect(plan.adjudications.map((review) => review.partId).sort())
        .toEqual([...partIds].sort());
      for (const review of plan.adjudications) {
        expect(review.outcome).toBe('supported');
        expect(review.evidenceDigest).toBe(compoundPartDigest(plan, review.partId));
      }
      for (const item of plan.evidence) expect(partIds.has(item.partId)).toBe(true);
    }
  });

  it('registers every evidence citation id and cites uncredentialed https urls', () => {
    for (const plan of mine) {
      for (const item of plan.evidence) {
        expect(citationsRegistry).toContain(`'${item.citationId}'`);
        expect(item.sourceUrl).toMatch(/^https:\/\//);
        expect(item.supportingPassage.length).toBeGreaterThan(40);
      }
    }
    const registeredIds = new Set(CITATIONS.map((citation) => citation.id));
    for (const id of [
      'gr-1-2023',
      'gr-2-2024',
      'project-genie-2026',
      '1x-world-model-lab-2026',
      'odyssey-2-2025',
      'genie-3-2025',
      'nvidia-cosmos-3-launch-2026',
      'genie-1-2024',
      'genie-2-2024',
      'google-project-genie-2026',
      'odyssey-starchild-1-2026',
      'odyssey-agora-1-2026',
    ]) {
      expect(registeredIds.has(id)).toBe(true);
    }
    // Every new registration is covered by a citation-ledger row.
    for (const id of [
      'nvidia-cosmos-3-launch-2026',
      'genie-1-2024',
      'genie-2-2024',
      'google-project-genie-2026',
      'odyssey-starchild-1-2026',
      'odyssey-agora-1-2026',
    ]) {
      expect(citationLedger).toContain(`| ${id} | https://`);
    }
  });

  it('records the Genie 1 author list the abs page prints, not the packet proposal', () => {
    expect(citationsRegistry).toContain("'Yuge Shi'");
    expect(citationsRegistry).not.toContain("'Yuge Zhou'");
    const genie1 = CITATIONS.find((citation) => citation.id === 'genie-1-2024');
    expect(genie1?.authors).toHaveLength(25);
    expect(genie1?.venue).toBeUndefined();
  });
});

describe('generative-video originals: article spans and citations', () => {
  it('applies the Genie 2 correction and drops the unprintable 360p figure', () => {
    expect(article).toContain(
      'Genie 2 (December 2024) moved to 3D, with consistent worlds for up to a minute and most examples lasting 10 to 20 seconds <Cite id="genie-2-2024" />',
    );
    expect(article).not.toContain('at 360p');
    expect(article).toContain(
      'The original Genie learned latent actions from video-game footage and generated 2D worlds at about one frame per second <Cite id="genie-1-2024" />',
    );
  });

  it('moves the Cosmos 3 launch citation to the launch release and attaches the Odyssey follow-ons', () => {
    expect(article).toContain(
      'unifies those capabilities in one omni-model <Cite id="nvidia-cosmos-3-launch-2026" />',
    );
    expect(article).toContain('launched at GTC Taipei in late May 2026');
    expect(article).toContain(
      'with Starchild-1 adding audio alongside video <Cite id="odyssey-starchild-1-2026" /> and Agora-1 letting four participants share one simulation <Cite id="odyssey-agora-1-2026" />',
    );
    // The technical-report citation survives on the technical claims.
    expect(article.match(/<Cite id="cosmos-3-2026" \/>/g)?.length).toBeGreaterThan(0);
  });

  it('declares every newly attached citation in the frontmatter without moving lastReviewed', () => {
    for (const id of [
      'nvidia-cosmos-3-launch-2026',
      'genie-1-2024',
      'genie-2-2024',
      'odyssey-starchild-1-2026',
      'odyssey-agora-1-2026',
    ]) {
      expect(article).toContain(`  - ${id}`);
    }
    expect(article).toContain('lastReviewed: "2026-08-17"');
  });
});

describe('generative-video originals: packet-critical literals survive verbatim', () => {
  it('locks the printed numbers, dates and datelines in the dispatched plans', () => {
    const passages = mine.flatMap((plan) => plan.evidence.map((item) => item.supportingPassage)).join('\n');
    expect(passages).toContain('NVIDIA GTC Taipei');
    expect(passages).toContain('30,000 hours of Internet gameplay videos from hundreds of 2D platformer games');
    expect(passages).toContain('Genie currently operates around 1FPS');
    expect(passages).toContain('consistent worlds for up to a minute, with the majority of examples shown lasting 10-20s');
    expect(passages).toContain('from 88.9% to 94.9%');
    expect(passages).toContain('from 53.3% to 85.4%');
    expect(passages).toContain('38 million video clips and over 50 billion tokens');
    expect(passages).toContain('average success rate of 97.7% across more than 100 tasks');
    expect(passages).toContain('Project Genie lets you generate new worlds 60 seconds at a time, but only if you pay for AI Ultra');
    expect(passages).toContain('Limitations in generations to 60 seconds');
    expect(passages).toContain('founding research scientist at Luma AI');
    expect(passages).toContain('web-scale media + egocentric human videos + sim + dexterous remote operated robot data + on-policy NEO data');
    expect(passages).toContain('a new frame of video every 50 milliseconds');
    expect(passages).toContain('20 frames per second');
    expect(passages).toContain('synchronized audio and video in real-time');
    expect(passages).toContain('up to four players to interact within the same generated world in real time');
  });

  it('keeps the ledger claim cells the packet adjudicated', () => {
    expect(ledger).toContain('"Cosmos 3, launched at GTC Taipei in June 2026"');
    // The launch date string is printed by the release and recorded in the row's source cell.
    expect(ledger).toContain('dated May 31, 2026');
    expect(ledger).toContain('GR-1: video generative pre-training then fine-tuning');
    expect(ledger).toContain('GR-2: 38 million video clips, over 50 billion tokens');
    expect(ledger).toContain('"Starchild-1 adding audio alongside video');
  });
});

describe('generative-video originals: approved deltas', () => {
  const gvDeltas = deltas.entries.filter((delta) => delta.id.startsWith('gv-'));

  it('appends 9 row entries plus the relationships and frontmatter members, append-only', () => {
    // The merged delta ledger keeps appending later packets; this packet's
    // 11 entries keep their append slot at 1135..1145, so pin the slot, not
    // a moving total.
    expect(deltas.entries.slice(1135, 1146).map((delta) => delta.id).sort()).toEqual(
      [
        ...[6, 11, 12, 15, 16, 17, 20, 21, 22].map((row) => `gv-r${row}-20260916-1`),
        'gv-relationships-20260916-1',
        'gv-article-metadata-20260916-1',
      ].sort(),
    );
    const historical = committedJson<typeof deltas>(
      '4fea1f45907a5751249ae0064be6103ede8c49bd', 'contract/brand-v2-approved-deltas.json',
    );
    expect(historical.entries).toHaveLength(852);
    expect(gvDeltas).toEqual(historical.entries.filter((delta) => delta.id.startsWith('gv-')));
    expect(gvDeltas.filter((delta) => delta.manifest === 'prose').map((delta) => delta.id).sort())
      .toEqual([6, 11, 12, 15, 16, 17, 20, 21, 22].map((row) => `gv-r${row}-20260916-1`).sort());
    expect(gvDeltas.filter((delta) => delta.manifest === 'relationships')).toHaveLength(1);
    expect(gvDeltas.filter((delta) => delta.manifest === 'article-metadata')).toHaveLength(1);
    for (const delta of gvDeltas) {
      expect(delta.memberId).toContain('generative-video');
      expect(delta.disposition).toBe('permanent');
      expect(delta.ownerApproval).toContain('bf74a8266bad76a19353dc32d0627462f83c15db8139f19b6e1937d4ca863f88');
    }
  });

  it('marks exactly the four article-changing rows as the prose transition', () => {
    const prose = gvDeltas.filter((delta) => delta.manifest === 'prose');
    const moving = prose.filter((delta) => delta.oldHash !== delta.newHash);
    expect(moving.map((delta) => delta.id).sort()).toEqual(
      ['gv-r11-20260916-1', 'gv-r12-20260916-1', 'gv-r22-20260916-1', 'gv-r6-20260916-1'].sort(),
    );
    for (const delta of moving) {
      expect(delta.oldHash).toBe('09a9bdcabdc1101de55d36323b52bb11cadf7d76a5a9ad57d00ed4025461cad8');
      expect(delta.newHash).toBe('1de350b01f0799ce4833450502c1e4441f34ad7b7bd2d867fe573d89b25ebb05');
    }
    for (const delta of prose.filter((delta) => moving.indexOf(delta) === -1)) {
      expect(delta.oldHash).toBe(delta.newHash);
    }
    const rel = gvDeltas.find((delta) => delta.manifest === 'relationships');
    expect(rel?.oldHash).toBe('d01756dd06c2d1f9f091d13f0272eafb22d23b8cd158456af1e4c25fd3a852dd');
    expect(rel?.newHash).toBe('776ddde0d3314b1503834a5c61919df19e57db322e2ca4cb1a5edb367fd3b310');
    const meta = gvDeltas.find((delta) => delta.manifest === 'article-metadata');
    expect(meta?.oldHash).toBe('c451dead7ec4a9ad4a00c0e55d9060c32574824cdbb6e07f80614d5fc5a80f82');
    expect(meta?.newHash).toBe('8c10aa6ef77a24e9255011bd22a4fe2872266a57ae532f9f981adad3dd711f1b');
  });
});

describe('generative-video originals: protected neighbors', () => {
  it('keeps the sibling world-models sections plan-free where they were plan-free', () => {
    const jepaPlans = plans.filter((plan) => plan.articleSlug === 'jepa');
    expect(jepaPlans.every((plan) => plan.planReview.planDigest === compoundPlanDigest(plan))).toBe(true);
    const gsPlans = plans.filter((plan) => plan.articleSlug === 'generative-sim');
    expect(gsPlans.every((plan) => plan.planReview.planDigest === compoundPlanDigest(plan))).toBe(true);
  });

  it('keeps the other world-models articles\' row cells untouched', () => {
    const taxonomy = ledger.split('## taxonomy.mdx')[1].split('## latent-dynamics.mdx')[0];
    expect(taxonomy).not.toContain('20260916e');
    const jepa = ledger.split('## jepa.mdx')[1].split('## generative-sim.mdx')[0];
    expect(jepa).not.toContain('20260916e');
  });

  it('keeps every space plan bound and reviewed', () => {
    const space = plans.filter((plan) => plan.articleSlug === 'space');
    expect(space).toHaveLength(10);
    for (const plan of space) {
      expect(plan.planReview.planDigest).toBe(compoundPlanDigest(plan));
    }
  });
});
