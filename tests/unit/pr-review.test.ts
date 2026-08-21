import { describe, expect, it } from 'vitest';
import {
  countBySeverity,
  existingInlineKeys,
  formatReviewMarkdown,
  githubNextLink,
  inlineFindings,
  maskJsxTags,
  parseUnifiedDiff,
  pendingInlineFindings,
  reviewChanges,
  scanJsxTags,
  sortFindings,
  MAX_FINDINGS,
  REVIEW_MARKER,
  RULE_CATALOG,
  type ChangedFile,
  type ReviewFinding,
} from '@/lib/pr-review';

/** Build a ChangedFile from a list of [line, text] pairs. */
function changed(
  path: string,
  added: Array<[number, string]>,
  status: ChangedFile['status'] = 'modified',
): ChangedFile {
  return {
    path,
    status,
    addedLines: added.map(([line, text]) => ({ line, text })),
    removedLines: [],
  };
}

const FRONTMATTER = [
  '---',
  'title: "Action Chunking"',
  'description: "Chunking."',
  'domain: manipulation',
  'slug: action-chunking',
  'order: 2',
  'status: published',
  'lastReviewed: "2026-08-08"',
  'citations:',
  '  - act-aloha-2023',
  '---',
];

/** Assemble an MDX body whose first body line is line 12. */
function mdx(...bodyLines: string[]): string {
  return [...FRONTMATTER, '', ...bodyLines, ''].join('\n');
}

/**
 * A brand new article, so the prose rules can be asserted in isolation:
 * a modified article also raises stale-last-reviewed, which has its own
 * describe block below.
 */
function newArticle(path: string, added: Array<[number, string]>): ChangedFile {
  return changed(path, added, 'added');
}

const BODY_START = FRONTMATTER.length + 2; // 1-based line of the first body line

describe('parseUnifiedDiff', () => {
  it('numbers added lines from the hunk header of each hunk', () => {
    const diff = [
      'diff --git a/lib/gait.ts b/lib/gait.ts',
      'index 1111111..2222222 100644',
      '--- a/lib/gait.ts',
      '+++ b/lib/gait.ts',
      '@@ -4,0 +5,2 @@',
      '+const duty = 0.5;',
      '+const phase = 0;',
      '@@ -20 +22 @@',
      '-const old = 1;',
      '+const next = 2;',
      '',
    ].join('\n');
    const [file] = parseUnifiedDiff(diff);
    expect(file.path).toBe('lib/gait.ts');
    expect(file.status).toBe('modified');
    expect(file.addedLines).toEqual([
      { line: 5, text: 'const duty = 0.5;' },
      { line: 6, text: 'const phase = 0;' },
      { line: 22, text: 'const next = 2;' },
    ]);
    expect(file.removedLines).toEqual(['const old = 1;']);
  });

  it('advances line numbers across context lines in a -U1 diff', () => {
    const diff = [
      'diff --git a/lib/ik.ts b/lib/ik.ts',
      '--- a/lib/ik.ts',
      '+++ b/lib/ik.ts',
      '@@ -10,2 +10,3 @@',
      ' const damping = 0.01;',
      '+const clamp = 0.1;',
      ' return solve();',
      '',
    ].join('\n');
    expect(parseUnifiedDiff(diff)[0].addedLines).toEqual([{ line: 11, text: 'const clamp = 0.1;' }]);
  });

  it('marks new files, deletions, and renames with the head path', () => {
    const diff = [
      'diff --git a/content/frontier/new.mdx b/content/frontier/new.mdx',
      'new file mode 100644',
      '--- /dev/null',
      '+++ b/content/frontier/new.mdx',
      '@@ -0,0 +1 @@',
      '+# New',
      'diff --git a/lib/old.ts b/lib/old.ts',
      'deleted file mode 100644',
      '--- a/lib/old.ts',
      '+++ /dev/null',
      '@@ -1 +0,0 @@',
      '-const gone = true;',
      'diff --git a/lib/from.ts b/lib/to.ts',
      'similarity index 98%',
      'rename from lib/from.ts',
      'rename to lib/to.ts',
      '',
    ].join('\n');
    const files = parseUnifiedDiff(diff);
    expect(files.map((file) => [file.path, file.status])).toEqual([
      ['content/frontier/new.mdx', 'added'],
      ['lib/old.ts', 'deleted'],
      ['lib/to.ts', 'modified'],
    ]);
    expect(files[1].addedLines).toEqual([]);
  });

  it('ignores the no-newline marker and quoted paths', () => {
    const diff = [
      'diff --git "a/data/odd name.ts" "b/data/odd name.ts"',
      '--- "a/data/odd name.ts"',
      '+++ "b/data/odd name.ts"',
      '@@ -1 +1 @@',
      '-const a = 1;',
      '+const a = 2;',
      '\\ No newline at end of file',
      '',
    ].join('\n');
    const [file] = parseUnifiedDiff(diff);
    expect(file.path).toBe('data/odd name.ts');
    expect(file.addedLines).toEqual([{ line: 1, text: 'const a = 2;' }]);
  });

  it('returns nothing for an empty diff', () => {
    expect(parseUnifiedDiff('')).toEqual([]);
  });
});

