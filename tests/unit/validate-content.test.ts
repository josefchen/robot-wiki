import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { validateContent } from '@/lib/validate-content';
import { modules } from '@/data/modules';
import { CITATIONS } from '@/data/citations';
import type { ModuleRegistryEntry } from '@/data/schemas/module';
import type { Citation } from '@/data/schemas/citation';

const registry: ModuleRegistryEntry[] = [
  {
    domain: 'manipulation',
    slug: 'action-chunking',
    title: 'Action Chunking',
    summary: 'Chunked actions.',
    order: 1,
    status: 'published',
  },
  {
    domain: 'manipulation',
    slug: 'diffusion-policy',
    title: 'Diffusion Policy',
    summary: 'Denoising actions.',
    order: 2,
    status: 'draft',
  },
  // Registry-level invariant: every core domain must be populated.
  ...(['rl-sim2real', 'world-models', 'data-hardware', 'classical', 'frontier'] as const).map(
    (domain) => ({
      domain,
      slug: 'placeholder',
      title: 'Placeholder',
      summary: 'Planned module.',
      order: 1,
      status: 'draft' as const,
    }),
  ),
];

const citations: Citation[] = [
  {
    id: 'act-aloha-2023',
    title: 'Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware',
    authors: ['Tony Z. Zhao', 'Vikash Kumar', 'Sergey Levine', 'Chelsea Finn'],
    year: 2023,
    arxiv: '2304.13705',
    url: 'https://arxiv.org/abs/2304.13705',
    type: 'paper',
  },
  {
    id: 'dagger-2011',
    title:
      'A Reduction of Imitation Learning and Structured Prediction to No-Regret Online Learning',
    authors: ['Stéphane Ross', 'Geoffrey J. Gordon', 'J. Andrew Bagnell'],
    year: 2011,
    venue: 'AISTATS 2011',
    arxiv: '1011.0686',
    url: 'https://arxiv.org/abs/1011.0686',
    type: 'paper',
  },
];

function frontmatter(overrides: Record<string, unknown> = {}): string {
  const fm = {
    title: 'Action Chunking',
    description: 'Predicting action sequences instead of single steps.',
    domain: 'manipulation',
    slug: 'action-chunking',
    order: 1,
    status: 'published',
    lastReviewed: '2026-08-07',
    citations: ['act-aloha-2023'],
    ...overrides,
  };
  const lines = Object.entries(fm).map(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length === 0) return `${key}: []`;
      return `${key}:\n${value.map((v) => `  - ${v}`).join('\n')}`;
    }
    if (typeof value === 'number') return `${key}: ${value}`;
    return `${key}: "${value}"`;
  });
  return `---\n${lines.join('\n')}\n---\n`;
}

