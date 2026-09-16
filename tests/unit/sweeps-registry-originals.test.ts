import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { parseLedger, parseCompoundPlans } from '../../lib/audit-ledger.ts';
import { moduleFrontmatterSchema } from '../../data/schemas/module.ts';
import { CITATIONS } from '../../data/citations.ts';

/**
 * Pins the 2026-09-17a sweeps-and-registry integration: the three dispatched
 * frontmatter-sweep rows (humanoid-wbc:20 and legged-locomotion:18 in
 * rl-sim2real, generative-sim:15 in world-models, each corrected to the exact
 * P1 batch form over the article's CURRENT frontmatter id set) must bind to
 * their frontmatter-p1 compound plans and parse complete (no evidence
 * failures) with supported adjudications, and the registry-dependent
 * classical/motion-planning row 7 must complete as scalar evidence against
 * the corrected lavalle-kuffner-2001 registration (url LavKuf01b.pdf, the
 * IJRR Randomized Kinodynamic Planning paper, title/authors/year/venue
 * unchanged by the correction).
 */
const ROOT = join(import.meta.dirname, '../..');
const PACKET_SHA = {
  ag: '4e7cf1e320628f58662cb33a2f966069552d812a26fac2b8c6e82211a7045015',
  ai: '8e59a92d40778d265c25b63455c52f5e9cc58ee671268f8284c65764485cc15f',
};
const EXPECTED_SWEEPS = [
  { ledgerPath: 'audit/rl-sim2real.md', domain: 'rl-sim2real', slug: 'humanoid-wbc', ordinal: 20, planId: 'humanoid-wbc-20-frontmatter-sweep-20260917a', packet: PACKET_SHA.ag },
  { ledgerPath: 'audit/rl-sim2real.md', domain: 'rl-sim2real', slug: 'legged-locomotion', ordinal: 18, planId: 'legged-locomotion-18-frontmatter-sweep-20260917a', packet: PACKET_SHA.ag },
  { ledgerPath: 'audit/world-models.md', domain: 'world-models', slug: 'generative-sim', ordinal: 15, planId: 'generative-sim-15-frontmatter-sweep-20260917a', packet: PACKET_SHA.ag },
] as const;

const frontmatterCitations = (domain: string, slug: string): readonly string[] => {
  const file = join(ROOT, 'content', domain, `${slug}.mdx`);
  const frontmatter = moduleFrontmatterSchema.parse(matter(readFileSync(file, 'utf8')).data);
  expect(frontmatter.domain).toBe(domain);
  expect(frontmatter.slug).toBe(slug);
  return frontmatter.citations;
};

const loadSection = (ledgerPath: string, slug: string, articleCitations: Record<string, readonly string[]>) => {
  const markdown = readFileSync(join(ROOT, ledgerPath), 'utf8');
  const compoundPlans = parseCompoundPlans(
    JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
  );
  const registryIds = new Set(CITATIONS.map(({ id }) => id));
  const sections = parseLedger(ledgerPath, markdown, registryIds, { compoundPlans, articleCitations });
  const section = sections.find((s) => s.slug === slug);
  expect(section).toBeDefined();
  return { section: section!, compoundPlans };
};