describe('scanJsxTags', () => {
  it('spans a tag whose attribute value contains a closing angle bracket', () => {
    const body = '<Stat label="raised" value=">$23B" note="tally" />\nPlain prose.\n';
    const [tag] = scanJsxTags(body);
    expect(tag.name).toBe('stat');
    expect(tag.text).toContain('value=">$23B"');
    expect(tag.startLine).toBe(1);
    expect(tag.endLine).toBe(1);
  });

  it('spans a multi-line tag past an arrow function in a handler', () => {
    const body = [
      'const x = (',
      '  <input',
      '    type="range"',
      '    onChange={(e) => setValue(Number(e.target.value))}',
      '    aria-label="Chunk size"',
      '  />',
      ');',
    ].join('\n');
    const input = scanJsxTags(body).find((tag) => tag.name === 'input');
    expect(input).toBeDefined();
    expect(input?.startLine).toBe(2);
    expect(input?.endLine).toBe(6);
    expect(input?.text).toContain('aria-label="Chunk size"');
  });

  it('leaves prose comparisons alone', () => {
    expect(scanJsxTags('latency < 70 ms is required, and 5 > 3.')).toEqual([]);
  });
});

describe('maskJsxTags', () => {
  it('blanks tags while keeping line numbers and prose', () => {
    const body = '<Stat value=">$23B" />\nThe policy runs at 50 Hz.\n';
    const masked = maskJsxTags(body);
    expect(masked.split('\n')).toHaveLength(3);
    expect(masked.split('\n')[0].trim()).toBe('');
    expect(masked.split('\n')[1]).toBe('The policy runs at 50 Hz.');
  });
});

describe('uncited-quantitative-claim', () => {
  const claim = 'The policy runs at 50 Hz on the real robot.';

  it('flags a number with a unit in a paragraph with no source', () => {
    const body = mdx(claim);
    const findings = reviewChanges({
      files: [newArticle('content/manipulation/action-chunking.mdx', [[BODY_START, claim]])],
      bodies: { 'content/manipulation/action-chunking.mdx': body },
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      rule: 'uncited-quantitative-claim',
      severity: 'warning',
      line: BODY_START,
    });
    expect(findings[0].message).toContain('50 Hz');
  });

  it('accepts a claim whose paragraph carries a <Cite>', () => {
    const cited = `${claim} <Cite id="act-aloha-2023" />`;
    const findings = reviewChanges({
      files: [newArticle('content/manipulation/action-chunking.mdx', [[BODY_START, cited]])],
      bodies: { 'content/manipulation/action-chunking.mdx': mdx(cited) },
    });
    expect(findings).toEqual([]);
  });

  it('accepts a claim cited on a neighbouring line of the same paragraph', () => {
    const body = mdx(claim, 'That result is from the ACT paper <Cite id="act-aloha-2023" />.');
    const findings = reviewChanges({
      files: [newArticle('content/manipulation/action-chunking.mdx', [[BODY_START, claim]])],
      bodies: { 'content/manipulation/action-chunking.mdx': body },
    });
    expect(findings).toEqual([]);
  });

  it('ignores numbers in code, math, JSX attributes, and frontmatter', () => {
    const lines = [
      'Run `npm run dev -- --port 3200` to start it.',
      '',
      '$$ \\varepsilon = 0.5 \\text{ ms} $$',
      '',
      '<Stat label="control rate" value="50 Hz" note="ACT reference" />',
    ];
    const body = mdx(...lines);
    const added: Array<[number, string]> = lines.map((text, i) => [BODY_START + i, text]);
    added.push([8, 'lastReviewed: "2026-08-16"']);
    const findings = reviewChanges({
      files: [newArticle('content/manipulation/action-chunking.mdx', added)],
      bodies: { 'content/manipulation/action-chunking.mdx': body },
    });
    expect(findings).toEqual([]);
  });

  it('ignores hypotheticals and definitional thresholds', () => {
    const lines = [
      'If 99.9% takes five more years, the fund vintage marks to market.',
      '',
      'Generalization is solved when one policy is better than 90% across unseen homes.',
      '',
      'Dragging the horizon toward 1M hours extends both scenarios.',
    ];
    const body = mdx(...lines);
    const findings = reviewChanges({
      files: [
        newArticle(
          'content/manipulation/action-chunking.mdx',
          lines.map((text, i) => [BODY_START + i, text]),
        ),
      ],
      bodies: { 'content/manipulation/action-chunking.mdx': body },
    });
    expect(findings.filter((f) => f.rule === 'uncited-quantitative-claim')).toEqual([]);
  });

  it('still flags past-tense and projected quantitative claims', () => {
    const lines = [
      'The lab were 99.9% reliable across the last 400 homes.',
      '',
      'The company would ship 12 million units on the current line.',
      '',
      'The deck projected $40 million in 2027 revenue.',
    ];
    const body = mdx(...lines);
    const findings = reviewChanges({
      files: [
        newArticle(
          'content/manipulation/action-chunking.mdx',
          lines.map((text, i) => [BODY_START + i, text]),
        ),
      ],
      bodies: { 'content/manipulation/action-chunking.mdx': body },
    });
    const claims = findings.filter((f) => f.rule === 'uncited-quantitative-claim');
    expect(claims.map((f) => f.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('99.9%'),
        expect.stringContaining('12 million'),
        expect.stringContaining('$40'),
      ]),
    );
  });

  it('does not fire on bare integers or years', () => {
    const line = 'Figure 3 compares k=100 against the 2023 baseline.';
    const findings = reviewChanges({
      files: [newArticle('content/manipulation/action-chunking.mdx', [[BODY_START, line]])],
      bodies: { 'content/manipulation/action-chunking.mdx': mdx(line) },
    });
    expect(findings).toEqual([]);
  });
});

