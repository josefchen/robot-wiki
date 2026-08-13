import { describe, expect, it } from 'vitest';
import { citationSchema } from '@/data/schemas/citation';
import {
  CORE_DOMAINS,
  DOMAINS,
  domainSchema,
  moduleFrontmatterSchema,
  moduleRegistryEntrySchema,
} from '@/data/schemas/module';
import { companySchema } from '@/data/schemas/company';
import { methodSchema } from '@/data/schemas/method';
import { datasetSchema } from '@/data/schemas/dataset';

describe('domain taxonomy', () => {
  it('defines exactly six core domains', () => {
    expect(CORE_DOMAINS).toHaveLength(6);
    expect(CORE_DOMAINS).toEqual([
      'manipulation',
      'rl-sim2real',
      'world-models',
      'data-hardware',
      'classical',
      'frontier',
    ]);
  });

  it('adds the adjacent group on top of the six core domains', () => {
    expect(DOMAINS).toHaveLength(7);
    expect(DOMAINS).toContain('adjacent');
  });

  it('rejects unknown domains', () => {
    expect(domainSchema.safeParse('underwater').success).toBe(false);
  });
});

describe('moduleFrontmatterSchema', () => {
  const valid = {
    title: 'Action Chunking (ACT and ALOHA)',
    description: 'Predicting action sequences instead of single steps.',
    domain: 'manipulation',
    slug: 'action-chunking',
    order: 2,
    status: 'published',
    lastReviewed: '2026-08-07',
    citations: ['act-aloha-2023'],
  };

  it('accepts valid frontmatter', () => {
    const parsed = moduleFrontmatterSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('rejects an invalid status', () => {
    expect(
      moduleFrontmatterSchema.safeParse({ ...valid, status: 'wip' }).success,
    ).toBe(false);
  });

  it('rejects a slug with uppercase or spaces', () => {
    expect(
      moduleFrontmatterSchema.safeParse({ ...valid, slug: 'Action Chunking' })
        .success,
    ).toBe(false);
  });

  it('rejects a non-ISO lastReviewed date', () => {
    expect(
      moduleFrontmatterSchema.safeParse({ ...valid, lastReviewed: 'Aug 7 2026' })
        .success,
    ).toBe(false);
  });

  it('rejects missing citations field', () => {
    const rest: Record<string, unknown> = { ...valid };
    delete rest.citations;
    expect(moduleFrontmatterSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a missing description', () => {
    const rest: Record<string, unknown> = { ...valid };
    delete rest.description;
    expect(moduleFrontmatterSchema.safeParse(rest).success).toBe(false);
  });

  it('accepts frontmatter without seeAlso (optional until backfill)', () => {
    expect(moduleFrontmatterSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a seeAlso list of 2 to 4 registry keys', () => {
    for (const count of [2, 3, 4]) {
      const seeAlso = Array.from(
        { length: count },
        (_, i) => `manipulation/related-${i + 1}`,
      );
      const parsed = moduleFrontmatterSchema.safeParse({ ...valid, seeAlso });
      expect(parsed.success, `count ${count}`).toBe(true);
    }
  });

  it('rejects a seeAlso list with a single entry', () => {
    const parsed = moduleFrontmatterSchema.safeParse({
      ...valid,
      seeAlso: ['manipulation/related-1'],
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a seeAlso list with more than four entries', () => {
    const seeAlso = Array.from(
      { length: 5 },
      (_, i) => `manipulation/related-${i + 1}`,
    );
    expect(moduleFrontmatterSchema.safeParse({ ...valid, seeAlso }).success).toBe(
      false,
    );
  });

  it('rejects empty-string seeAlso entries', () => {
    expect(
      moduleFrontmatterSchema.safeParse({
        ...valid,
        seeAlso: ['manipulation/related-1', ''],
      }).success,
    ).toBe(false);
  });
});

describe('moduleRegistryEntrySchema', () => {
  it('accepts a valid registry entry', () => {
    expect(
      moduleRegistryEntrySchema.safeParse({
        domain: 'classical',
        slug: 'kinematics',
        title: 'Kinematics',
        summary: 'Forward and inverse kinematics, DH parameters, Jacobians.',
        order: 1,
        status: 'draft',
      }).success,
    ).toBe(true);
  });

  it('rejects a non-positive order', () => {
    expect(
      moduleRegistryEntrySchema.safeParse({
        domain: 'classical',
        slug: 'kinematics',
        title: 'Kinematics',
        summary: 'x',
        order: 0,
        status: 'draft',
      }).success,
    ).toBe(false);
  });
});

describe('citationSchema', () => {
  const valid = {
    id: 'act-aloha-2023',
    title: 'Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware',
    authors: ['Tony Z. Zhao', 'Vikash Kumar', 'Sergey Levine', 'Chelsea Finn'],
    year: 2023,
    venue: 'RSS 2023',
    arxiv: '2304.13705',
    url: 'https://arxiv.org/abs/2304.13705',
    type: 'paper',
  };

  it('accepts a valid paper citation', () => {
    expect(citationSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a malformed arXiv id', () => {
    expect(
      citationSchema.safeParse({ ...valid, arxiv: '230413705' }).success,
    ).toBe(false);
  });

  it('rejects a non-https url', () => {
    expect(
      citationSchema.safeParse({ ...valid, url: 'http://arxiv.org/abs/2304.13705' })
        .success,
    ).toBe(false);
  });

  it('rejects an empty author list', () => {
    expect(citationSchema.safeParse({ ...valid, authors: [] }).success).toBe(
      false,
    );
  });

  it('accepts blog/docs/press types', () => {
    for (const type of ['blog', 'docs', 'press']) {
      expect(citationSchema.safeParse({ ...valid, type }).success).toBe(true);
    }
    expect(citationSchema.safeParse({ ...valid, type: 'tweet' }).success).toBe(
      false,
    );
  });
});

describe('companySchema', () => {
  const valid = {
    id: 'physical-intelligence',
    name: 'Physical Intelligence',
    aka: ['Pi'],
    hq: { city: 'San Francisco', country: 'US' },
    founded: 2024,
    segment: 'foundation-models',
    subSegment: 'generalist-manipulation-policies',
    description: 'Builds general-purpose vision-language-action models.',
    approach: ['vla', 'flow-matching-action-expert'],
    totalRaisedUsd: 1670000000,
    latestRound: {
      type: 'Series B',
      amountUsd: 600000000,
      date: '2025-11-20',
      valuationUsd: 5600000000,
      leadInvestors: ['CapitalG'],
    },
    status: 'private',
    deployments: ['Pilot deployments across multiple robot embodiments'],
    openSource: ['openpi'],
    sources: [
      {
        url: 'https://www.pi.website/blog/pistar06',
        title: 'pi*0.6 blog post',
        asOf: '2026-08-06',
      },
    ],
    confidence: 'high',
  };

  it('accepts a valid company', () => {
    expect(companySchema.safeParse(valid).success).toBe(true);
  });

  it('allows null for unknown funding figures (never invented data)', () => {
    const parsed = companySchema.safeParse({
      ...valid,
      totalRaisedUsd: null,
      latestRound: null,
    });
    expect(parsed.success).toBe(true);
  });

  it('allows a latest-round object whose type is undisclosed', () => {
    const parsed = companySchema.safeParse({
      ...valid,
      latestRound: {
        type: null,
        amountUsd: null,
        date: null,
        valuationUsd: null,
        leadInvestors: [],
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('requires at least one source', () => {
    expect(companySchema.safeParse({ ...valid, sources: [] }).success).toBe(
      false,
    );
  });

  it('rejects an unknown segment', () => {
    expect(
      companySchema.safeParse({ ...valid, segment: 'underwater-robots' })
        .success,
    ).toBe(false);
  });

  it('rejects an unknown status', () => {
    expect(
      companySchema.safeParse({ ...valid, status: 'stealth' }).success,
    ).toBe(false);
  });

  it('rejects an invalid confidence level', () => {
    expect(
      companySchema.safeParse({ ...valid, confidence: 'guessed' }).success,
    ).toBe(false);
  });
});

describe('methodSchema', () => {
  const valid = {
    id: 'act',
    name: 'ACT',
    year: 2023,
    actionRepresentation: 'continuous',
    actionHorizon: { planned: 100, executed: 1 },
    controlFrequencyHz: 50,
    backbone: 'ResNet18 x4 + transformer encoder/decoder',
    conditioning: ['images', 'joint-state'],
    crossEmbodiment: 'no',
    hierarchy: 'none',
    openWeights: true,
    sources: ['act-aloha-2023'],
  };

  it('accepts a valid method row', () => {
    expect(methodSchema.safeParse(valid).success).toBe(true);
  });

  it('allows null for undisclosed architecture details', () => {
    const parsed = methodSchema.safeParse({
      ...valid,
      backbone: null,
      controlFrequencyHz: null,
      actionHorizon: { planned: null, executed: null },
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects an action representation outside the matrix axes', () => {
    expect(
      methodSchema.safeParse({ ...valid, actionRepresentation: 'magic' })
        .success,
    ).toBe(false);
  });

  it('requires at least one source citation id', () => {
    expect(methodSchema.safeParse({ ...valid, sources: [] }).success).toBe(
      false,
    );
  });
});

describe('datasetSchema', () => {
  const valid = {
    id: 'open-x-embodiment',
    name: 'Open X-Embodiment',
    year: 2023,
    episodes: 1000000,
    hours: null,
    tasks: 527,
    scenes: null,
    embodimentCount: 3,
    embodiments: ['franka', 'xarm', 'widowx'],
    license: 'CC-BY-4.0',
    url: 'https://robotics-transformer-x.github.io/',
    sources: ['oxe-2023'],
  };

  it('accepts a valid dataset row', () => {
    expect(datasetSchema.safeParse(valid).success).toBe(true);
  });

  it('allows null for unknown size numbers', () => {
    expect(
      datasetSchema.safeParse({ ...valid, episodes: null, tasks: null })
        .success,
    ).toBe(true);
  });

  it('requires at least one source', () => {
    expect(datasetSchema.safeParse({ ...valid, sources: [] }).success).toBe(
      false,
    );
  });

  it('rejects a non-https url', () => {
    expect(
      datasetSchema.safeParse({ ...valid, url: 'http://example.com' }).success,
    ).toBe(false);
  });
});
