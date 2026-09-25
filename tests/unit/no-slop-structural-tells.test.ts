import { describe, expect, it } from 'vitest';
import {
  findStructuralTells,
  STRUCTURAL_TELL_LIMIT,
  structuralTellReport,
  type StructuralTellKind,
} from '../../lib/no-slop.ts';
import type { SlopQuotationException } from '../../lib/no-slop.ts';

/**
 * Structural-tell floor for the manipulation humanizer v3 pass
 * (VAL-HUMAN-001): §1 not-X disclaimers and paper-internal locators,
 * counted per 1,000 words of MDX prose. The patterns are deliberately a
 * small, nameable set: every counted tell is one a careful writer would
 * avoid on purpose, and the floor (2/1k) allows a handful of honest
 * exceptions without letting the audit voice back in.
 */

describe('findStructuralTells: not-X disclaimers (humanizer v3 §1)', () => {
  it('flags "not just / not only / not merely" constructions', () => {
    const body = 'It is not just a scheduler. It is not merely a policy, not only a plan.';
    const kinds = findStructuralTells(body).map((f) => f.kind);
    expect(kinds.filter((k) => k === 'not-x').length).toBe(3);
  });

  it('flags "not X but Y" inside one clause', () => {
    const body = 'The result is not a universal ranking but a map of mechanisms.';
    expect(findStructuralTells(body).map((f) => f.kind)).toContain('not-x');
  });

  it('flags "rather than" contrasts', () => {
    const body = 'RL learns from failure rather than only from success.';
    expect(findStructuralTells(body).map((f) => f.kind)).toContain('not-x');
  });

  it('flags the appositive disclaimer ", not X"', () => {
    const body =
      'Treat the table as a map of mechanisms, not a leaderboard. It is a lab report, not a replication.';
    const notX = findStructuralTells(body).filter((f) => f.kind === 'not-x');
    expect(notX.length).toBe(2);
  });

  it('flags the split-contrast preface "does not mean"', () => {
    const body = 'This does not mean every choice is equal. It means confirmation is missing.';
    expect(findStructuralTells(body).map((f) => f.kind)).toContain('not-x');
  });

  it('leaves plain negation and registry vocabulary alone', () => {
    const body =
      'Weight availability is not disclosed. The paper does not report a denominator. ' +
      'The method cannot close the loop. Nothing here is impossible to verify.';
    expect(findStructuralTells(body)).toEqual([]);
  });

  it('does not flag "but" without a preceding not-contrast', () => {
    const body = 'The baseline is strong, but the evaluation covers two tasks.';
    expect(findStructuralTells(body)).toEqual([]);
  });

  it('reports 1-based line numbers', () => {
    const body = 'First line is clean.\nSecond line: this is not a leaderboard but a map.';
    const [finding] = findStructuralTells(body);
    expect(finding.line).toBe(2);
  });
});

describe('findStructuralTells: paper-internal locators', () => {
  it('flags table, figure, equation, appendix and section locators', () => {
    const body = [
      'Table 1 reports the mean.',
      'Table 1a covers assembly.',
      'Table I is the printed form.',
      "Table 2's caption disagrees.",
      'Figure 8 says more than 2x.',
      'Fig. 5 plots the curve.',
      'Equation 2 defines the policy.',
      'Eq. (3) restates it.',
      'Appendix B specifies the grid.',
      'Appendix D.2 describes the setup.',
      'Section 4.3.2 puts state into the VLM.',
      'Section VI-C describes the reduction.',
      'Section E.2 reports 40 percent.',
    ].join('\n');
    const locators = findStructuralTells(body).filter(
      (f) => f.kind === 'paper-locator',
    );
    expect(locators.length).toBe(13);
  });

  it('flags bare paper-version markers like v2 and v3', () => {
    const body = 'The v3 comparisons are narrow, and v2 changed the tables.';
    const locators = findStructuralTells(body).filter(
      (f) => f.kind === 'paper-locator',
    );
    expect(locators.length).toBe(2);
  });

  it('does not flag ordinary words containing v or section prose', () => {
    const body =
      'The controller runs at 10 Hz on hardware versus simulation. See the evaluation section of the site for more.';
    expect(findStructuralTells(body)).toEqual([]);
  });

  it('ignores locators inside fenced code blocks and inline code', () => {
    const body = 'Use `Table 1` in code.\n\n```\nSection 4.3.2 in a block\n```';
    expect(findStructuralTells(body)).toEqual([]);
  });

  it('ignores frontmatter metadata such as citation ids containing v1', () => {
    const body = '---\ntitle: "Article"\ncitations:\n  - diffusion-policy-2023-v1\n---\n\nThe paper reports two inference settings.';
    expect(findStructuralTells(body)).toEqual([]);
    expect(structuralTellReport(body).words).toBeLessThan(10);
  });
});