describe('handwritten-generated-section', () => {
  it.each([
    ['## References', 'References'],
    ['### See also', 'See also'],
    ['## Linked from', 'Linked from'],
  ])('blocks a hand-written %s heading', (heading) => {
    const findings = reviewChanges({
      files: [newArticle('content/manipulation/action-chunking.mdx', [[BODY_START, heading]])],
      bodies: { 'content/manipulation/action-chunking.mdx': mdx(heading) },
    });
    expect(findings.map((f) => [f.rule, f.severity])).toEqual([
      ['handwritten-generated-section', 'blocker'],
    ]);
  });

  it('blocks a hand-written reading time', () => {
    const line = 'Reading time: 14 min read.';
    const findings = reviewChanges({
      files: [newArticle('content/manipulation/action-chunking.mdx', [[BODY_START, line]])],
      bodies: { 'content/manipulation/action-chunking.mdx': mdx(line) },
    });
    expect(findings.some((f) => f.rule === 'handwritten-generated-section')).toBe(true);
  });

  it('leaves ordinary headings alone', () => {
    const heading = '## The chunk-size dial';
    const findings = reviewChanges({
      files: [newArticle('content/manipulation/action-chunking.mdx', [[BODY_START, heading]])],
      bodies: { 'content/manipulation/action-chunking.mdx': mdx(heading) },
    });
    expect(findings).toEqual([]);
  });
});

describe('vague-attribution', () => {
  it('flags an appeal to unnamed authority', () => {
    const line = 'Experts say the reliability gap closes within two product cycles.';
    const findings = reviewChanges({
      files: [newArticle('content/manipulation/action-chunking.mdx', [[BODY_START, line]])],
      bodies: { 'content/manipulation/action-chunking.mdx': mdx(line) },
    });
    expect(findings.map((f) => f.rule)).toContain('vague-attribution');
    expect(findings[0].message).toContain('Experts say');
  });

  it('accepts an attributed and cited claim', () => {
    const line =
      'Ken Goldberg argues the data gap spans 100,000 years <Cite id="goldberg-data-gap-2025" />.';
    const findings = reviewChanges({
      files: [newArticle('content/manipulation/action-chunking.mdx', [[BODY_START, line]])],
      bodies: { 'content/manipulation/action-chunking.mdx': mdx(line) },
    });
    expect(findings).toEqual([]);
  });
});

