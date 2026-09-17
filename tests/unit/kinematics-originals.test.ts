import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Red-first coverage for the 2026-09-15 kinematics originals integration
 * (packet convergence-source-a-kinematics-20260915, applied by the
 * brand-v2-editorial integrator). These assertions failed on the
 * pre-application tree: the kinematics ledger section had a three-column
 * header with no evidence plans, and the Whitney span still attributed
 * Jacobian inversion to the 1969 abstract's scope.
 */
const PLAN_IDS = [
  'kinematics-1-mr-fk-product-20260915',
  'kinematics-2-planar-demo-20260915',
  'kinematics-4-dh-symbolic-20260915',
  'kinematics-6-so101-urdf-20260915',
  'kinematics-7-jacobian-20260915',
  'kinematics-8-statics-dual-20260915',
  'kinematics-9-whitney-rmrc-20260915',
  'kinematics-13-ik-solver-20260915',
  'kinematics-14-act-dims-20260915',
  'kinematics-15-gr00t-eef-20260915',
];

describe('kinematics originals integration (2026-09-15)', () => {
  const article = readFileSync('content/classical/kinematics.mdx', 'utf8');
  const ledger = readFileSync('audit/classical.md', 'utf8');
  const plans = JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8'));
  const deltas = JSON.parse(
    readFileSync('contract/brand-v2-approved-deltas.json', 'utf8'),
  );

  it("K9: the Whitney span no longer pins Jacobian inversion to the 1969 abstract's scope", () => {
    // The fetched IEEE abstract supports RMRC derivation and operator-commanded
    // hand motion; it does not state Jacobian inversion or the pseudoinverse.
    expect(article).not.toContain(
      'command a task-space velocity and invert the Jacobian to obtain joint rates',
    );
    expect(article).toContain(
      'the operator commands desired hand motion along axes relevant to the task',
    );
    expect(article).toContain(
      'the classical rate-control relations then invert the Jacobian',
    );
  });

  it('ledger: the kinematics section carries the eight-column evidence header', () => {
    const start = ledger.indexOf('### kinematics.mdx');
    const end = ledger.indexOf('### motion-planning.mdx', start);
    const section = ledger.slice(start, end);
    expect(section).toContain(
      '| Claim | Source checked | Verdict | Citation ID | Source URL fetched | Supporting passage | Note | Evidence plan |',
    );
  });

  it('ledger: all ten selected rows are bound to their evidence plans', () => {
    const start = ledger.indexOf('### kinematics.mdx');
    const end = ledger.indexOf('### motion-planning.mdx', start);
    const section = ledger.slice(start, end);
    for (const id of PLAN_IDS) {
      expect(section).toContain(`| ${id} |`);
    }
  });

  it('catalog: ten explicit-parts plans with per-part supported adjudications', () => {
    const mine = plans.filter((p: { id: string }) =>
      PLAN_IDS.includes(p.id),
    );
    expect(mine).toHaveLength(10);
    const parts = mine.flatMap(
      (p: { parts: unknown[] }) => p.parts,
    );
    const evidence = mine.flatMap(
      (p: { evidence: unknown[] }) => p.evidence,
    );
    const adjudications = mine.flatMap(
      (p: { adjudications: unknown[] }) => p.adjudications,
    );
    expect(parts).toHaveLength(21);
    expect(evidence).toHaveLength(21);
    expect(adjudications).toHaveLength(21);
    for (const plan of mine) {
      expect((plan as { kind: string }).kind).toBe('explicit-parts');
      for (const adj of (plan as { adjudications: { outcome: string }[] })
        .adjudications) {
        expect(adj.outcome).toBe('supported');
      }
    }
  });

  it('deltas: ten new kinematics approved-delta entries', () => {
    const ids = new Set(
      deltas.entries.map((e: { id: string }) => e.id),
    );
    for (let n = 1; n <= 15; n++) {
      const id = `kin-r${n}-20260915-1`;
      const expected = [1, 2, 4, 6, 7, 8, 9, 13, 14, 15].includes(n);
      expect(ids.has(id)).toBe(expected);
    }
  });

  it('K4 local-AND: DH four-factor product equals the displayed A_i', () => {
    const cos = Math.cos;
    const sin = Math.sin;
    const displayed = (t: number, d: number, a: number, al: number) => [
      [cos(t), -sin(t) * cos(al), sin(t) * sin(al), a * cos(t)],
      [sin(t), cos(t) * cos(al), -cos(t) * sin(al), a * sin(t)],
      [0, sin(al), cos(al), d],
      [0, 0, 0, 1],
    ];
    const mul = (x: number[][], y: number[][]): number[][] =>
      x.map((row, i) =>
        y[0].map(
          (_, j) => y.reduce((s, _, k) => s + x[i][k] * y[k][j], 0),
        ),
      );
    const tuples: [number, number, number, number][] = [
      [0.3, 0.11, 0.07, -1.2],
      [-2.1, 1.4, 0.33, 2.9],
      [1.7, -0.6, -1.1, 0.05],
      [2.8, 2.2, 1.9, -2.6],
      [-0.9, -1.3, -0.4, 1.55],
    ];
    for (const [t, d, a, al] of tuples) {
      const rz = [
        [cos(t), -sin(t), 0, 0],
        [sin(t), cos(t), 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ];
      const tz = [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, d],
        [0, 0, 0, 1],
      ];
      const tx = [
        [1, 0, 0, a],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ];
      const rx = [
        [1, 0, 0, 0],
        [0, cos(al), -sin(al), 0],
        [0, sin(al), cos(al), 0],
        [0, 0, 0, 1],
      ];
      const product = mul(mul(mul(rz, tz), tx), rx);
      const want = displayed(t, d, a, al);
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          expect(Math.abs(product[i][j] - want[i][j])).toBeLessThan(1e-12);
        }
      }
    }
  });

  it('K6 local-AND: the worktree SO-101 URDF declares six revolute joints plus one fixed', () => {
    const urdf = readFileSync('public/models/so101/so101.urdf', 'utf8');
    const joints = [
      ...urdf.matchAll(/<joint name="([^"]*)" type="([^"]*)"/g),
    ].map((m) => ({ name: m[1], type: m[2] }));
    const revolute = joints.filter((j) => j.type === 'revolute');
    const fixed = joints.filter((j) => j.type === 'fixed');
    expect(revolute.map((j) => j.name).sort()).toEqual(
      [
        'elbow_flex',
        'gripper',
        'shoulder_lift',
        'shoulder_pan',
        'wrist_flex',
        'wrist_roll',
      ].sort(),
    );
    expect(fixed.map((j) => j.name)).toEqual(['gripper_frame_joint']);
  });

  it('K13 local-AND: lib/ik.ts keeps LM acceptance, 0.5 mm tolerance and joint-limit clamps', () => {
    const ik = readFileSync('lib/ik.ts', 'utf8');
    expect(ik).toContain('DEFAULT_TOLERANCE = 5e-4');
    expect(ik).toContain('0.5 mm');
    expect(ik).toContain('reduces the residual');
    expect(ik).toContain('this.lambda * 0.5');
    expect(ik).toContain('this.lambda * 4');
    expect(ik).toContain('this.joints[i].lower, this.joints[i].upper');
  });

  it('K7 local-AND: the revolute Jacobian column is z_i x (p_ee - p_i)', () => {
    const ik = readFileSync('lib/ik.ts', 'utf8');
    expect(ik).toContain(
      'cross(joint.axisWorld, sub(eePosition, joint.position))',
    );
  });
});

