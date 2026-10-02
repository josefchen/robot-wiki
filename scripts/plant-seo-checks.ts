/**
 * Mutation proof for the SEO check and the internal-link check: plants one
 * defect per rule into a copy of the built export, and requires the check
 * to exit non-zero on every plant, naming the planted rule, and to pass on
 * the unplanted copy.
 *
 *   node scripts/plant-seo-checks.ts [--root out]
 *
 * The export itself is never written; the copy lives in a temporary folder.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { SEO_RULES, sitemapEntries, type SeoRule } from '../lib/seo-check.ts';

const args = process.argv.slice(2);
const at = args.indexOf('--root');
const root = at >= 0 && args[at + 1] ? args[at + 1] : 'out';

type Check = 'seo' | 'internal-links';
interface Plant {
  check: Check;
  rule: SeoRule | 'redirect';
  plant: string;
  file: string;
  apply: (text: string) => string;
}

const copy = mkdtempSync(join(tmpdir(), 'seo-plant-'));
try {
  cpSync(root, copy, { recursive: true });
  const sitemap = readFileSync(join(copy, 'sitemap.xml'), 'utf8');
  const article = sitemapEntries(sitemap).find((entry) => entry.route.split('/').filter(Boolean).length === 2);
  if (!article) throw new Error('seo plant: the sitemap lists no article');
  const page = join(article.route, 'index.html');
  const html = (edit: (document: Document) => void) => (text: string) => {
    const dom = new JSDOM(text);
    edit(dom.window.document);
    return dom.serialize();
  };

  const PLANTS: Plant[] = [
    { check: 'seo', rule: 'title-length', plant: 'a 61-character title', file: page, apply: html((d) => { d.title = `${'T'.repeat(48)} | Robot Wiki`; }) },
    {
      check: 'seo', rule: 'description-length', plant: 'a 69-character description', file: page,
      apply: html((d) => d.querySelector('meta[name="description"]')?.setAttribute('content', `${'D'.repeat(68)}.`)),
    },
    { check: 'seo', rule: 'img-alt', plant: 'an image without alt', file: page, apply: html((d) => d.querySelector('main')?.append(Object.assign(d.createElement('img'), { src: '/og/robot-wiki.png' }))) },
    { check: 'seo', rule: 'json-ld', plant: 'the JSON-LD removed', file: page, apply: html((d) => d.querySelectorAll('script[type="application/ld+json"]').forEach((s) => s.remove())) },
    { check: 'seo', rule: 'sitemap-lastmod', plant: 'a <lastmod> removed', file: 'sitemap.xml', apply: (text) => text.replace(/<lastmod>[^<]*<\/lastmod>/, '') },
    {
      check: 'seo', rule: 'sitemap-coverage', plant: 'an article <url> removed', file: 'sitemap.xml',
      apply: (text) => text.replace(new RegExp(`<url>\\s*<loc>[^<]*${article.route}</loc>[\\s\\S]*?</url>`), ''),
    },
    {
      check: 'seo', rule: 'llms-article', plant: 'an article line removed from llms.txt', file: 'llms.txt',
      apply: (text) => text.split('\n').filter((line) => !line.includes(`${article.route})`)).join('\n'),
    },
    {
      check: 'internal-links', rule: 'redirect', plant: 'a link without its trailing slash', file: page,
      apply: html((d) => d.querySelector('main')?.append(Object.assign(d.createElement('a'), { href: article.route.slice(0, -1), textContent: 'x' }))),
    },
  ];

  const run = (check: Check) =>
    spawnSync(process.execPath, [`scripts/check-${check}.ts`, '--root', copy], { encoding: 'utf8' });
  const clean = (['seo', 'internal-links'] as const).map((check) => ({ check, result: run(check) }));
  const before = new Set(clean.flatMap(({ result }) => result.stderr.split('\n')));
  const rows: { plant: Plant; exit: number | null; reported: string | null }[] = [];
  for (const plant of PLANTS) {
    const path = join(copy, plant.file);
    const original = readFileSync(path, 'utf8');
    const planted = plant.apply(original);
    if (planted === original) throw new Error(`seo plant: "${plant.plant}" changed nothing in ${plant.file}`);
    writeFileSync(path, planted);
    const result = run(plant.check);
    writeFileSync(path, original);
    const needle = plant.check === 'seo' ? ` ${plant.rule}: ` : '(308) redirects to';
    // Only a line the unplanted copy does not print counts as the plant's report.
    const reported = result.stderr.split('\n').find((line) => line.includes(needle) && !before.has(line)) ?? null;
    rows.push({ plant, exit: result.status, reported });
  }

  console.log(`seo plant: ${article.route}`);
  for (const { plant, exit, reported } of rows) {
    console.log(`  ${exit} ${plant.check} ${plant.rule} (${plant.plant}): ${reported ?? 'NOT REPORTED'}`);
  }
  for (const { check, result } of clean) {
    console.log(`  ${result.status} clean copy, ${check}: ${result.stdout.trim().split('\n').at(-1)}`);
  }
  const missed = rows.filter((row) => row.exit !== 1 || !row.reported);
  const unplanted = (Object.keys(SEO_RULES) as SeoRule[]).filter((rule) => !PLANTS.some((p) => p.rule === rule));
  const dirty = clean.filter(({ result }) => result.status !== 0);
  if (missed.length || unplanted.length || dirty.length) {
    console.error(`seo plant: ${missed.length} plant(s) passed, ${unplanted.length} rule(s) unplanted, ${dirty.length} clean check(s) failed`);
    process.exitCode = 1;
  }
} finally {
  rmSync(copy, { recursive: true, force: true });
}
