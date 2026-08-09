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
    root = mkdtempSync(join(tmpdir(), 'robot-atlas-content-'));
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

describe('validateContent currency hygiene (remark-math gotcha)', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'robot-atlas-currency-'));
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
