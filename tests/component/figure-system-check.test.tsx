import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  applyAllowlist,
  formatViolation,
  inspectFigureDocument,
  type Allowlist,
} from '@/lib/figure-system-check';
import { ChartFixtureFigure } from '../fixtures/figure-system/chart-fixture';

const ROUTE = '/fixture/';
const FIGURE = 'fixture:chart-primitives';

function page(body: string): string {
  return `<!doctype html><html><body><main>${body}</main></body></html>`;
}

const clean = renderToStaticMarkup(<ChartFixtureFigure />);

/** Replace exactly one occurrence, so a plant cannot silently miss. */
function plant(markup: string, from: string | RegExp, to: string): string {
  const matches = markup.match(new RegExp(from, 'g'));
  expect(matches?.length ?? 0, `plant target ${String(from)}`).toBeGreaterThan(0);
  return markup.replace(from, to);
}

function rulesFor(html: string) {
  return inspectFigureDocument(page(html), ROUTE).violations.map((v) => [v.figure, v.rule]);
}

describe('figure-system check', () => {
  it('passes the fixture built from the shared frame and chart primitives', () => {
    const { figures, violations } = inspectFigureDocument(page(clean), ROUTE);
    expect(figures).toEqual([FIGURE]);
    expect(violations.map(formatViolation)).toEqual([]);
  });

  it('fails a reserved data colour and names the figure', () => {
    // A trace painted signal blue: blue is for links and focus only.
    const planted = plant(clean, /stroke="var\(--role-state-stage\)"/, 'stroke="var(--color-signal)"');
    expect(rulesFor(planted)).toContainEqual([FIGURE, 'reserved-colour']);
  });

  it('fails a hard-coded colour and names the figure', () => {
    const planted = plant(clean, /fill="var\(--role-measurement-stage\)"/, 'fill="#ff8800"');
    expect(rulesFor(planted)).toContainEqual([FIGURE, 'hard-coded-colour']);
  });

  it('fails sub-scale text and names the figure', () => {
    // The legend set below the 12px floor. (Text inside the stage svg is
    // sized by stage.css, which overrides a font-size attribute.)
    const planted = plant(clean, /text-\[13px\]/, 'text-[10px]');
    expect(rulesFor(planted)).toContainEqual([FIGURE, 'sub-scale-text']);
    // Text in an svg that is not on the stage scale fails as well.
    const offStage = plant(clean, /class="motion-stage-svg /, 'class="');
    expect(rulesFor(offStage)).toContainEqual([FIGURE, 'sub-scale-text']);
  });

  it('fails a figure drawn outside the frame and names it', () => {
    const loose =
      '<figure><svg role="img" aria-label="Loose success chart" viewBox="0 0 400 200" width="400" height="200">' +
      '<path d="M0 0L400 200" stroke="var(--role-state-stage)"/><circle cx="1" cy="1" r="2"/><rect width="4" height="4"/>' +
      '</svg></figure>';
    expect(rulesFor(clean + loose)).toContainEqual(['Loose success chart', 'outside-frame']);
  });

  it('fails a caption over 20 words and a legend off the stage', () => {
    const long = Array.from({ length: 21 }, (_, i) => `word${i}`).join(' ');
    const captioned = plant(clean, /(<figcaption data-figure-caption=""[^>]*>)[^<]*/, `$1${long}`);
    expect(rulesFor(captioned)).toContainEqual([FIGURE, 'caption-words']);
    const legend = '<div data-figure-legend="">state</div>';
    const moved = plant(clean, /(<figcaption)/, `${legend}$1`);
    expect(rulesFor(moved)).toContainEqual([FIGURE, 'legend-off-stage']);
  });

  it('holds allowlisted figures to their recorded rules and reports stale entries', () => {
    const planted = plant(clean, /fill="var\(--role-measurement-stage\)"/, 'fill="#ff8800"');
    const { violations } = inspectFigureDocument(page(planted), ROUTE);
    const allowlist: Allowlist = {
      schemaVersion: 'figure-system-allowlist-v1',
      entries: [
        { route: ROUTE, figure: FIGURE, rules: ['hard-coded-colour'], pass: 'opus-pass-homepage' },
        { route: ROUTE, figure: 'gone', rules: ['outside-frame'], pass: 'opus-pass-homepage' },
      ],
    };
    const result = applyAllowlist(violations, allowlist);
    expect(result.blocking).toEqual([]);
    expect(result.allowed.map((v) => v.rule)).toContain('hard-coded-colour');
    expect(result.stale.map(({ entry }) => entry.figure)).toEqual(['gone']);

    const tighter: Allowlist = { ...allowlist, entries: [{ ...allowlist.entries[0], rules: ['sub-scale-text'] }] };
    const strict = applyAllowlist(violations, tighter);
    expect(strict.blocking.map((v) => v.rule)).toContain('hard-coded-colour');
    expect(strict.stale.map(({ rule }) => rule)).toEqual(['sub-scale-text']);
  });

  it('runs in the gated build and the production build, after the export exists', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
    expect(pkg.scripts['check:figure-system']).toBe('node scripts/check-figure-system.ts');
    for (const hook of ['postbuild', 'vercel-build']) {
      const command = pkg.scripts[hook];
      expect(command, hook).toContain('&& npm run check:figure-system &&');
      expect(command.indexOf('check:figure-system'), hook).toBeGreaterThan(command.lastIndexOf('next build'));
    }
    const allowlist = JSON.parse(readFileSync('contract/figure-system-allowlist.json', 'utf8')) as Allowlist;
    expect(allowlist.schemaVersion).toBe('figure-system-allowlist-v1');
  });
});
