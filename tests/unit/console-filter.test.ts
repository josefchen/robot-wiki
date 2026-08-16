import { describe, expect, it } from 'vitest';
import {
  ABORTED_REQUEST,
  isBenignRequestFailure,
} from '@/tests/e2e/helpers/console';

describe('isBenignRequestFailure', () => {
  it('filters the App Router prefetch cancel (net::ERR_ABORTED)', () => {
    expect(isBenignRequestFailure(ABORTED_REQUEST)).toBe(true);
    expect(isBenignRequestFailure('net::ERR_ABORTED')).toBe(true);
  });

  it('does not filter real network failures', () => {
    for (const errorText of [
      'net::ERR_FAILED',
      'net::ERR_CONNECTION_REFUSED',
      'net::ERR_NAME_NOT_RESOLVED',
      'net::ERR_INTERNET_DISCONNECTED',
      'net::ERR_TIMED_OUT',
      'NS_ERROR_NET_RESET',
    ]) {
      expect(isBenignRequestFailure(errorText), errorText).toBe(false);
    }
  });

  it('does not filter empty or missing failure text', () => {
    expect(isBenignRequestFailure(undefined)).toBe(false);
    expect(isBenignRequestFailure('')).toBe(false);
  });

  it('does not substring-match aborted inside a longer error text', () => {
    // A filter written as `includes('ERR_ABORTED')` would swallow a
    // hypothetical compound text; the benign class is exactly the
    // cancellation errorText and nothing broader.
    expect(isBenignRequestFailure('net::ERR_ABORTED net::ERR_FAILED')).toBe(false);
    expect(isBenignRequestFailure('xxnet::ERR_ABORTED')).toBe(false);
  });
});