describe('stale-last-reviewed', () => {
  const line = 'The chunk-size dial is a bias/variance tradeoff <Cite id="act-aloha-2023" />.';

  it('flags edited prose that leaves the review date behind', () => {
    const findings = reviewChanges({
      files: [changed('content/manipulation/action-chunking.mdx', [[BODY_START, line]])],
      bodies: { 'content/manipulation/action-chunking.mdx': mdx(line) },
    });
    expect(findings.map((f) => f.rule)).toEqual(['stale-last-reviewed']);
    expect(findings[0].message).toContain('2026-08-08');
    expect(findings[0].line).toBeUndefined();
  });

  it('accepts an edit that bumps lastReviewed', () => {
    const findings = reviewChanges({
      files: [
        changed('content/manipulation/action-chunking.mdx', [
          [8, 'lastReviewed: "2026-08-16"'],
          [BODY_START, line],
        ]),
      ],
      bodies: { 'content/manipulation/action-chunking.mdx': mdx(line) },
    });
    expect(findings).toEqual([]);
  });

  it('does not ask a brand new article to bump anything', () => {
    const findings = reviewChanges({
      files: [changed('content/manipulation/new.mdx', [[BODY_START, line]], 'added')],
      bodies: { 'content/manipulation/new.mdx': mdx(line) },
    });
    expect(findings).toEqual([]);
  });
});

describe('data registry rules', () => {
  const row = (extra: string[]): Array<[number, string]> =>
    [
      '  {',
      "    id: 'new-lab',",
      "    name: 'New Lab',",
      '    founded: 2026,',
      ...extra,
      '  },',
    ].map((text, i) => [40 + i, text]);

  it('blocks a company row with no source link', () => {
    const findings = reviewChanges({
      files: [changed('data/companies.ts', row([]))],
      bodies: { 'data/companies.ts': '' },
    });
    expect(findings.map((f) => [f.rule, f.severity, f.line])).toEqual([
      ['unsourced-registry-row', 'blocker', 40],
    ]);
  });

  it('accepts a row that carries sources', () => {
    const findings = reviewChanges({
      files: [changed('data/companies.ts', row(["    sources: ['techcrunch-new-lab-2026'],"]))],
      bodies: { 'data/companies.ts': '' },
    });
    expect(findings).toEqual([]);
  });

  it('blocks a citation with no url, doi, or arxiv id', () => {
    const added: Array<[number, string]> = [
      '  {',
      "    id: 'mystery-2026',",
      "    title: 'A Paper Nobody Can Find',",
      '    year: 2026,',
      '  },',
    ].map((text, i) => [12 + i, text]);
    const findings = reviewChanges({
      files: [changed('data/citations.ts', added)],
      bodies: { 'data/citations.ts': '' },
      currentYear: 2026,
    });
    expect(findings.map((f) => f.rule).sort()).toEqual([
      'citation-without-identifier',
      'unsourced-registry-row',
    ]);
  });

  it('flags a citation dated in the future', () => {
    const added: Array<[number, string]> = [
      '  {',
      "    id: 'future-2031',",
      "    title: 'Ahead of Its Time',",
      '    year: 2031,',
      "    url: 'https://arxiv.org/abs/2501.00001',",
      '  },',
    ].map((text, i) => [12 + i, text]);
    const findings = reviewChanges({
      files: [changed('data/citations.ts', added)],
      bodies: { 'data/citations.ts': '' },
      currentYear: 2026,
    });
    expect(findings.map((f) => f.rule)).toEqual(['future-dated-citation']);
    expect(findings[0].message).toContain('2031');
  });

  it('does not treat link-check exceptions as a sourced-row registry', () => {
    const added: Array<[number, string]> = [
      '  {',
      "    id: 'llama-3-2024',",
      "    reason: 'bot-wall, no DOI',",
      "    verifiedBy: 'headless Chromium',",
      "    verifiedOn: '2026-08-11',",
      '  },',
    ].map((text, i) => [24 + i, text]);
    const findings = reviewChanges({
      files: [changed('data/link-check-exceptions.ts', added)],
      bodies: { 'data/link-check-exceptions.ts': '' },
    });
    expect(findings.filter((f) => f.rule === 'unsourced-registry-row')).toEqual([]);
  });

  it('accepts a well-formed citation', () => {
    const added: Array<[number, string]> = [
      '  {',
      "    id: 'act-aloha-2023',",
      "    title: 'Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware',",
      '    year: 2023,',
      "    arxiv: '2304.13705',",
      "    url: 'https://arxiv.org/abs/2304.13705',",
      '  },',
    ].map((text, i) => [12 + i, text]);
    expect(
      reviewChanges({
        files: [changed('data/citations.ts', added)],
        bodies: { 'data/citations.ts': '' },
        currentYear: 2026,
      }),
    ).toEqual([]);
  });
});