describe('findStructuralTells: registered verbatim quotations stay exempt', () => {
  it('masks a registered quote that contains a counted tell', () => {
    const quote = 'it is not yet a recipe';
    const exceptions: SlopQuotationException[] = [
      {
        id: 'some-source',
        quote,
        reason: 'Verbatim quoted position statement.',
        verifiedBy: 'Compared against the fetched source text.',
        verifiedOn: '2026-09-25',
        sourceUrl: 'https://example.org/source',
      },
    ];
    const body = `They write that ${quote}. It is a craft.`;
    expect(findStructuralTells(body, exceptions)).toEqual([]);
  });
});

describe('structuralTellReport', () => {
  it('computes the per-1,000-word rate from the masked prose', () => {
    const filler =
      'The policy improves with online data and the value function assigns credit across the horizon. ';
    // 2 not-X tells + 3 locators across ~350 masked words.
    const body =
      Array(22).fill(filler).join('') +
      'This is not a ranking but a map. Rather than hedge, keep Table 1 out. See Appendix B. Section 4.3.2 disagrees.';
    const report = structuralTellReport(body);
    expect(report.measured).toBe(true);
    expect(report.tells).toBe(5);
    expect(report.notX).toBe(2);
    expect(report.paperLocator).toBe(3);
    expect(report.density).toBeCloseTo((5 / report.words) * 1000, 5);
    expect(report.density).toBeGreaterThan(10);
  });

  it('is sub-floor informationally for very short bodies', () => {
    const report = structuralTellReport('Short intro, not a leaderboard.');
    expect(report.measured).toBe(false);
    expect(report.subFloor).toBe(true);
    expect(report.tells).toBe(1);
  });

  it('never reports a silent zero density for empty prose', () => {
    const report = structuralTellReport('');
    expect(report.words).toBe(0);
    expect(report.density).toBe(0);
    expect(report.measured).toBe(false);
    expect(report.subFloor).toBe(false);
  });

  it('pins the manipulation floor at 2 tells per 1,000 words', () => {
    expect(STRUCTURAL_TELL_LIMIT).toBe(2);
  });

  it('counts kinds independently so a report can name each class', () => {
    const report = structuralTellReport(
      'Rather than a recipe it is a craft, and Section 5 says so.',
    );
    expect(report.notX).toBe(1);
    expect(report.paperLocator).toBe(1);
    expect(report.tells).toBe(2);
  });
});

describe('structuralTellReport kind coverage is exhaustive', () => {
  it('derives the kind union from the findings, not from a second list', () => {
    const kinds: StructuralTellKind[] = ['not-x', 'paper-locator'];
    const report = structuralTellReport('Rather than hedge. See Appendix B.');
    const counted = new Set(findStructuralTells('Rather than hedge. See Appendix B.').map((f) => f.kind));
    for (const kind of kinds) expect(counted.has(kind)).toBe(true);
    expect(report.tells).toBe(findStructuralTells('Rather than hedge. See Appendix B.').length);
  });
});
