import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Red-first proof for the state-estimation originals integration
 * (frozen packet convergence-source-g-state-estimation-20260916b, rows 8, 9,
 * 10, 12, 14, 15, 17). Every assertion here failed before application and
 * must pass after it.
 */
const article = readFileSync('content/classical/state-estimation.mdx', 'utf8');
const ledger = readFileSync('audit/classical.md', 'utf8');
type PlanRecord = {
  id: string;
  rowOrdinal: number;
  parts: Array<{ id: string }>;
  evidence: Array<{ citationId: string; sourceUrl: string; supportingPassage: string }>;
  planReview?: { reviewedBy: string; planDigest: string };
  adjudications: Array<{ partId: string; outcome: string; evidenceDigest: string }>;
};
const plans = JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8')) as unknown as PlanRecord[];
type DeltaRecord = { id: string; memberId: string; oldHash: string; newHash: string; ownerApproval: string; responsibleMilestone: string; affectedAssertions: string[] };
const deltas = JSON.parse(
  readFileSync('contract/brand-v2-approved-deltas.json', 'utf8'),
) as unknown as { entries: DeltaRecord[] };

const stateEstimation = (() => {
  const lines = ledger.split('\n');
  const start = lines.findIndex((line) => line.startsWith('### state-estimation.mdx'));
  const end = lines.findIndex((line, index) => index > start && line.startsWith('### '));
  return lines.slice(start, end === -1 ? undefined : end).join('\n');
})();

/** Row ordinal N is the Nth data row of the article's table. */
function row(n: number): string[] {
  const lines = stateEstimation.split('\n').filter((line) => line.startsWith('|'));
  const dataRows = lines.filter((line) => !/^\|\s*---/.test(line) && !line.startsWith('| Claim'));
  expect(dataRows.length).toBeGreaterThanOrEqual(n);
  const cells = dataRows[n - 1].trim().slice(1, -1).split(/(?<!\\)\|/);
  return cells.map((cell) => cell.trim());
}

const registeredIds = new Set(
  [...readFileSync('data/citations.ts', 'utf8').matchAll(/id: '([a-z0-9-]+)'/g)].map((m) => m[1]),
);

describe('state-estimation originals: article endpoints', () => {
  it('replaces the unsupported GTSAM reference-implementation epithet with the source-printed characterization (row 14)', () => {
    expect(article).not.toContain('with GTSAM as the reference implementation');
    expect(article).toContain(
      'GTSAM, a BSD-licensed C++ library that implements smoothing and mapping using factor graphs and Bayes networks, powers many such systems in academia and industry <Cite id="gtsam-2026" />',
    );
  });

  it('corrects the preintegration count to the paper\'s printed range (row 15)', () => {
    expect(article).not.toContain('collapsing hundreds of IMU readings');
    expect(article).toContain(
      'collapsing anywhere from a small number to hundreds of IMU readings between two keyframes into a single preintegrated factor <Cite id="forster-2017" />',
    );
  });

  it('keeps every bound citation id in the frontmatter', () => {
    for (const id of [
      'smith-1990',
      'julier-uhlmann-1997',
      'kschischang-2001',
      'kaess-2008',
      'gtsam-2026',
      'forster-2017',
      'kalman-1960-filter',
    ]) {
      expect(article).toContain(`- ${id}`);
    }
  });
});