describe('component rules', () => {
  it('flags an added input with no accessible name', () => {
    const body = [
      "'use client';",
      'export function Dial() {',
      '  return (',
      '    <input type="range" min={1} max={400} onChange={(e) => set(Number(e.target.value))} />',
      '  );',
      '}',
    ].join('\n');
    const findings = reviewChanges({
      files: [changed('components/interactive/dial.tsx', [[4, body.split('\n')[3]]])],
      bodies: { 'components/interactive/dial.tsx': body },
    });
    expect(findings.map((f) => f.rule)).toContain('control-without-accessible-name');
  });

  it('accepts an input whose aria-label sits further down a multi-line tag', () => {
    const lines = [
      "'use client';",
      'export function Dial() {',
      '  return (',
      '    <input',
      '      type="range"',
      '      onChange={(e) => set(Number(e.target.value))}',
      '      aria-label="Chunk size in steps"',
      '    />',
      '  );',
      '}',
    ];
    const findings = reviewChanges({
      files: [
        changed(
          'components/interactive/dial.tsx',
          lines.slice(3, 8).map((text, i) => [4 + i, text]),
        ),
      ],
      bodies: { 'components/interactive/dial.tsx': lines.join('\n') },
    });
    expect(findings.filter((f) => f.rule === 'control-without-accessible-name')).toEqual([]);
  });

  it('accepts an input named by a label that points at its id', () => {
    const lines = [
      '<label htmlFor="dial">Chunk size</label>',
      '<input id="dial" type="range" min={1} max={400} />',
    ];
    const findings = reviewChanges({
      files: [changed('components/interactive/dial.tsx', [[2, lines[1]]])],
      bodies: { 'components/interactive/dial.tsx': lines.join('\n') },
    });
    expect(findings.filter((f) => f.rule === 'control-without-accessible-name')).toEqual([]);
  });

  it('flags an input when an unrelated htmlFor is the only label in the file', () => {
    const lines = [
      '<label htmlFor="other">Unrelated</label>',
      '<input id="dial" type="range" min={1} max={400} />',
    ];
    const findings = reviewChanges({
      files: [changed('components/interactive/dial.tsx', [[2, lines[1]]])],
      bodies: { 'components/interactive/dial.tsx': lines.join('\n') },
    });
    expect(findings.map((f) => f.rule)).toContain('control-without-accessible-name');
  });

  it('flags an animation loop with no reduced-motion branch', () => {
    const body = ['const step = () => {', '  requestAnimationFrame(step);', '};'].join('\n');
    const findings = reviewChanges({
      files: [changed('components/interactive/loop.tsx', [[2, '  requestAnimationFrame(step);']])],
      bodies: { 'components/interactive/loop.tsx': body },
    });
    expect(
      findings.filter((f) => f.rule === 'animation-without-reduced-motion').map((f) => f.line),
    ).toEqual([2]);
  });

  it('accepts an animation loop in a file that honours reduced motion', () => {
    const body = [
      "const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;",
      'const step = () => {',
      '  if (!reduced) requestAnimationFrame(step);',
      '};',
    ].join('\n');
    const findings = reviewChanges({
      files: [
        changed('components/interactive/loop.tsx', [[3, '  if (!reduced) requestAnimationFrame(step);']]),
      ],
      bodies: { 'components/interactive/loop.tsx': body },
    });
    expect(findings.filter((f) => f.rule === 'animation-without-reduced-motion')).toEqual([]);
  });
});

