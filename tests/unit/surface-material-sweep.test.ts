import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Source sweep for the surface and material rules of the research-page
 * standard (owner decision of 2026-10-10, PANTHEON-SPEC.md):
 * VAL-B2-SURF-001/002/004/005, VAL-B2-COL-009 and VAL-DESIGN-030.
 *
 * The rendered sweeps (tests/e2e/design-chrome.spec.ts and
 * tests/e2e/brand-v2-primitives.spec.ts) measure what a route paints; this
 * one reads every first-party stylesheet and component, so a corner, a
 * shadow, a blur or a gradient written into a module no audited route mounts
 * yet is caught before it ships. Each exception names the one place it is
 * allowed and why, and the population of swept files is asserted non-empty.
 *
 * The /how-robots-work/ explainers (components/explainers/) are frozen by
 * owner decision (Josef, 12 October 2026: "i love the how robots work
 * section!") and are reported by the rendered audit, not restyled here.
 */

const ROOT = process.cwd();
const FROZEN = ['components/explainers/'];
const SWEPT_DIRS = ['app', 'components'];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(join(ROOT, dir))) {
    const path = join(dir, name);
    if (statSync(join(ROOT, path)).isDirectory()) walk(path, out);
    else if (/\.(tsx|ts|css)$/.test(name)) out.push(path);
  }
  return out;
}

const FILES = SWEPT_DIRS.flatMap((dir) => walk(dir))
  .map((path) => relative(ROOT, join(ROOT, path)))
  .filter((path) => !FROZEN.some((prefix) => path.startsWith(prefix)))
  .sort();

type Hit = { file: string; line: number; text: string };

function hits(pattern: RegExp, files = FILES): Hit[] {
  const found: Hit[] = [];
  for (const file of files) {
    const lines = readFileSync(join(ROOT, file), 'utf8').split('\n');
    lines.forEach((text, index) => {
      // Comments describe retired treatments by name; only code counts.
      const code = text.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
      if (/^\s*\*/.test(text)) return;
      if (pattern.test(code)) found.push({ file, line: index + 1, text: text.trim() });
    });
  }
  return found;
}

const where = (list: Hit[]) => list.map(({ file, line, text }) => `${file}:${line} ${text}`);

