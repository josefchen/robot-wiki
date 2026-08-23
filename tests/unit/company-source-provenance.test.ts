import { describe, expect, it } from 'vitest';
import { roundSourceMembershipIssues } from '@/lib/company-source-provenance';

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
});