describe('leftovers and copy rules', () => {
  it('blocks debugger statements and focused tests, warns on skips', () => {
    const findings = reviewChanges({
      files: [
        changed('lib/gait.ts', [[10, '  debugger;']]),
        changed('tests/unit/gait.test.ts', [
          [5, "it.only('computes duty factor', () => {"],
          [20, "it.skip('handles trot', () => {"],
        ]),
      ],
      bodies: { 'lib/gait.ts': '', 'tests/unit/gait.test.ts': '' },
    });
    expect(findings.map((f) => f.rule)).toEqual([
      'debugger-statement',
      'focused-test',
      'skipped-test',
    ]);
  });

  it('ignores leftovers that only appear in comments', () => {
    const findings = reviewChanges({
      files: [
        changed('lib/gait.ts', [
          [10, '  // debugger; left here on purpose in the docs'],
          [11, '  // console.log(duty) while debugging'],
        ]),
        changed('tests/unit/gait.test.ts', [[3, "it('keeps the suite honest', () => {}]);"]]),
      ],
      bodies: { 'lib/gait.ts': '', 'tests/unit/gait.test.ts': '' },
    });
    expect(findings).toEqual([]);
  });

  it('reads a pattern named inside a string as data, not as code', () => {
    const findings = reviewChanges({
      files: [
        changed('tests/unit/lint.test.ts', [
          [5, "const banned = 'debugger;';"],
          [6, 'expect(source).not.toContain("it.only(");'],
          [7, 'const message = `console.log( is not allowed here`;'],
        ]),
      ],
      bodies: { 'tests/unit/lint.test.ts': '' },
    });
    expect(findings).toEqual([]);
  });

  it('exempts its own sources, which spell out the patterns they hunt', () => {
    const findings = reviewChanges({
      files: [
        changed('lib/pr-review.ts', [
          [10, '  if (/\\bdebugger\\b/.test(text)) findings.push(finding);'],
          [11, "  const label = 'it.only — the focused test marker';"],
        ]),
        changed('tests/unit/pr-review.test.ts', [[20, '  debugger;']]),
      ],
      bodies: { 'lib/pr-review.ts': '', 'tests/unit/pr-review.test.ts': '' },
    });
    expect(findings).toEqual([]);
  });

  it('warns on console.log in shipped code but not in scripts', () => {
    const findings = reviewChanges({
      files: [
        changed('components/ui/card.tsx', [[7, "  console.log('render');"]]),
        changed('scripts/build-search.ts', [[9, "  console.log('search: OK');"]]),
        changed('tests/unit/card.test.ts', [[1, 'const x = 1;']]),
      ],
      bodies: {
        'components/ui/card.tsx': '',
        'scripts/build-search.ts': '',
        'tests/unit/card.test.ts': '',
      },
    });
    expect(findings.map((f) => [f.rule, f.path])).toEqual([
      ['console-log-in-shipped-code', 'components/ui/card.tsx'],
    ]);
  });

  it('flags an em dash inside a shipped string, not one in a comment', () => {
    const findings = reviewChanges({
      files: [
        changed('components/ui/stat.tsx', [
          [12, "  const label = 'Chunk size — the dial';"],
          [13, '  // the em dash — is fine in a comment'],
        ]),
      ],
      bodies: { 'components/ui/stat.tsx': '' },
    });
    expect(findings.filter((f) => f.rule === 'dash-in-ui-copy').map((f) => f.line)).toEqual([12]);
  });
});

describe('pull-request level rules', () => {
  it('asks for a test when only source files moved', () => {
    const findings = reviewChanges({
      files: [changed('lib/gait.ts', [[3, 'export const duty = 0.5;']])],
      bodies: { 'lib/gait.ts': '' },
    });
    expect(findings.map((f) => [f.rule, f.path])).toEqual([['code-change-without-test', '']]);
    expect(findings[0].message).toContain('lib/gait.ts');
  });

  it('stays quiet when the PR touches tests', () => {
    const findings = reviewChanges({
      files: [
        changed('lib/gait.ts', [[3, 'export const duty = 0.5;']]),
        changed('tests/unit/gait.test.ts', [[3, 'expect(duty).toBe(0.5);']]),
      ],
      bodies: { 'lib/gait.ts': '', 'tests/unit/gait.test.ts': '' },
    });
    expect(findings).toEqual([]);
  });

  it('notes a pull request that spans four areas and many files', () => {
    const files = [
      changed('content/frontier/a.mdx', [[BODY_START, 'Prose. <Cite id="x" />']]),
      changed('data/companies.ts', [[2, "  url: 'https://example.com',"]]),
      changed('lib/a.ts', [[1, 'export const a = 1;']]),
      changed('lib/b.ts', [[1, 'export const b = 1;']]),
      changed('components/a.tsx', [[1, 'export const A = () => null;']]),
      changed('components/b.tsx', [[1, 'export const B = () => null;']]),
      changed('app/page.tsx', [[1, 'export default function Page() {}']]),
      changed('scripts/a.ts', [[1, 'const a = 1;']]),
      changed('tests/unit/a.test.ts', [[1, 'expect(1).toBe(1);']]),
    ];
    const bodies = Object.fromEntries(files.map((file) => [file.path, '']));
    bodies['content/frontier/a.mdx'] = mdx('Prose. <Cite id="x" />');
    const findings = reviewChanges({ files, bodies });
    const note = findings.find((f) => f.rule === 'multi-scope-pull-request');
    expect(note?.severity).toBe('note');
    expect(note?.message).toContain('9 files');
  });

  it('does not count root files as their own area', () => {
    const files = [
      changed('lib/a.ts', [[1, 'export const a = 1;']]),
      changed('components/a.tsx', [[1, 'export const A = () => null;']]),
      changed('data/companies.ts', [[2, "  url: 'https://example.com',"]]),
      changed('package.json', [[3, '  "version": "0.1.1",']]),
      changed('next-env.d.ts', [[1, '/// <reference types="next" />']]),
      changed('README.md', [[1, '# robot-wiki']]),
      changed('tests/unit/a.test.ts', [[1, 'expect(1).toBe(1);']]),
      changed('tests/unit/b.test.ts', [[1, 'expect(2).toBe(2);']]),
      changed('tests/unit/c.test.ts', [[1, 'expect(3).toBe(3);']]),
    ];
    const findings = reviewChanges({
      files,
      bodies: Object.fromEntries(files.map((file) => [file.path, ''])),
    });
    expect(findings.filter((f) => f.rule === 'multi-scope-pull-request')).toEqual([]);
  });
});