describe('frontmatter sweeps integration (2026-09-17a)', () => {
  it('binds the three sweep rows to complete frontmatter-p1 compound evidence', () => {
    for (const spec of EXPECTED_SWEEPS) {
      const articleCitations = { [spec.slug]: frontmatterCitations(spec.domain, spec.slug) };
      const { section, compoundPlans } = loadSection(spec.ledgerPath, spec.slug, articleCitations);
      const record = section.claimRecords[spec.ordinal - 1];
      expect(record.compound?.planId ?? '').toBe(spec.planId);
      expect(record.compound?.structuralFailures ?? ['missing']).toEqual([]);
      expect(record.compound?.adjudicationFailures ?? ['missing']).toEqual([]);
      expect(record.evidenceFailures).toEqual([]);
      const plan = compoundPlans.find((p) => p.id === spec.planId)!;
      expect(plan.kind).toBe('frontmatter-p1');
      expect(plan.parts).toHaveLength(articleCitations[spec.slug].length);
      expect(plan.parts.every((part) => part.requiredCitationIds.length === 1)).toBe(true);
      expect(plan.adjudications.map((a) => a.outcome)).toEqual(plan.parts.map(() => 'supported'));
    }
  });

  it('writes the claim cells as the exact P1 batch form over the current frontmatter', () => {
    for (const spec of EXPECTED_SWEEPS) {
      const citations = frontmatterCitations(spec.domain, spec.slug);
      const articleCitations = { [spec.slug]: citations };
      const { section } = loadSection(spec.ledgerPath, spec.slug, articleCitations);
      const record = section.claimRecords[spec.ordinal - 1];
      expect(record.claim).toBe(
        `Frontmatter citations resolve to the intended documents (${citations.join(', ')})`,
      );
      expect(record.verdict).toBe('verified');
      // The stale count wordings this dispatch corrected are gone.
      if (spec.slug === 'humanoid-wbc') expect(record.claim).not.toContain('16 ids');
      if (spec.slug === 'legged-locomotion') expect(record.claim).not.toContain('12 ids');
      if (spec.slug === 'generative-sim') expect(record.claim).not.toContain('all five articles');
    }
  });

  it('keeps the corrected counts and disclosures in the sweep row notes', () => {
    const hw = loadSection('audit/rl-sim2real.md', 'humanoid-wbc', { 'humanoid-wbc': frontmatterCitations('rl-sim2real', 'humanoid-wbc') }).section.claimRecords[19];
    expect(hw.sourceChecked).toContain('Each of the 15 frontmatter ids fetched at its exact registered URL');
    expect(hw.note).toContain('Count corrected 16 -> 15');
    expect(hw.note).toContain("h2o-2024 IROS 2024, omnih2o-2024 CoRL 2024, wholebodyvla-2025 ICLR 2026 not printed");
    const ll = loadSection('audit/rl-sim2real.md', 'legged-locomotion', { 'legged-locomotion': frontmatterCitations('rl-sim2real', 'legged-locomotion') }).section.claimRecords[17];
    expect(ll.sourceChecked).toContain('Each of the 13 frontmatter ids fetched at its exact registered URL');
    expect(ll.note).toContain('Claim cell corrected 12 -> 13 ids');
    const gs = loadSection('audit/world-models.md', 'generative-sim', { 'generative-sim': frontmatterCitations('world-models', 'generative-sim') }).section.claimRecords[14];
    expect(gs.sourceChecked).toContain('All 8 generative-sim frontmatter ids fetched');
    expect(gs.note).toContain('isaac-lab-2025');
    expect(gs.note).toContain('106-name list');
  });

  it('carries one fetched-surface evidence item per identity in every sweep plan', () => {
    for (const spec of EXPECTED_SWEEPS) {
      const articleCitations = { [spec.slug]: frontmatterCitations(spec.domain, spec.slug) };
      const { compoundPlans } = loadSection(spec.ledgerPath, spec.slug, articleCitations);
      const plan = compoundPlans.find((p) => p.id === spec.planId)!;
      expect(plan.evidence).toHaveLength(plan.parts.length);
      expect(new Set(plan.evidence.map((item) => item.partId))).toEqual(
        new Set(plan.parts.map((part) => part.id)),
      );
      // Required id set == article frontmatter, and each evidence item
      // names a registered id at an http(s) URL with a real passage.
      expect([...new Set(plan.parts.flatMap((part) => part.requiredCitationIds))].sort()).toEqual(
        [...articleCitations[spec.slug]].sort(),
      );
      for (const item of plan.evidence) {
        expect(item.citationId).not.toBe('');
        expect(item.sourceUrl).toMatch(/^https?:\/\//);
        expect(item.supportingPassage.length).toBeGreaterThan(40);
      }
    }
  });
});

describe('registry correction (2026-09-17a)', () => {
  it('corrects only the lavalle-kuffner-2001 url to the IJRR paper at LavKuf01b.pdf', () => {
    const lk = CITATIONS.find(({ id }) => id === 'lavalle-kuffner-2001')!;
    expect(lk.url).toBe('https://lavalle.pl/papers/LavKuf01b.pdf');
    expect(lk.url).not.toBe('https://lavalle.pl/papers/LavKuf01.pdf');
    expect(lk.title).toBe('Randomized Kinodynamic Planning');
    expect(lk.authors).toEqual(['Steven M. LaValle', 'James J. Kuffner']);
    expect(lk.year).toBe(2001);
    expect(lk.venue).toBe('Int. J. Robotics Research');
    expect(lk.type).toBe('paper');
  });

  it('keeps the neighbouring lavalle-1998 entry byte-stable', () => {
    const l98 = CITATIONS.find(({ id }) => id === 'lavalle-1998')!;
    expect(l98.url).toBe('https://lavalle.pl/papers/Lav98c.pdf');
    expect(l98.year).toBe(1998);
  });

  it('records the correction identity in the citations audit ledger', () => {
    const md = readFileSync(join(ROOT, 'audit/citations.md'), 'utf8');
    expect(md).toContain('| lavalle-kuffner-2001 | https://lavalle.pl/papers/LavKuf01b.pdf |');
    expect(md).not.toContain('| lavalle-kuffner-2001 | https://lavalle.pl/papers/LavKuf01.pdf |');
    expect(md).toContain('LavKuf01b.pdf');
  });
});

describe('motion-planning row 7 completion (2026-09-17a)', () => {
  it('completes the kinodynamic row as scalar evidence bound to the corrected registration', () => {
    const { section } = loadSection('audit/classical.md', 'motion-planning', {});
    const record = section.claimRecords[6];
    expect(record.claim).toBe('Kinodynamic version steers with controls (LaValle-Kuffner)');
    expect(record.verdict).toBe('V');
    expect(record.compound?.planId ?? '').toBe('');
    expect(record.evidenceFailures).toEqual([]);
    expect(record.citationId).toBe('lavalle-kuffner-2001');
    expect(record.sourceUrl).toBe('https://lavalle.pl/papers/LavKuf01b.pdf');
    expect(record.supportingPassage).toContain('This paper presents the first randomized approach to kinodynamic planning');
    expect(record.supportingPassage).toContain(
      'The task is to determine control inputs to drive a robot from an initial configuration and velocity to a goal configuration and velocity',
    );
    expect(record.supportingPassage).toContain(
      'The function NEW_STATE makes a motion toward x by applying an input u in U for some time increment dt',
    );
    expect(record.supportingPassage).toContain('PDF p.13');
    expect(record.note).toContain("introduced in [20] (PDF p.2), not by LaValle-Kuffner");
  });
});

describe('integrator plan review (2026-09-17a)', () => {
  it('records integrator review on every sweep plan', () => {
    const compoundPlans = parseCompoundPlans(
      JSON.parse(readFileSync(join(ROOT, 'audit/compound-evidence.json'), 'utf8')),
    );
    for (const spec of EXPECTED_SWEEPS) {
      const plan = compoundPlans.find((p) => p.id === spec.planId)!;
      expect(plan.planReview?.reviewedBy).toMatch(/GLM-5\.3\/max integrator/);
      expect(plan.planReview?.rationale).toContain(spec.packet);
    }
  });
});