describe('validateContent (fixtures)', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'robot-wiki-content-'));
    mkdirSync(join(root, 'manipulation'), { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function writeModule(domain: string, slug: string, source: string) {
    mkdirSync(join(root, domain), { recursive: true });
    writeFileSync(join(root, domain, `${slug}.mdx`), source);
  }

  function run(extra: Partial<Parameters<typeof validateContent>[0]> = {}) {
    return validateContent({
      contentRoot: root,
      modules: registry,
      citations,
      ...extra,
    });
  }

  it('passes a valid published module', () => {
    writeModule(
      'manipulation',
      'action-chunking',
      `${frontmatter()}\nChunking shrinks the horizon <Cite id="act-aloha-2023" />.\n`,
    );
    expect(run()).toEqual([]);
  });

  it('fails on a missing citation id', () => {
    writeModule(
      'manipulation',
      'action-chunking',
      `${frontmatter({ citations: ['no-such-paper'] })}\nBody.\n`,
    );
    const issues = run();
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.map((i) => i.message).join('\n')).toContain('no-such-paper');
  });

  it('fails on invalid frontmatter', () => {
    writeModule(
      'manipulation',
      'action-chunking',
      `${frontmatter({ status: 'wip' })}\nBody.\n`,
    );
    expect(run().length).toBeGreaterThan(0);
  });

  it('fails on a broken internal markdown link', () => {
    writeModule(
      'manipulation',
      'action-chunking',
      `${frontmatter()}\nSee [the fake module](/manipulation/no-such-module).\n`,
    );
    const issues = run();
    expect(issues.map((i) => i.message).join('\n')).toContain(
      '/manipulation/no-such-module',
    );
  });

  it('fails on a broken internal JSX href', () => {
    writeModule(
      'manipulation',
      'action-chunking',
      `${frontmatter()}\n<a href="/rl-sim2real/nope">bad</a>\n`,
    );
    expect(run().length).toBeGreaterThan(0);
  });

  it('accepts links to declared static routes and to published modules', () => {
    writeModule(
      'manipulation',
      'action-chunking',
      `${frontmatter()}\n[home](/) and [search](/search) and [self](/manipulation/action-chunking) and [arxiv](https://arxiv.org/abs/2304.13705).\n`,
    );
    expect(run()).toEqual([]);
  });

  it('fails when a published registry entry has no content file', () => {
    expect(
      run().map((i) => i.message).join('\n'),
    ).toContain('action-chunking');
  });

  it('fails when a published module declares no citations', () => {
    writeModule(
      'manipulation',
      'action-chunking',
      `${frontmatter({ citations: [] })}\nBody.\n`,
    );
    expect(
      run().map((i) => i.message).join('\n'),
    ).toContain('citation');
  });

  it('fails when frontmatter and registry disagree on status', () => {
    writeModule(
      'manipulation',
      'action-chunking',
      `${frontmatter({ status: 'draft', citations: [] })}\nBody.\n`,
    );
    expect(
      run().map((i) => i.message).join('\n'),
    ).toContain('status');
  });

  it('fails on an orphan content file with no registry entry', () => {
    writeModule(
      'manipulation',
      'action-chunking',
      `${frontmatter()}\nBody.\n`,
    );
    writeModule(
      'manipulation',
      'ghost-module',
      `${frontmatter({ slug: 'ghost-module', order: 99, status: 'draft', citations: [] })}\nBody.\n`,
    );
    expect(run().map((i) => i.message).join('\n')).toContain('ghost-module');
  });

  it('allows a draft module to ship a content file without citations', () => {
    writeModule(
      'manipulation',
      'action-chunking',
      `${frontmatter()}\nBody.\n`,
    );
    writeModule(
      'manipulation',
      'diffusion-policy',
      `${frontmatter({
        title: 'Diffusion Policy',
        slug: 'diffusion-policy',
        order: 2,
        status: 'draft',
        citations: [],
      })}\nWork in progress.\n`,
    );
    expect(run()).toEqual([]);
  });
});

describe('validateContent inline citation declaration (VAL-WIKI-005)', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'robot-wiki-cites-'));
    mkdirSync(join(root, 'manipulation'), { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function writeModule(source: string) {
    writeFileSync(join(root, 'manipulation', 'action-chunking.mdx'), source);
  }

  function issues() {
    return validateContent({ contentRoot: root, modules: registry, citations });
  }

  it('fails when prose cites a registry id the frontmatter does not declare', () => {
    // dagger-2011 exists in the registry but is missing from this module's
    // frontmatter citations list: the chip would render with no References
    // entry, so the build must fail and name the article and the id.
    writeModule(
      `${frontmatter()}\nDAgger relabels the visited states <Cite id="dagger-2011" />.\n`,
    );
    const found = issues();
    expect(found.length).toBeGreaterThan(0);
    const offense = found.find((i) => i.message.includes('dagger-2011'));
    expect(offense).toBeDefined();
    expect(offense?.file).toBe('manipulation/action-chunking.mdx');
    expect(offense?.message).toMatch(/not declared|undeclared/i);
  });

  it('fails for every undeclared id when there are several', () => {
    writeModule(
      `${frontmatter({ citations: [] })}\n<Cite id="dagger-2011" /> and <Cite id="act-aloha-2023" />.\n`,
    );
    const messages = issues()
      .filter((i) => /not declared|undeclared/i.test(i.message))
      .map((i) => i.message)
      .join('\n');
    expect(messages).toContain('dagger-2011');
    expect(messages).toContain('act-aloha-2023');
  });

  it('passes when every inline cite is declared in frontmatter', () => {
    writeModule(
      `${frontmatter({
        citations: ['act-aloha-2023', 'dagger-2011'],
      })}\nChunking <Cite id="act-aloha-2023" /> beats compounding <Cite id="dagger-2011" />.\n`,
    );
    expect(
      issues().filter((i) => /not declared|undeclared/i.test(i.message)),
    ).toEqual([]);
  });

  it('ignores cite syntax shown inside code spans and fences', () => {
    writeModule(
      `${frontmatter()}\nAuthors write \`<Cite id="dagger-2011" />\` like so:\n\n\`\`\`mdx\n<Cite id="dagger-2011" />\n\`\`\`\n`,
    );
    expect(
      issues().filter((i) => /not declared|undeclared/i.test(i.message)),
    ).toEqual([]);
  });
});