describe('finding hygiene', () => {
  it('reports every rule it emits in the catalog', () => {
    const files = [
      changed('content/manipulation/action-chunking.mdx', [
        [BODY_START, 'The arm runs at 50 Hz.'],
        [BODY_START + 1, '## References'],
        [BODY_START + 2, 'Experts say it works.'],
      ]),
      changed('data/citations.ts', [
        [12, '  {'],
        [13, "    id: 'x-2031',"],
        [14, "    title: 'No identifier',"],
        [15, '    year: 2031,'],
        [16, '  },'],
      ]),
      changed('components/interactive/dial.tsx', [
        [4, '    <input type="range" />'],
        [5, '    requestAnimationFrame(step);'],
        [6, "    const label = 'a — b';"],
        [7, '    debugger;'],
      ]),
      changed('tests/e2e/dial.spec.ts', [
        [3, "it.only('renders', () => {"],
        [4, "it.skip('resets', () => {"],
      ]),
      changed('app/page.tsx', [[9, "  console.log('page');"]]),
      changed('lib/a.ts', [[1, 'export const a = 1;']]),
      changed('scripts/a.ts', [[1, 'const a = 1;']]),
      changed('public/robots.txt', [[1, 'User-agent: *']]),
    ];
    const bodies: Record<string, string> = Object.fromEntries(
      files.map((file) => [file.path, '']),
    );
    bodies['content/manipulation/action-chunking.mdx'] = mdx(
      'The arm runs at 50 Hz.',
      '## References',
      'Experts say it works.',
    );
    bodies['components/interactive/dial.tsx'] = [
      '',
      '',
      '',
      '    <input type="range" />',
      '    requestAnimationFrame(step);',
      "    const label = 'a — b';",
      '    debugger;',
    ].join('\n');
    const findings = reviewChanges({ files, bodies, currentYear: 2026 });
    const emitted = new Set(findings.map((f) => f.rule));
    expect(emitted.size).toBeGreaterThan(8);
    for (const rule of emitted) {
      expect(Object.keys(RULE_CATALOG), `${rule} is missing from RULE_CATALOG`).toContain(rule);
    }
    for (const finding of findings) {
      expect(finding.severity).toBe(RULE_CATALOG[finding.rule].severity);
      expect(finding.message.length).toBeGreaterThan(20);
    }
  });

  it('sorts blockers first, then by path and line', () => {
    const findings: ReviewFinding[] = [
      { rule: 'skipped-test', severity: 'warning', path: 'b.ts', line: 2, message: 'w' },
      { rule: 'multi-scope-pull-request', severity: 'note', path: '', message: 'n' },
      { rule: 'debugger-statement', severity: 'blocker', path: 'a.ts', line: 9, message: 'b' },
      { rule: 'skipped-test', severity: 'warning', path: 'b.ts', line: 1, message: 'w' },
    ];
    expect(sortFindings(findings).map((f) => [f.severity, f.line])).toEqual([
      ['blocker', 9],
      ['warning', 1],
      ['warning', 2],
      ['note', undefined],
    ]);
  });

  it('counts findings by severity', () => {
    expect(
      countBySeverity([
        { rule: 'debugger-statement', severity: 'blocker', path: 'a.ts', message: 'b' },
        { rule: 'skipped-test', severity: 'warning', path: 'a.ts', message: 'w' },
        { rule: 'skipped-test', severity: 'warning', path: 'b.ts', message: 'w' },
      ]),
    ).toEqual({ blocker: 1, warning: 2, note: 0 });
  });

  it('caps at a reviewable number of findings', () => {
    expect(MAX_FINDINGS).toBeGreaterThan(10);
    expect(MAX_FINDINGS).toBeLessThanOrEqual(50);
  });
});