describe('state-estimation originals: ledger evidence completion', () => {
  const completed: Array<[number, string, string]> = [
    [8, 'smith-1990', 'https://web.mit.edu/2.166/www/handouts/smith90stochastic.pdf'],
    [9, 'julier-uhlmann-1997', 'https://people.eecs.berkeley.edu/~pabbeel/cs287-fa15/optreadings/JulierUhlmann-UKF.pdf'],
    [10, 'kschischang-2001', 'https://www.mit.edu/~6.454/www_fall_2000/chanal/factor.pdf'],
    [12, 'kaess-2008', 'https://publications.ri.cmu.edu/storage/publications/pub_files/2008/12/Kaess08tro.pdf'],
    [14, 'gtsam-2026', 'https://gtsam.org/'],
    [15, 'forster-2017', 'https://arxiv.org/abs/1512.02363'],
  ];

  it.each(completed)(
    'row %i is a compound row: evidence cells empty, plan bound, evidence carried by the plan',
    (n, id, url) => {
      const cells = row(n);
      const [claim, sourceChecked, verdict, citationId, sourceUrl, passage, note, plan] = cells;
      expect(claim.length).toBeGreaterThan(0);
      expect(sourceChecked).toContain(id);
      expect(verdict.replace(/\*/g, '')).toMatch(/^(V|C)$/);
      // Compound rows must not mix scalar evidence fields with plan items.
      expect(citationId).toBe('');
      expect(sourceUrl).toBe('');
      expect(passage).toBe('');
      expect(note.length).toBeGreaterThan(60);
      expect(plan).toBe(`state-estimation-${n}-20260916`);
      const lane = plans.find((p) => p.id === `state-estimation-${n}-20260916`);
      expect(lane).toBeDefined();
      expect(lane!.evidence.length).toBeGreaterThan(0);
      for (const item of lane!.evidence) {
        expect(item.citationId).toBe(id);
      }
      expect(lane!.evidence.some((item) => item.sourceUrl === url)).toBe(true);
    },
  );

  it('row 14 records the reference-implementation correction as C', () => {
    const cells = row(14);
    expect(cells[2].replace(/\*/g, '')).toBe('C');
    expect(cells[0]).toContain('not the source-printed phrase');
    expect(cells[6]).toContain('Corrected');
  });

  it('row 15 keeps verdict V while carrying the range correction note', () => {
    const cells = row(15);
    expect(cells[2].replace(/\*/g, '')).toBe('V');
    expect(cells[6]).toContain('small number to hundreds');
  });

  it('row 17 completes the internal tracker row with the local-AND proof anchored in its plan', () => {
    const cells = row(17);
    const [claim, sourceChecked, verdict, citationId, sourceUrl, passage, note, plan] = cells;
    expect(claim).toContain('Tracker lab');
    expect(sourceChecked).toContain('kalman-tracker');
    expect(sourceChecked).toContain('lib/kalman.ts');
    expect(verdict.replace(/\*/g, '')).toBe('V');
    expect(citationId).toBe('');
    expect(sourceUrl).toBe('');
    expect(passage).toBe('');
    expect(note).toContain('local proof');
    expect(plan).toBe('state-estimation-17-20260916');
    const lane = plans.find((p) => p.id === 'state-estimation-17-20260916');
    expect(lane).toBeDefined();
    for (const item of lane!.evidence) {
      // Internal conjunct: repo text quoted as the passage, anchored to the
      // registered filter citation the component implements (r4/SA9 convention).
      expect(item.citationId).toBe('kalman-1960-filter');
      expect(item.sourceUrl).toBe('https://doi.org/10.1115/1.3662552');
      expect(item.supportingPassage).toContain('REPO TEXT');
      expect(item.supportingPassage).toContain('DROPOUT = 0.2');
    }
  });

  it('leaves the five held rows (1, 2, 3, 6, 7) untouched and incomplete', () => {
    for (const n of [1, 2, 3, 6, 7]) {
      const cells = row(n);
      expect(cells[3] ?? '').toBe('');
      expect(cells[7] ?? '').toBe('');
    }
    expect(row(1)[1]).toContain('thrun-2005');
    expect(row(3)[1]).toContain('kalman-1960-filter');
  });
});

describe('state-estimation originals: compound plans and approved deltas', () => {
  const lanePlans = plans.filter((plan) => plan.id.startsWith('state-estimation-'));

  it('adds exactly seven reviewed, fully adjudicated plans', () => {
    expect(plans).toHaveLength(718); // 713 at this lane's close + 5 grasp-planning plans (2026-09-16)
    expect(lanePlans.map((plan) => plan.rowOrdinal).sort((a, b) => a - b)).toEqual([
      8, 9, 10, 12, 14, 15, 17,
    ]);
    for (const plan of lanePlans) {
      expect(plan.planReview?.reviewedBy).toContain('state-estimation-integrator-20260916');
      expect(plan.planReview?.planDigest).toMatch(/^[a-f0-9]{64}$/);
      expect(plan.adjudications).toHaveLength(plan.parts.length);
      for (const review of plan.adjudications) {
        expect(review.outcome).toBe('supported');
        expect(review.evidenceDigest).toMatch(/^[a-f0-9]{64}$/);
      }
      for (const item of plan.evidence) {
        expect(registeredIds.has(item.citationId)).toBe(true);
        expect(item.sourceUrl.startsWith('http')).toBe(true);
        expect(item.supportingPassage.length).toBeGreaterThan(60);
      }
    }
  });

  it('keeps every prior plan object and its order intact', () => {
    expect(plans[705].id).toBe('reward-design-mpc-original-23-20260916');
    expect(new Set(plans.map((plan) => plan.id)).size).toBe(718);
  });

  it('adds exactly seven approved-delta entries for this lane', () => {
    expect(deltas.entries).toHaveLength(793); // 788 at this lane's close + 5 grasp-planning entries (2026-09-16)
    const lane = deltas.entries.filter((entry) =>
      /^se-r(8|9|10|12|14|15|17)-20260916-1$/.test(entry.id),
    );
    expect(lane).toHaveLength(7);
    for (const entry of lane) {
      expect(entry.memberId).toBe('article:classical/state-estimation');
      expect(entry.oldHash).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.newHash).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.ownerApproval).toContain('convergence-source-g-state-estimation-20260916b');
      expect(entry.responsibleMilestone).toBe('brand-v2-editorial');
      expect(entry.affectedAssertions).toContain('VAL-AUDIT-009');
    }
  });
});
