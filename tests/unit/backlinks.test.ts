import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { moduleBody } from '@/lib/references';
import {
  buildBacklinkGraph,
  internalLinkTargets,
  normalizeInternalPath,
  resolveArticleEntries,
  type LinkGraphArticle,
} from '@/lib/backlinks';
import type { ModuleRegistryEntry } from '@/data/schemas/module';

describe('normalizeInternalPath', () => {
  it('strips fragment, query and trailing slash', () => {
    expect(normalizeInternalPath('/manipulation/pi-line#section')).toBe(
      '/manipulation/pi-line',
    );
    expect(normalizeInternalPath('/manipulation/pi-line?ref=home')).toBe(
      '/manipulation/pi-line',
    );
    expect(normalizeInternalPath('/manipulation/pi-line/')).toBe(
      '/manipulation/pi-line',
    );
    expect(normalizeInternalPath('/')).toBe('/');
  });
});

describe('internalLinkTargets', () => {
  it('extracts markdown and JSX links in one pass', () => {
    const body = [
      'See [the pi line](/manipulation/pi-line) and',
      '<a href="/classical/kinematics">kinematics</a> or',
      '<Link to="/world-models/taxonomy">taxonomy</Link>.',
    ].join('\n');
    expect(internalLinkTargets(body)).toEqual([
      '/manipulation/pi-line',
      '/classical/kinematics',
      '/world-models/taxonomy',
    ]);
  });

  it('normalizes targets and dedupes repeats', () => {
    const body = [
      '[a](/manipulation/pi-line#one), [b](/manipulation/pi-line/),',
      '[c](/manipulation/pi-line?x=1).',
    ].join('\n');
    expect(internalLinkTargets(body)).toEqual(['/manipulation/pi-line']);
  });

  it('ignores external URLs and anchor-only links', () => {
    const body =
      'External [arXiv](https://arxiv.org/abs/2304.13705), [jump](#references), mail [x](mailto:a@b.c).';
    expect(internalLinkTargets(body)).toEqual([]);
  });

  it('ignores link syntax shown inside inline code and fences', () => {
    const body = [
      'Syntax example `[fake](/manipulation/pi-line)` in prose.',
      '```mdx',
      '[fake](/classical/kinematics)',
      '```',
      'Real [link](/manipulation/vla-models).',
    ].join('\n');
    expect(internalLinkTargets(body)).toEqual(['/manipulation/vla-models']);
  });
});

