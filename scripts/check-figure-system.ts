/**
 * Runs the figure-system check over every Sitemap URL of the static export.
 *
 *   node scripts/check-figure-system.ts [--root out] [--allowlist <file>]
 *   node scripts/check-figure-system.ts --write-allowlist
 *
 * Exits 1 on any violation that is not allowlisted, on an allowlist entry
 * that no longer matches a violation, and on a Sitemap URL with no page.
 * --write-allowlist records the current violations for a domain pass to
 * work down; it keeps each existing entry's pass.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  applyAllowlist,
  inspectFigureDocument,
  formatViolation,
  type Allowlist,
  type AllowlistEntry,
  type FigureRule,
  type FigureViolation,
} from '../lib/figure-system-check.ts';

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};
const root = option('--root', 'out');
const allowlistPath = option('--allowlist', 'contract/figure-system-allowlist.json');

const DOMAINS = ['manipulation', 'classical', 'rl-sim2real', 'world-models', 'frontier', 'data-hardware', 'adjacent'];

function passFor(route: string): string {
  const first = route.split('/').filter(Boolean)[0] ?? '';
  if (!first) return 'opus-pass-homepage';
  return DOMAINS.includes(first) ? `opus-pass-${first}` : 'opus-pass-home-hubs-and-discovery';
}

function sitemapRoutes(): string[] {
  const sitemap = join(root, 'sitemap.xml');
  if (!existsSync(sitemap)) throw new Error(`figure-system: no sitemap at ${sitemap}; build the export first`);
  return [...readFileSync(sitemap, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
}

function pageFile(route: string): string {
  return route.endsWith('/') ? join(root, route, 'index.html') : join(root, `${route}.html`);
}

const violations: FigureViolation[] = [];
const missing: string[] = [];
let figures = 0;
for (const route of sitemapRoutes()) {
  const file = pageFile(route);
  if (!existsSync(file)) {
    missing.push(route);
    continue;
  }
  const page = inspectFigureDocument(readFileSync(file, 'utf8'), route);
  figures += page.figures.length;
  violations.push(...page.violations);
}

const allowlist: Allowlist = existsSync(allowlistPath)
  ? (JSON.parse(readFileSync(allowlistPath, 'utf8')) as Allowlist)
  : { schemaVersion: 'figure-system-allowlist-v1', entries: [] };

if (args.includes('--write-allowlist')) {
  const passes = new Map(allowlist.entries.map((e) => [`${e.route}\u0000${e.figure}`, e.pass]));
  const grouped = new Map<string, AllowlistEntry>();
  for (const v of violations) {
    const key = `${v.route}\u0000${v.figure}`;
    const entry = grouped.get(key) ?? { route: v.route, figure: v.figure, rules: [], pass: passes.get(key) ?? passFor(v.route) };
    if (!entry.rules.includes(v.rule)) entry.rules.push(v.rule);
    grouped.set(key, entry);
  }
  const entries = [...grouped.values()].map((e) => ({ ...e, rules: [...e.rules].sort() as FigureRule[] }));
  writeFileSync(allowlistPath, `${JSON.stringify({ schemaVersion: 'figure-system-allowlist-v1', entries }, null, 2)}\n`);
  console.log(`figure-system: wrote ${entries.length} allowlist entries to ${allowlistPath}`);
  process.exit(0);
}

const result = applyAllowlist(violations, allowlist);
for (const v of result.blocking) console.error(`figure-system: ${formatViolation(v)}`);
for (const { entry, rule } of result.stale) {
  console.error(`figure-system: stale allowlist entry ${entry.route} [${entry.figure}] ${rule}: remove it`);
}
for (const route of missing) console.error(`figure-system: ${route} is in the sitemap but has no exported page`);
const failed = result.blocking.length + result.stale.length + missing.length;
console.log(
  `figure-system: ${failed ? 'FAIL' : 'ok'}; ${result.blocking.length} blocking, ${result.allowed.length} allowlisted ` +
    `(${allowlist.entries.length} entries), ${result.stale.length} stale; ${figures} figures checked`,
);
process.exit(failed ? 1 : 0);
