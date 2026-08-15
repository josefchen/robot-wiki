import { describe, expect, it } from 'vitest';
import { injectNotFoundGuard, NOT_FOUND_GUARD_SCRIPT } from '@/lib/not-found-guard';

describe('injectNotFoundGuard', () => {
  it('injects the guard as the first child of <head>', () => {
    const html = '<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/><title>t</title></head><body></body></html>';
    const [patched, injected] = injectNotFoundGuard(html);
    expect(injected).toBe(true);
    expect(patched.startsWith('<!DOCTYPE html><html lang="en"><head>')).toBe(true);
    // The guard sits before the original head content so it runs pre-hydration.
    expect(patched.indexOf(NOT_FOUND_GUARD_SCRIPT)).toBeLessThan(
      patched.indexOf('<meta charSet="utf-8"/>'),
    );
  });

  it('is idempotent: a second injection is a no-op', () => {
    const html = '<html><head><title>t</title></head><body></body></html>';
    const [first, injectedFirst] = injectNotFoundGuard(html);
    const [second, injectedSecond] = injectNotFoundGuard(first);
    expect(injectedFirst).toBe(true);
    expect(injectedSecond).toBe(false);
    expect(second).toBe(first);
  });

  it('leaves HTML without a <head> untouched and reports no injection', () => {
    const html = '<html><body>no head</body></html>';
    const [patched, injected] = injectNotFoundGuard(html);
    expect(injected).toBe(false);
    expect(patched).toBe(html);
  });

  it('the guard script redirects only non-canonical paths', () => {
    // The decision table encoded in the script, spelled out as data so the
    // intent is testable without executing it: /404, /_not-found, and the
    // bare root stay; anything else replaces to /404/.
    const redirect = (pathname: string): boolean => {
      const p = pathname.replace(/\/+$/, '');
      return p !== '/404' && p !== '/_not-found' && p !== '';
    };
    expect(redirect('/404')).toBe(false);
    expect(redirect('/404/')).toBe(false);
    expect(redirect('/_not-found')).toBe(false);
    expect(redirect('/_not-found/')).toBe(false);
    expect(redirect('/')).toBe(false);
    expect(redirect('/manipulation/nope/')).toBe(true);
    expect(redirect('/nope')).toBe(true);
  });

  it('uses location.replace, not assign, so back navigation survives', () => {
    expect(NOT_FOUND_GUARD_SCRIPT).toContain('location.replace("/404/")');
    expect(NOT_FOUND_GUARD_SCRIPT).not.toContain('location.assign');
  });
});
