import { describe, expect, it } from 'vitest';
import {
  BROWSER_UA,
  classifyStatus,
  shouldFallbackToGet,
  type LinkStatus,
} from '@/lib/citation-links';

describe('classifyStatus', () => {
  it('treats 2xx as live', () => {
    expect(classifyStatus(200)).toBe('live');
    expect(classifyStatus(204)).toBe('live');
  });

  it('treats 404 and 410 as dead', () => {
    expect(classifyStatus(404)).toBe('dead');
    expect(classifyStatus(410)).toBe('dead');
  });

  it('treats 401/403/429 as blocked, not dead', () => {
    // Bot-walls and rate limits are not proof of link rot: a browser may
    // still reach the page, so the sweep must report these separately.
    expect(classifyStatus(401)).toBe('blocked');
    expect(classifyStatus(403)).toBe('blocked');
    expect(classifyStatus(429)).toBe('blocked');
  });

  it('treats 5xx as a transient error', () => {
    expect(classifyStatus(500)).toBe('error');
    expect(classifyStatus(503)).toBe('error');
  });

  it('treats unexpected statuses as errors', () => {
    expect(classifyStatus(418)).toBe('error');
    expect(classifyStatus(0)).toBe('error');
  });
});

describe('shouldFallbackToGet', () => {
  it('retries with GET when HEAD is not supported, bot-walled, or 5xx', () => {
    // Some servers (e.g. agibot.com) answer GET 200 but HEAD 500.
    const statuses: LinkStatus[] = [405, 501, 403, 500, 503];
    for (const status of statuses) {
      expect(shouldFallbackToGet(status)).toBe(true);
    }
  });

  it('does not retry clear answers', () => {
    expect(shouldFallbackToGet(200)).toBe(false);
    expect(shouldFallbackToGet(404)).toBe(false);
    expect(shouldFallbackToGet(429)).toBe(false);
  });
});

describe('BROWSER_UA', () => {
  it('looks like a real browser, not curl', () => {
    // papers.nips.cc 404s to a browser UA while answering a bare curl, so
    // the check must send a browser user agent to be meaningful.
    expect(BROWSER_UA).toContain('Mozilla/5.0');
    expect(BROWSER_UA).toContain('Chrome/');
    expect(BROWSER_UA).not.toContain('curl');
  });
});
