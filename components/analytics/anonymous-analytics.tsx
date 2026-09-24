'use client';

import {
  Analytics,
  type BeforeSendEvent,
} from '@vercel/analytics/next';

/**
 * Vercel's page-view event normally carries the current URL. Robot Wiki's
 * internal search uses `?q=...`, which can contain text a visitor did not
 * intend to disclose. Reduce every event URL to origin + pathname before it
 * leaves the browser and reject non-http URLs entirely.
 */
export function redactAnalyticsEvent(
  event: BeforeSendEvent,
  baseUrl = 'https://robot-wiki.com',
): BeforeSendEvent | null {
  try {
    const url = new URL(event.url, baseUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return { ...event, url: `${url.origin}${url.pathname}` };
  } catch {
    return null;
  }
}

export function AnonymousAnalytics() {
  return <Analytics beforeSend={redactAnalyticsEvent} />;
}