describe('validateContent seeAlso resolution (VAL-WIKI-009, VAL-WIKI-010)', () => {
  // Extended registry: two more published modules to serve as valid
  // seeAlso targets; the base registry's diffusion-policy stays a draft,
  // which is what the draft-target test points at.
  const seeAlsoRegistry: ModuleRegistryEntry[] = [
    ...registry,
    {
      domain: 'manipulation',
      slug: 'bc-foundations',
      title: 'Behavior Cloning Foundations',
      summary: 'Covariate shift and compounding error.',
      order: 3,
      status: 'published',
    },
    {
      domain: 'manipulation',
      slug: 'realtime-execution',
      title: 'Real-Time Execution',
      summary: 'Temporal ensembling and latency budgets.',
      order: 4,
      status: 'published',
    },
  ];

  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'robot-wiki-seealso-'));
    mkdirSync(join(root, 'manipulation'), { recursive: true });
    // Check 3 requires a content file for every published registry entry,
    // and check 4 requires its frontmatter to match the registry, so the
    // two extra seeAlso targets ship fixture files. That keeps every
    // assertion below focused on seeAlso violations only.
    writeTarget('bc-foundations', 'Behavior Cloning Foundations', 3);
    writeTarget('realtime-execution', 'Real-Time Execution', 4);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function writeModule(source: string) {
    writeFileSync(join(root, 'manipulation', 'action-chunking.mdx'), source);
  }

  function writeTarget(slug: string, title: string, order: number) {
    writeFileSync(
      join(root, 'manipulation', `${slug}.mdx`),
      `${frontmatter({ title, slug, order, citations: ['dagger-2011'] })}\nBody.\n`,
    );
  }

  function issues() {
    return validateContent({
      contentRoot: root,
      modules: seeAlsoRegistry,
      citations,
    });
  }

  function seeAlsoIssues(): string {
    return issues()
      .map((i) => `${i.file}: ${i.message}`)
      .join('\n');
  }

  it('passes when every seeAlso entry resolves to a published module', () => {
    writeModule(
      `${frontmatter({
        seeAlso: [
          'manipulation/bc-foundations',
          'manipulation/realtime-execution',
        ],
      })}\nBody.\n`,
    );
    expect(seeAlsoIssues()).toBe('');
  });

  it('fails on an unresolvable seeAlso id, naming the article and the id', () => {
    writeModule(
      `${frontmatter({
        seeAlso: ['manipulation/bc-foundations', 'manipulation/does-not-exist'],
      })}\nBody.\n`,
    );
    const found = issues();
    expect(found.length).toBeGreaterThan(0);
    const offense = found.find((i) => i.message.includes('does-not-exist'));
    expect(offense).toBeDefined();
    expect(offense?.file).toBe('manipulation/action-chunking.mdx');
    expect(offense?.message).toMatch(/seeAlso/);
    expect(offense?.message).toMatch(/registry/);
  });

  it('fails on a seeAlso id pointing at a draft module', () => {
    writeModule(
      `${frontmatter({
        seeAlso: ['manipulation/bc-foundations', 'manipulation/diffusion-policy'],
      })}\nBody.\n`,
    );
    const found = issues();
    const offense = found.find((i) =>
      i.message.includes('diffusion-policy'),
    );
    expect(offense).toBeDefined();
    expect(offense?.file).toBe('manipulation/action-chunking.mdx');
    expect(offense?.message).toMatch(/draft/);
  });

  it('fails on a self-referential seeAlso entry, naming the article', () => {
    writeModule(
      `${frontmatter({
        seeAlso: ['manipulation/bc-foundations', 'manipulation/action-chunking'],
      })}\nBody.\n`,
    );
    const found = issues();
    const offense = found.find((i) => /itself|self/.test(i.message));
    expect(offense).toBeDefined();
    expect(offense?.file).toBe('manipulation/action-chunking.mdx');
    expect(offense?.message).toContain('manipulation/action-chunking');
  });

  it('fails on duplicate seeAlso entries', () => {
    writeModule(
      `${frontmatter({
        seeAlso: ['manipulation/bc-foundations', 'manipulation/bc-foundations'],
      })}\nBody.\n`,
    );
    expect(seeAlsoIssues()).toMatch(/duplicate/i);
  });
});

