import { describe, expect, it } from 'vitest';
import { planPacket } from '../helpers/audit-plan-history';
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
  evidence: Array<{ partId: string; citationId: string; sourceUrl: string; supportingPassage: string }>;
  planReview?: { reviewedBy: string; planDigest: string; rationale?: string };
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

  it('keeps the five book-retry rows as compound rows, now bound to 20260917a plans', () => {
    // Rows 1, 2, 3, 6, 7 were authentically held at this lane's close; the
    // 20260917a convergence-aq lane completed them (see the 20260917a
    // describe below). The compound-row discipline survives: scalar
    // evidence cells stay empty and evidence lives in the bound plan.
    for (const n of [1, 2, 3, 6, 7]) {
      const cells = row(n);
      expect(cells[3] ?? '').toBe('');
      expect(cells[4] ?? '').toBe('');
      expect(cells[5] ?? '').toBe('');
      expect(cells[7]).toBe(`state-estimation-${n}-` + ({ 1: 'bayes-draft', 2: 'kf-table31-kalman1960', 3: 'kalman-projection', 6: 'ekf-jacobians', 7: 'ekf-failure-mechanism' } as const)[n as 1 | 2 | 3 | 6 | 7] + '-20260917a');
    }
    expect(row(1)[1]).toContain('thrun-2005');
    expect(row(3)[1]).toContain('kalman-1960-filter');
  });
});

describe('state-estimation originals: compound plans and approved deltas', () => {
  // This lane's own plans; the 20260917a convergence-aq completions are pinned separately below.
  const lanePlans = plans.filter((plan) => /^state-estimation-\d+-20260916$/.test(plan.id));

  it('adds exactly seven reviewed, fully adjudicated plans', () => {
    // Identify the original seven plans independently of unrelated migrations.
    expect(
      planPacket(plans, [8, 9, 10, 12, 14, 15, 17].map(n => `state-estimation-${n}-20260916`)).map((plan) => plan.rowOrdinal),
    ).toEqual([8, 9, 10, 12, 14, 15, 17]);
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
    expect(plans[plans.findIndex(p => p.id === 'state-estimation-8-20260916') - 1].id).toBe('reward-design-mpc-original-23-20260916');
    // Append-only ledger: uniqueness holds globally; the total keeps growing.
    expect(new Set(plans.map((plan) => plan.id)).size).toBe(plans.length);
  });

  it('adds exactly seven approved-delta entries for this lane', () => {
    // Slot-pinned: this lane's entries sit at 778..784 on the merged ledger.
    expect(
      deltas.entries.slice(778, 785).map((entry) => entry.id),
    ).toEqual([8, 9, 10, 12, 14, 15, 17].map((row) => `se-r${row}-20260916-1`));
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
describe('state-estimation originals: 20260917a book-retry rows 1, 2, 3, 6, 7', () => {
  const BINDINGS: Readonly<Record<number, string>> = {
    1: 'state-estimation-1-bayes-draft-20260917a',
    2: 'state-estimation-2-kf-table31-kalman1960-20260917a',
    3: 'state-estimation-3-kalman-projection-20260917a',
    6: 'state-estimation-6-ekf-jacobians-20260917a',
    7: 'state-estimation-7-ekf-failure-mechanism-20260917a',
  };

  it('binds each completed row to its exact plan with supported adjudications', () => {
    for (const [ordinal, planId] of Object.entries(BINDINGS)) {
      expect(row(Number(ordinal))[7]).toBe(planId);
      const plan = plans.find((p) => p.id === planId)!;
      expect(plan.planReview?.reviewedBy).toContain('convergence-aq integrator');
      expect(plan.planReview?.rationale).toContain(
        'ca1245a0c832c4f103779536c07cac10316eaf369c06351090ecb334cfb66da6',
      );
      expect(plan.adjudications.map((a) => a.outcome)).toEqual(
        plan.parts.map(() => 'supported'),
      );
    }
  });

  it('pins row 1: Bayes filter recursions from the disclosed EARLY DRAFT of Probabilistic Robotics', () => {
    const plan = plans.find((p) => p.id === BINDINGS[1])!;
    expect(plan.evidence).toHaveLength(4);
    expect(plan.evidence.find((e) => e.partId === 'predict-control-update')!.supportingPassage)
      .toContain('the belief bel(xt ) that the robot assigns to state xt is obtained by the integral (sum)');
    expect(plan.evidence.find((e) => e.partId === 'measurement-update-eta')!.supportingPassage)
      .toContain('The second step of the Bayes filter is called the measurement update');
    expect(plan.evidence.find((e) => e.partId === 'recursion')!.supportingPassage)
      .toContain('The Bayes filter is recursive');
    expect(plan.evidence.find((e) => e.partId === 'draft-identity')!.supportingPassage)
      .toContain('PROBABILISTIC ROBOTICS');
    // the row note carries the draft-status disclosure
    expect(row(1)[6]).toContain('EARLY DRAFT');
  });

  it('pins row 2: Table 3.1 recursions from the draft, gain semantics, and the 1960 origin from the Rutgers re-transcription', () => {
    const plan = plans.find((p) => p.id === BINDINGS[2])!;
    expect(plan.evidence).toHaveLength(3);
    expect(plan.evidence.find((e) => e.partId === 'linear-gaussian-table31')!.supportingPassage)
      .toContain('Algorithm Kalman filter(');
    expect(plan.evidence.find((e) => e.partId === 'gain-semantics')!.supportingPassage)
      .toContain('computed in Line 4 is called Kalman gain');
    const origin = plan.evidence.find((e) => e.partId === 'origin-1960')!;
    expect(origin.citationId).toBe('kalman-1960-filter');
    expect(origin.supportingPassage).toContain('Research Institute for Advanced Study');
    expect(row(2)[6]).toContain('re-transcription');
  });

  it('pins row 3: Kalman 1960 minimum-variance and projection results', () => {
    const plan = plans.find((p) => p.id === BINDINGS[3])!;
    expect(plan.evidence).toHaveLength(3);
    expect(plan.evidence.find((e) => e.partId === 'quadratic-loss-gaussian')!.supportingPassage)
      .toContain('minimizes the average loss');
    expect(plan.evidence.find((e) => e.partId === 'projection-best-linear')!.supportingPassage)
      .toContain('orthogonal projection');
    expect(plan.evidence.find((e) => e.partId === 'second-order-white-noise')!.supportingPassage)
      .toContain('first and second order aver');
    expect(row(3)[6]).toContain('Rutgers-hosted Lukesh re-transcription');
    expect(row(3)[6]).toContain('Theorem 1-a');
  });

  it('pins rows 6 and 7: EKF Jacobians and the failure mechanism from the disclosed draft', () => {
    const ekf = plans.find((p) => p.id === BINDINGS[6])!;
    expect(ekf.evidence.find((e) => e.partId === 'process-jacobian-G')!.supportingPassage)
      .toContain('This matrix is often called the Jacobian');
    expect(ekf.evidence.find((e) => e.partId === 'measurement-jacobian-H')!.supportingPassage)
      .toContain('the exact same linearization for the measurement function');
    const failure = plans.find((p) => p.id === BINDINGS[7])!;
    expect(failure.evidence.find((e) => e.partId === 'nonlinearity-distorts-belief')!.supportingPassage)
      .toContain('A Gaussian projected through this function is typically non-Gaussian');
    expect(failure.evidence.find((e) => e.partId === 'tangent-linearization')!.supportingPassage)
      .toContain('Linearization approximates g by a linear function that is tangent to g');
    expect(row(7)[6]).toContain('compression');
  });
});