describe('buildBacklinkGraph', () => {
  // Fixture wiki. Registry order (the deterministic display order) is the
  // order of `orderOf`; the articles array deliberately uses a different
  // order to prove the output is sorted, not insertion-ordered.
  const orderOf = new Map<string, number>([
    ['alpha/foo', 0],
    ['beta/bar', 1],
    ['gamma/baz', 2],
    ['delta/qux', 3],
    ['omega/lonely', 4],
  ]);

  const articles: LinkGraphArticle[] = [
    {
      key: 'delta/qux',
      // Prose link AND seeAlso edge to the same target: must dedupe.
      body: 'Builds on [Foo](/alpha/foo).',
      seeAlso: ['alpha/foo', 'gamma/baz'],
    },
    {
      key: 'alpha/foo',
      body: [
        'Points at [Bar](/beta/bar) and [Baz](/gamma/baz#deep).',
        'Also the [playground](/playground) and [home](/).',
      ].join('\n'),
      seeAlso: ['delta/qux'],
    },
    {
      key: 'beta/bar',
      body: [
        'An <a href="/gamma/baz">aside to Baz</a>.',
        'A self-link [back to itself](/beta/bar) that must not backlink.',
        'External [arXiv](https://arxiv.org/abs/2304.13705).',
        'A draft target [ghost](/manipulation/ghost) that ships no page.',
      ].join('\n'),
    },
    { key: 'gamma/baz', body: 'No outbound links at all.' },
    { key: 'omega/lonely', body: 'Nobody links here.' },
  ];

  function build(): Map<string, string[]> {
    return buildBacklinkGraph(articles, (key) => orderOf.get(key) ?? 99);
  }

  it('is complete: every article that links in is listed', () => {
    const graph = build();
    expect(graph.get('beta/bar')).toEqual(['alpha/foo']);
    expect(graph.get('gamma/baz')).toEqual([
      'alpha/foo',
      'beta/bar',
      'delta/qux',
    ]);
    expect(graph.get('delta/qux')).toEqual(['alpha/foo']);
    expect(graph.get('alpha/foo')).toEqual(['delta/qux']);
  });

  it('is truthful: nothing else is listed', () => {
    const graph = build();
    // omega/lonely has no inbound links, so it has no entry at all: the
    // template renders no Linked from section for it.
    expect(graph.has('omega/lonely')).toBe(false);
    // beta/bar's self-link does not make it its own backlink.
    expect(graph.get('beta/bar')).not.toContain('beta/bar');
    // Links to non-article routes (/playground, /) and to modules outside
    // the shipped set (drafts) produce no edges.
    for (const sources of graph.values()) {
      for (const source of sources) {
        expect(orderOf.has(source)).toBe(true);
      }
    }
  });

  it('unions seeAlso edges with in-prose links', () => {
    const graph = build();
    // alpha/foo reaches delta/qux only via seeAlso; delta/qux reaches
    // gamma/baz only via seeAlso.
    expect(graph.get('delta/qux')).toContain('alpha/foo');
    expect(graph.get('gamma/baz')).toContain('delta/qux');
  });

  it('dedupes an article linked both in prose and via seeAlso', () => {
    const graph = build();
    const sources = graph.get('alpha/foo') ?? [];
    expect(sources.filter((s) => s === 'delta/qux')).toHaveLength(1);
  });

  it('orders sources by registry position, deterministically', () => {
    const graph = build();
    // Insertion order into gamma/baz was delta, alpha, beta; registry
    // order is alpha (0), beta (1), delta (3).
    expect(graph.get('gamma/baz')).toEqual([
      'alpha/foo',
      'beta/bar',
      'delta/qux',
    ]);
    // Rebuilding from the same input yields the identical graph.
    expect([...build().entries()]).toEqual([...graph.entries()]);
  });

  it('treats a missing seeAlso list as empty', () => {
    const graph = buildBacklinkGraph(
      [
        { key: 'alpha/foo', body: 'Links to [Bar](/beta/bar).' },
        { key: 'beta/bar', body: 'Nothing.' },
      ],
      (key) => (key === 'alpha/foo' ? 0 : 1),
    );
    expect(graph.get('beta/bar')).toEqual(['alpha/foo']);
  });
});

describe('resolveArticleEntries', () => {
  const registry: ModuleRegistryEntry[] = [
    {
      domain: 'manipulation',
      slug: 'action-chunking',
      title: 'Action Chunking (ACT and ALOHA)',
      summary: 'Predicting action sequences instead of single steps.',
      order: 2,
      status: 'published',
    },
    {
      domain: 'classical',
      slug: 'kinematics',
      title: 'Kinematics',
      summary: 'Forward and inverse kinematics.',
      order: 1,
      status: 'published',
    },
  ];

  it('maps registry keys to route, title and summary, keeping order', () => {
    const entries = resolveArticleEntries(
      ['classical/kinematics', 'manipulation/action-chunking'],
      registry,
    );
    expect(entries).toEqual([
      {
        key: 'classical/kinematics',
        href: '/classical/kinematics',
        title: 'Kinematics',
        summary: 'Forward and inverse kinematics.',
      },
      {
        key: 'manipulation/action-chunking',
        href: '/manipulation/action-chunking',
        title: 'Action Chunking (ACT and ALOHA)',
        summary: 'Predicting action sequences instead of single steps.',
      },
    ]);
  });

  it('skips unknown keys rather than inventing entries', () => {
    const entries = resolveArticleEntries(
      ['classical/kinematics', 'nowhere/ghost'],
      registry,
    );
    expect(entries.map((e) => e.key)).toEqual(['classical/kinematics']);
  });

  it('dedupes repeated keys', () => {
    const entries = resolveArticleEntries(
      ['classical/kinematics', 'classical/kinematics'],
      registry,
    );
    expect(entries).toHaveLength(1);
  });
});

describe('shipped content: action-chunking cross-references (VAL-CROSS-006)', () => {
  // The contract requires in-prose links (not glossary anchors, not
  // seeAlso-only edges) from action-chunking to both manipulation
  // siblings. Source-level guard so the fast suite catches a prose edit
  // that drops a link before the e2e does.
  const body = moduleBody(
    readFileSync(
      join(process.cwd(), 'content/manipulation/action-chunking.mdx'),
      'utf8',
    ),
  );

  it('links diffusion-policy in prose', () => {
    expect(internalLinkTargets(body)).toContain(
      '/manipulation/diffusion-policy',
    );
  });

  it('links pi-line in prose', () => {
    expect(internalLinkTargets(body)).toContain('/manipulation/pi-line');
  });
});