describe('surface and material source sweep', () => {
  it('sweeps a non-empty first-party population', () => {
    expect(FILES.length).toBeGreaterThan(200);
    expect(FILES).toContain('app/globals.css');
    expect(FILES).toContain('components/three/playground.css');
  });

  it('keeps every corner square except the code-block token and circular marks', () => {
    expect(where(hits(/borderRadius\s*:/))).toEqual([]);
    const cssRadii = hits(/border(?:-[a-z]+)*-radius\s*:/).filter(
      ({ text }) =>
        !/radius\s*:\s*(?:0(?:px)?|50%|var\(--code-radius\)(?:\s+var\(--code-radius\)\s+0\s+0)?)\s*;/.test(text),
    );
    expect(where(cssRadii)).toEqual([]);
    // Tailwind arbitrary radii: the code token is the one allowed value.
    // Two sources are named instead of rewritten because a continuity
    // record digests their bytes: the Eureka reward listing draws the same
    // 7px code corner literally (the reader-first record), and the
    // training-time chart keeps a 1px corner on its 10px legend swatches
    // (the archived parallel18 proof pins that file). A swatch is a data
    // mark, which VAL-B2-SURF-001 exempts.
    const named: ReadonlyArray<readonly [string, string]> = [
      ['components/interactive/eureka-loop.tsx', 'rounded-[7px]'],
      ['components/interactive/training-time-chart.tsx', 'rounded-[1px]'],
    ];
    const arbitrary = hits(/rounded(?:-[a-z]{1,2})?-\[(?!var\(--code-radius\)\])/).filter(
      ({ file, text }) => !named.some(([path, value]) => file === path && text.includes(value)),
    );
    expect(where(arbitrary)).toEqual([]);
  });

  it('defines the radius and elevation tokens as square and shadowless', () => {
    const css = readFileSync(join(ROOT, 'app/globals.css'), 'utf8');
    for (const token of ['none', 'xs', 'sm', 'md', 'lg', 'xl']) {
      expect(css).toMatch(new RegExp(`--radius-${token}:\\s*0px;`));
    }
    expect(css).toMatch(/--shadow-raised:\s*0 0 #0000;/);
    expect(css).toMatch(/--shadow-floating:\s*0 0 #0000;/);
    expect(css).toMatch(/--code-radius:\s*7px;/);
  });

  it('casts no shadow, glow, blur or glass outside the registered zero-shadow tokens', () => {
    // Tailwind's sized shadow utilities; shadow-raised and shadow-floating
    // resolve to the zero tokens checked above.
    const shadowUtilities = hits(/(?:^|[\s'"`:])shadow-(?:2xs|xs|sm|md|lg|xl|2xl|inner|\[)/);
    expect(where(shadowUtilities)).toEqual([]);
    expect(where(hits(/box-shadow\s*:(?!\s*none\s*;)|boxShadow\s*:/))).toEqual([]);
    expect(
      where(
        hits(/backdrop-blur|backdrop-filter|backdropFilter|drop-shadow|text-shadow|textShadow|filter\s*:\s*blur|\bblur-(?:xs|sm|md|lg|xl|2xl|3xl|\[)/),
      ),
    ).toEqual([]);
  });

  it('paints no decorative gradient; the one hatch is a labelled data encoding', () => {
    const gradients = hits(/(?:linear|radial|conic)-gradient\(/).filter(
      ({ file, text }) =>
        // Documented-versus-demonstration bars: the demonstration rows are
        // drawn dashed and hatched so they read apart in grayscale, and the
        // legend names the hatch. It is a data mark, not a surface.
        !(file === 'components/interactive/deployment-dashboard.tsx' && text.includes('repeating-linear-gradient(45deg')),
    );
    expect(where(gradients)).toEqual([]);
  });

  it('draws standard borders at 1px; 2px only on registered state and data-key marks', () => {
    const thick = hits(/\bborder(?:-[lrtbxy])?-(?:[2-9]|\[[2-9](?:\.\d+)?px\])\b|border(?:-[a-z]+)?\s*:\s*[2-9](?:\.\d+)?px/);
    const allowed = new Map<string, string>([
      // The Kalman legend key repeats the 2px outline the blend series is drawn with.
      ['components/motion/scenes/kalman-predict-update.tsx', 'border-2'],
      // Diff lines: a 2px rule marks added and removed reward lines (semantic emphasis).
      ['components/interactive/eureka-loop.tsx', 'border-l-2'],
      // The selected company tile and timeline row: a selected state.
      ['components/market-map/grid-view.tsx', 'border-l-2'],
      ['components/market-map/funding-timeline.tsx', 'border-l-2'],
    ]);
    const offenders = thick.filter(({ file, text }) => {
      const token = allowed.get(file);
      return !(token && text.includes(token));
    });
    expect(where(offenders)).toEqual([]);
  });

  it('draws no stray list marker on a list that declares list-none inside prose', () => {
    // The unlayered prose list rules outrank Tailwind's layered list-none,
    // so without this override every tile of a figure's list grid got a
    // bullet beside it (VAL-B2-GRID-006: no unanchored glyph).
    const css = readFileSync(join(ROOT, 'app/globals.css'), 'utf8');
    expect(css).toMatch(/\.prose :is\(ul, ol\)\.list-none\s*\{\s*list-style:\s*none;\s*\}/);
    const usesListNone = hits(/\blist-none\b/);
    expect(usesListNone.length).toBeGreaterThan(0);
  });

  it('paints no texture: no noise, grain, halftone or dither image anywhere', () => {
    expect(
      where(hits(/feTurbulence|background-image\s*:\s*url\(|backgroundImage:\s*`?url\(|bg-\[url\(/)),
    ).toEqual([]);
  });
});
