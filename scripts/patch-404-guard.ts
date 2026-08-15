/**
 * Post-build patch: inject the pre-hydration redirect guard into
 * `out/404.html`.
 *
 * Wired into `postbuild` alongside the prune and search steps. The guard
 * itself and its rationale live in lib/not-found-guard.ts; this is the
 * CLI wrapper that reads, patches, and writes the exported document.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { injectNotFoundGuard } from '../lib/not-found-guard.ts';

const target = join(import.meta.dirname, '..', 'out', '404.html');

if (!existsSync(target)) {
  console.error('patch-404-guard: FAILED (out/404.html does not exist; run next build first)');
  process.exit(1);
}

const [patched, injected] = injectNotFoundGuard(readFileSync(target, 'utf8'));

if (injected) {
  writeFileSync(target, patched);
  console.log('patch-404-guard: OK (pre-hydration redirect guard injected into out/404.html)');
} else if (patched.includes('location.replace("/404/")')) {
  console.log('patch-404-guard: OK (guard already present; nothing to do)');
} else {
  console.error('patch-404-guard: FAILED (out/404.html has no <head> to inject into)');
  process.exit(1);
}
