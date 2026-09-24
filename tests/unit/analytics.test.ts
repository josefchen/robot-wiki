import { describe, expect, it } from 'vitest';
import { redactAnalyticsEvent } from '@/components/analytics/anonymous-analytics';
import {
  allowIndexingForEnvironment,
  enableAnalyticsForEnvironment,
} from '@/lib/site';

describe('anonymous analytics', () => {
  it('removes query strings and fragments while preserving the event type', () => {
    expect(
      redactAnalyticsEvent({
        type: 'pageview',
        url: 'https://robot-wiki.com/search/?q=private+phrase#results',
      }),
    ).toEqual({
      type: 'pageview',
      url: 'https://robot-wiki.com/search/',
    });
  });

  it('resolves relative event URLs against the canonical origin', () => {
    expect(
      redactAnalyticsEvent({
        type: 'event',
        url: '/classical/kinematics/?source=newsletter',
      }),
    ).toEqual({
      type: 'event',
      url: 'https://robot-wiki.com/classical/kinematics/',
    });
  });

  it('rejects malformed and non-http URLs', () => {
    expect(
      redactAnalyticsEvent({ type: 'pageview', url: 'javascript:alert(1)' }),
    ).toBeNull();
    expect(
      redactAnalyticsEvent(
        { type: 'pageview', url: 'http://[invalid' },
        'also invalid',
      ),
    ).toBeNull();
  });
});

describe('deployment environment policy', () => {
  it('blocks indexing on Vercel previews but permits production and local builds', () => {
    expect(allowIndexingForEnvironment('preview')).toBe(false);
    expect(allowIndexingForEnvironment('production')).toBe(true);
    expect(allowIndexingForEnvironment('development')).toBe(true);
    expect(allowIndexingForEnvironment(undefined)).toBe(true);
  });

  it('enables analytics only in production', () => {
    expect(enableAnalyticsForEnvironment('production')).toBe(true);
    expect(enableAnalyticsForEnvironment('preview')).toBe(false);
    expect(enableAnalyticsForEnvironment('development')).toBe(false);
    expect(enableAnalyticsForEnvironment(undefined)).toBe(false);
  });
});