describe('kinematics originals: 20260917a paywall row 10 (iterative IK citation binding)', () => {
  const PLAN_ID = 'kinematics-10-mr-iterative-ik-20260917a';
  const article = readFileSync('content/classical/kinematics.mdx', 'utf8');
  const ledger = readFileSync('audit/classical.md', 'utf8');
  const plans = JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8'));
  const deltas = JSON.parse(
    readFileSync('contract/brand-v2-approved-deltas.json', 'utf8'),
  );

  it('binds the row to the already-declared modern-robotics-2017 with an inline Cite', () => {
    const start = ledger.indexOf('### kinematics.mdx');
    const end = ledger.indexOf('### motion-planning.mdx', start);
    const section = ledger.slice(start, end);
    expect(section).toContain(`| ${PLAN_ID} |`);
    expect(section).toContain('CITATION BINDING DECISION (2026-09-17 integrator)');
    expect(section).toContain('no frontmatter-p1 plan exists for classical/kinematics');
    // the span carries the Cite immediately before the delta-q display
    expect(article).toContain(
      'the general tool is iterative: linearize around the current configuration, take a step, repeat, <Cite id="modern-robotics-2017" />',
    );
    // frontmatter unchanged: modern-robotics-2017 was already declared
    expect(article).toContain('  - modern-robotics-2017\n');
  });

  it('carries the verbatim chapter 6.2 companion transcript passages', () => {
    const plan = plans.find((p: { id: string }) => p.id === PLAN_ID)!;
    expect(plan.kind).toBe('explicit-parts');
    expect(plan.evidence).toHaveLength(1);
    const passage = plan.evidence[0].supportingPassage;
    expect(passage).toContain('Newton-Raphson root-finding method for numerical inverse kinematics');
    expect(passage).toContain('adding the pseudoinverse of the body Jacobian times the body twist V_b and repeat');
    expect(plan.evidence[0].citationId).toBe('modern-robotics-2017');
    expect(plan.evidence[0].sourceUrl).toBe(
      'https://modernrobotics.northwestern.edu/nu-gm-book-resource/6-2-numerical-inverse-kinematics-part-2-of-2/',
    );
    expect(plan.planReview.reviewedBy).toContain('paywall integrator efa5d1e4-a1b6-4874-b933-8492ceab17fa');
    expect(plan.planReview.rationale).toContain('6f279b9314e546c2800e1f54295c00fc6d3ca174186241d586f367e8a0f844f0');
  });

  it('records the prose and relationships deltas for the new Cite marker', () => {
    const ids = new Set(deltas.entries.map((e: { id: string }) => e.id));
    expect(ids.has('paywall0917a-kinematics-prose')).toBe(true);
    expect(ids.has('paywall0917a-kinematics-relationships')).toBe(true);
    const prose = deltas.entries.find((e: { id: string }) => e.id === 'paywall0917a-kinematics-prose')!;
    expect(prose.oldHash).not.toBe(prose.newHash);
    const rel = deltas.entries.find((e: { id: string }) => e.id === 'paywall0917a-kinematics-relationships')!;
    expect(rel.memberId).toBe('article:classical/kinematics');
  });
});
describe('kinematics originals: 20260917a book-retry row 5 (near-parallel DH re-scope)', () => {
  const PLAN_ID = 'kinematics-5-mr-nearparallel-20260917a';
  const article = readFileSync('content/classical/kinematics.mdx', 'utf8');
  const ledger = readFileSync('audit/classical.md', 'utf8');
  const plans = JSON.parse(readFileSync('audit/compound-evidence.json', 'utf8'));
  const deltas = JSON.parse(
    readFileSync('contract/brand-v2-approved-deltas.json', 'utf8'),
  );

  it('re-scopes the article span to the fetched ill-conditioning wording', () => {
    expect(article).toContain(
      "the parameters become ill-conditioned: as two consecutive joint axes drift toward parallel, the common normal they define can vary wildly with small changes in the axes' orientation",
    );
    expect(article).toContain(
      'The product-of-exponentials formulation avoids that ill-conditioning',
    );
    // the overstated prior wording is gone
    expect(article).not.toContain('Frame assignment is discontinuous');
    expect(article).not.toContain('axis can flip');
    expect(article).toContain('<Cite id="modern-robotics-2017" />');
  });

  it('binds the completed row to its plan with the author-hosted preprint identity', () => {
    const start = ledger.indexOf('### kinematics.mdx');
    const end = ledger.indexOf('### motion-planning.mdx', start);
    const section = ledger.slice(start, end);
    expect(section).toContain(`| ${PLAN_ID} |`);
    expect(section).toContain('ill-conditioned as joint axes approach parallel');
    expect(section).toContain('May 2017 preprint');
    const plan = plans.find((p: { id: string }) => p.id === PLAN_ID)!;
    expect(plan.parts).toHaveLength(3);
    expect(plan.evidence).toHaveLength(3);
    expect(plan.adjudications.map((a: { outcome: string }) => a.outcome)).toEqual(
      plan.parts.map(() => 'supported'),
    );
    expect(plan.evidence[0].supportingPassage).toContain('ill-conditioned');
    expect(plan.evidence[0].supportingPassage).toContain('vary wildly');
    expect(plan.evidence[2].supportingPassage).toContain('May 2017 preprint');
    expect(plan.planReview.reviewedBy).toContain('convergence-aq integrator');
    expect(plan.planReview.rationale).toContain(
      'ca1245a0c832c4f103779536c07cac10316eaf369c06351090ecb334cfb66da6',
    );
  });

  it('records the prose delta anchored to the pinned baseline hash', () => {
    const delta = deltas.entries.find((e: { id: string }) => e.id === 'aq0917a-kinematics-prose')!;
    expect(delta.memberId).toBe('article:classical/kinematics');
    expect(delta.oldHash).toBe(
      '2885525f6f0448ce59a5e74b9c953866b706e61596ffa35931f8fa92e5582b4b',
    );
    expect(delta.newHash).not.toBe(delta.oldHash);
  });
});