describe('formatReviewMarkdown', () => {
  const findings: ReviewFinding[] = [
    {
      rule: 'debugger-statement',
      severity: 'blocker',
      path: 'lib/gait.ts',
      line: 12,
      message: 'debugger statement left in the diff.',
    },
    {
      rule: 'stale-last-reviewed',
      severity: 'warning',
      path: 'content/frontier/bear-case.mdx',
      message: 'Prose changed but lastReviewed did not.',
    },
    {
      rule: 'multi-scope-pull-request',
      severity: 'note',
      path: '',
      message: 'Four areas in one PR.',
    },
  ];

  it('carries the marker so a re-run can update its own comment', () => {
    expect(formatReviewMarkdown([], { files: 0, additions: 0 })).toContain(REVIEW_MARKER);
  });

  it('groups findings by severity with locations and rule ids', () => {
    const markdown = formatReviewMarkdown(findings, {
      files: 3,
      additions: 40,
      base: 'main',
      head: 'HEAD',
    });
    expect(markdown).toContain('3 finding(s) over 3 changed file(s), 40 added line(s)');
    expect(markdown).toContain('1 blocker(s), 1 warning(s), 1 note(s)');
    expect(markdown).toContain('### Blockers');
    expect(markdown).toContain('`lib/gait.ts:12`');
    expect(markdown).toContain('`content/frontier/bear-case.mdx`');
    expect(markdown).toContain('this pull request');
    expect(markdown).toContain('[debugger-statement]');
    expect(markdown).toContain('`main...HEAD`');
  });

  it('says so plainly when there is nothing to report', () => {
    const markdown = formatReviewMarkdown([], { files: 2, additions: 10 });
    expect(markdown).toContain('No findings over 2 changed file(s), 10 added line(s)');
    expect(markdown).not.toContain('### Blockers');
  });

  it('explains every rule it can report and points at the local command', () => {
    const markdown = formatReviewMarkdown(findings, { files: 1, additions: 1 });
    for (const rule of Object.keys(RULE_CATALOG)) {
      expect(markdown).toContain(`\`${rule}\``);
    }
    expect(markdown).toContain('npm run review:pr');
    expect(markdown).toContain('replaces the human review');
  });
});

describe('inlineFindings', () => {
  it('keeps only findings anchored to a line that is in the diff', () => {
    const findings: ReviewFinding[] = [
      { rule: 'debugger-statement', severity: 'blocker', path: 'lib/a.ts', line: 5, message: 'm' },
      { rule: 'debugger-statement', severity: 'blocker', path: 'lib/a.ts', line: 9, message: 'm' },
      { rule: 'stale-last-reviewed', severity: 'warning', path: 'content/a.mdx', message: 'm' },
      { rule: 'multi-scope-pull-request', severity: 'note', path: '', message: 'm' },
    ];
    expect(inlineFindings(findings, { 'lib/a.ts': [5, 6] })).toEqual([findings[0]]);
  });
});

describe('pendingInlineFindings', () => {
  const findings: ReviewFinding[] = [
    {
      rule: 'debugger-statement',
      severity: 'blocker',
      path: 'lib/a.ts',
      line: 5,
      message: 'debugger left in',
    },
  ];

  it('returns null when the review-comment list cannot be read, so the poster skips', () => {
    expect(pendingInlineFindings(findings, { 'lib/a.ts': [5] }, null, true)).toBeNull();
  });

  it('skips a finding an earlier run already marked on the same line', () => {
    const existing = [
      {
        path: 'lib/a.ts',
        line: 5,
        body: 'debugger left in\n\n`[debugger-statement]` <!-- pr-review-rule:debugger-statement -->',
      },
    ];
    expect(existingInlineKeys(existing).has('lib/a.ts:5:debugger-statement')).toBe(true);
    expect(pendingInlineFindings(findings, { 'lib/a.ts': [5] }, existing, false)).toEqual([]);
  });

  it('posts a finding that is not already on the thread', () => {
    expect(pendingInlineFindings(findings, { 'lib/a.ts': [5] }, [], false)).toEqual(findings);
  });
});

describe('githubNextLink', () => {
  it('reads rel=next from a GitHub Link header', () => {
    expect(
      githubNextLink(
        '<https://api.github.com/repos/o/r/pulls/1/comments?page=2>; rel="next", <https://api.github.com/repos/o/r/pulls/1/comments?page=3>; rel="last"',
      ),
    ).toBe('https://api.github.com/repos/o/r/pulls/1/comments?page=2');
  });

  it('is null when there is no next page', () => {
    expect(githubNextLink('<https://api.github.com/repos/o/r/pulls/1/comments?page=1>; rel="prev"')).toBe(
      null,
    );
    expect(githubNextLink(null)).toBe(null);
  });
});
