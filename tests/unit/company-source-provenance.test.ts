import { describe, expect, it } from 'vitest';
import { roundSourceMembershipIssues } from '@/lib/company-source-provenance';
import { timelineEvents } from '@/lib/market-map';
import type { Company } from '@/data/schemas/company';

function timelineCompany(sourceUrl?: string): Company {
  return {
    id: 'round-source-plant',
    name: 'Round Source Plant',
    aka: [],
    website: null,
    logo: null,
    hq: { city: null, country: 'US' },
    founded: 2024,
    segment: 'foundation-models',
    subSegment: null,
    description: 'Unit-test fixture for funding-round source resolution.',
    approach: [],
    totalRaisedUsd: null,
    latestRound: {
      type: 'Seed',
      amountUsd: 1_000_000,
      date: '2025-01-15',
      valuationUsd: null,
      leadInvestors: [],
      ...(sourceUrl ? { sourceUrl } : {}),
    },
    status: 'private',
    deployments: [],
    openSource: [],
    sources: [
      {
        url: 'https://example.com/fallback',
        title: 'Fallback source',
        asOf: '2026-08-24',
      },
      {
        url: 'https://example.com/explicit',
        title: 'Explicit source',
        asOf: '2026-08-24',
      },
    ],
    confidence: 'high',
  };
}

describe('roundSourceMembershipIssues', () => {
  it('accepts an absent pointer and a pointer to the company source list', () => {
    expect(
      roundSourceMembershipIssues([
        {
          id: 'fallback',
          latestRound: {},
          sources: [{ url: 'https://example.com/fallback' }],
        },
        {
          id: 'linked',
          latestRound: { sourceUrl: 'https://example.com/linked' },
          sources: [
            { url: 'https://example.com/old' },
            { url: 'https://example.com/linked' },
          ],
        },
      ]),
    ).toEqual([]);
  });

  it('rejects a round pointer outside the company source list', () => {
    expect(
      roundSourceMembershipIssues([
        {
          id: 'bad-pointer',
          latestRound: { sourceUrl: 'https://example.com/not-owned' },
          sources: [{ url: 'https://example.com/owned' }],
        },
      ]),
    ).toEqual([
      'bad-pointer: latestRound.sourceUrl https://example.com/not-owned is not present in sources[]',
    ]);
  });

  it('rejects a malformed pointer without letting renderer logic erase the event', () => {
    const company = timelineCompany('https://example.com/not-owned');

    expect(roundSourceMembershipIssues([company])).toEqual([
      'round-source-plant: latestRound.sourceUrl https://example.com/not-owned is not present in sources[]',
    ]);
    expect(timelineEvents([company])).toEqual([
      expect.objectContaining({
        companyId: 'round-source-plant',
        sourceUrl: 'https://example.com/fallback',
        sourceTitle: 'Fallback source',
      }),
    ]);
  });

  it('prefers a valid explicit pointer over the first source', () => {
    expect(
      timelineEvents([timelineCompany('https://example.com/explicit')]),
    ).toEqual([
      expect.objectContaining({
        sourceUrl: 'https://example.com/explicit',
        sourceTitle: 'Explicit source',
      }),
    ]);
  });

  it('uses the first source when the round has no explicit pointer', () => {
    expect(timelineEvents([timelineCompany()])).toEqual([
      expect.objectContaining({
        sourceUrl: 'https://example.com/fallback',
        sourceTitle: 'Fallback source',
      }),
    ]);
  });
});