describe('validateContent currency hygiene (remark-math gotcha)', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'robot-wiki-currency-'));
    mkdirSync(join(root, 'manipulation'), { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function writeModule(source: string) {
    writeFileSync(join(root, 'manipulation', 'action-chunking.mdx'), source);
  }

  function run() {
    return validateContent({ contentRoot: root, modules: registry, citations });
  }

  function messages(): string {
    return run()
      .map((i) => i.message)
      .join('\n');
  }

  it('fails on unescaped currency dollar signs in prose', () => {
    writeModule(
      `${frontmatter()}\nThe round cost $1.4B at a valuation above $14B.\n`,
    );
    expect(messages()).toContain('currency');
  });

  it('reports the line number of the offense', () => {
    writeModule(`${frontmatter()}\nFirst line is clean.\nIt cost $269.\n`);
    expect(messages()).toContain('line 3');
  });

  it('passes escaped currency (backslash-dollar)', () => {
    writeModule(
      `${frontmatter()}\nThe round cost \\$1.4B at a valuation above \\$14B.\n`,
    );
    expect(run()).toEqual([]);
  });

  it('passes real inline and display math', () => {
    writeModule(
      `${frontmatter()}\nThe bound is $O(\\varepsilon T^2)$ and:\n\n$$\nx_{k+1} = f(x_k)\n$$\n`,
    );
    expect(run()).toEqual([]);
  });

  it('ignores currency inside inline code spans', () => {
    writeModule(`${frontmatter()}\nThe shell sees \`$1.00\` as a variable.\n`);
    expect(run()).toEqual([]);
  });

  it('ignores currency inside fenced code blocks', () => {
    writeModule(`${frontmatter()}\n\`\`\`bash\necho $1.00\n\`\`\`\n`);
    expect(run()).toEqual([]);
  });

  it('ignores currency inside JSX attribute strings', () => {
    writeModule(`${frontmatter()}\n<Stat label="seed" value="$1.03B" note="March 2026" />\n`);
    expect(run()).toEqual([]);
  });

  it('flags currency in JSX children text, which remark-math does see', () => {
    writeModule(`${frontmatter()}\n<Callout>It cost $5 million.</Callout>\n`);
    expect(messages()).toContain('currency');
  });
});

describe('validateContent (real repo)', () => {
  it('passes on the shipped content tree', () => {
    const issues = validateContent({
      contentRoot: join(import.meta.dirname, '..', '..', 'content'),
      publicDir: join(import.meta.dirname, '..', '..', 'public'),
      modules,
      citations: CITATIONS,
    });
    expect(issues.map((i) => `${i.file}: ${i.message}`)).toEqual([]);
  });
});
