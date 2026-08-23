import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The design system is load-bearing documentation: Factory agents read it,
 * while the product executes the values in CSS, React, and the offline OG
 * renderer. These checks catch the cheap but damaging form of drift where
 * every file remains locally valid while the identity stops being one system.
 */
const read = (rel: string): string =>
  readFileSync(join(process.cwd(), rel), 'utf8');

const spec = read('library/design-system.md');
const integrity = read('contract/design-integrity.md');
const agents = read('AGENTS.md');
const readme = read('README.md');
const css = read('app/globals.css');
const layout = read('app/layout.tsx');
const home = read('app/page.tsx');
const shell = read('components/nav/site-shell.tsx');
const badge = read('components/ui/badge.tsx');
const callout = read('components/ui/callout.tsx');
const og = read('lib/og-card-artwork.ts');
const nextEnv = read('next-env.d.ts');

const palette = {
  bg: '#f4f3ef',
  surface: '#fbfaf7',
  'surface-2': '#eceae4',
  border: '#d9d6cd',
  'border-strong': '#b3afa4',
  text: '#1a1c1e',
  'text-dim': '#55595d',
  accent: '#245edb',
  'logo-plate': '#7d7a73',
  ok: '#1a6f45',
  warn: '#8a5a00',
  err: '#a52a1e',
} as const;

describe('canonical design-system documentation', () => {
  it('exists as an implementation contract rather than a short moodboard', () => {
    expect(spec.length).toBeGreaterThan(12_000);
    for (const heading of [
      'Droid execution contract',
      'Brand foundation',
      'Identity',
      'Engineering grid',
      'Colour',
      'Typography',
      'Components',
      'Data visualization and interactives',
      'Open Graph and X cards',
      'Hard bans',
      'Release checklist',
    ]) {
      expect(spec, `missing design-system section: ${heading}`).toContain(
        heading,
      );
    }
    expect(spec).toContain('locked v1.0');
    expect(spec).toContain('Do not invent a logo');
  });

  it('has a measurable companion contract with sealed requirements', () => {
    expect(integrity.length).toBeGreaterThan(6_000);
    for (const id of [
      'VAL-BRAND-001',
      'VAL-TYPE-001',
      'VAL-DESIGN-016',
      'VAL-HOME-001',
      'VAL-ARTICLE-001',
      'VAL-CHART-001',
      'VAL-OG-001',
      'VAL-A11Y-001',
    ]) {
      expect(integrity).toContain(id);
    }
  });

  it('is wired into both agent instructions and contributor documentation', () => {
    for (const text of [agents, readme]) {
      expect(text).toContain('library/design-system.md');
      expect(text).toContain('contract/design-integrity.md');
    }
    expect(agents).toContain('Do not invent a logo');
    expect(readme).toContain('there is\nno separate logo');
  });

  it('only names npm scripts that exist', () => {
    const scripts: Record<string, string> = JSON.parse(read('package.json')).scripts;
    const commands = [spec, integrity].flatMap((text) =>
      [...text.matchAll(/npm run ([a-z][a-z0-9:.-]*)/g)].map((match) => match[1]),
    );
    expect(commands.length).toBeGreaterThan(0);
    expect(commands.filter((command) => !(command in scripts))).toEqual([]);
  });
});

describe('design tokens stay aligned', () => {
  it('pins the complete runtime palette in the specification and CSS', () => {
    for (const [name, value] of Object.entries(palette)) {
      expect(css, `CSS token --color-${name}`).toContain(
        `--color-${name}: ${value};`,
      );
      expect(spec, `documented token --color-${name}`).toContain(
        `\`--color-${name}\` | \`${value}\``,
      );
    }
  });

  it('keeps the OG renderer mirrors aligned with runtime tokens', () => {
    const mirrors = {
      BG: palette.bg,
      BORDER: palette.border,
      TEXT: palette.text,
      DIM: palette['text-dim'],
      ACCENT: palette.accent,
    } as const;
    for (const [name, value] of Object.entries(mirrors)) {
      expect(og).toContain(`const ${name} = '${value}';`);
    }
  });

  it('uses semantic warning colour in warning primitives', () => {
    expect(badge).toContain("warn: 'border-warn text-warn'");
    expect(callout).toContain("warn: 'border-l-warn'");
    expect(callout).toContain("warn: 'text-warn'");
    expect(badge).not.toContain("warn: 'border-accent text-accent'");
    expect(callout).not.toContain("warn: 'border-l-accent'");
  });
});

describe('identity geometry and typography stay aligned', () => {
  it('uses the exact plain wordmark and descriptor', () => {
    for (const text of [spec, home, shell, og]) {
      expect(text).toContain('robot-wiki');
    }
    for (const text of [spec, home, shell]) {
      expect(text).toContain('Robotics encyclopaedia');
    }
    expect(home).toContain('>\n              robot-wiki\n            </h1>');
  });

  it('omits the descriptor from every OG lockup in any case (VAL-DSBRAND-002)', () => {    // The canonical lockup table omits "Robotics encyclopaedia" from the
    // Open Graph card. Normalized and explicit: neither the spelled
    // form nor any case variant may survive in the OG artwork source.
    const variants = [
      'Robotics encyclopaedia',
      'ROBOTICS ENCYCLOPAEDIA',
      'robotics encyclopaedia',
      'Robotics encyclopedia',
      'ROBOTICS ENCYCLOPEDIA',
      'robotics encyclopedia',
    ];
    for (const variant of variants) {
      expect(og, `OG artwork must not contain "${variant}"`).not.toContain(
        variant,
      );
    }
    // Case-folded and whitespace-normalized belt-and-braces: no casing or
    // spacing trick keeps the descriptor on a card.
    const folded = og
      .toLowerCase()
      .replace(/[^a-z]+/g, ' ')
      .trim();
    expect(folded).not.toMatch(/robotics\s+encyclopa?edia/);
  });

  it('keeps next-env.d.ts on the production type path so clean builds are byte-stable', () => {
    // next dev writes imports against .next/dev/types; next typegen and
    // next build write against .next/types. The tracked file must hold
    // the PRODUCTION variant, because a dev variant is rewritten by every
    // clean npm run typecheck and npm run build, dirtying the tree
    // between the two mode directories. The production import resolves
    // in dev too: next dev regenerates .next/dev/types and tsconfig
    // includes both directories.
    expect(nextEnv).toContain('import "./.next/types/routes.d.ts";');
    expect(nextEnv).toContain('import "./.next/types/root-params.d.ts";');
    expect(nextEnv).not.toContain('.next/dev/types');
  });

  it('loads exactly the three declared first-party families', () => {
    expect(layout).toContain(
      "import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from 'next/font/google'",
    );
    expect(css).toContain('--font-sans: var(--font-plex-sans)');
    expect(css).toContain('--font-serif: var(--font-newsreader)');
    expect(css).toContain('--font-mono: var(--font-plex-mono)');
    for (const family of ['IBM Plex Sans', 'Newsreader', 'IBM Plex Mono']) {
      expect(spec).toContain(family);
    }
  });

  it('pins the literal web and OG engineering grids', () => {
    expect(css).toContain("width='32' height='32' viewBox='0 0 32 32'");
    expect(css).toContain('background-size: 32px 32px');
    expect(home).toContain('engineering-grid');
    expect(home).toContain('md:grid-cols-[minmax(0,1fr)_13rem]');
    // Mobile: the grid is the exact 80px band (h-20) below the lockup
    // (VAL-DSHOME-009), not a min-height.
    expect(home).toMatch(/engineering-grid[^"]*h-20/);
    expect(og).toContain("const GRID = '#c8c5bc';");
    expect(og).toContain('for (let r = 0; r < 12; r++)');
    expect(og).toContain('for (let c = 0; c < 8; c++)');
    expect(og).toContain("width: '34px'");
    expect(og).toContain("height: '34px'");
  });

  it('does not leave stale green labels on blue interactive marks', () => {
    const wbc = read('components/interactive/wbc-decomposition.tsx');
    const mot = read('components/interactive/mot-insulation.tsx');
    const cross = read('components/interactive/cross-embodiment-strategies.tsx');
    const registry = read('lib/chart-descriptions.ts');
    const generalist = read('components/interactive/generalist-release-timeline.tsx');
    const hierarchy = read('components/interactive/hierarchy-timescales.tsx');
    expect(wbc).not.toMatch(/green (?:still )?marks the (?:layer|VLA)/i);
    expect(mot).not.toContain('text-accent">green</span>');
    expect(mot).not.toContain('dashed green: sideways attention');
    expect(cross).not.toContain('text-accent">green</span>');
    expect(wbc).toMatch(/blue (?:still )?marks the (?:layer|VLA)/i);
    expect(mot).toContain('text-accent">blue</span>');
    expect(cross).toContain('text-accent">blue</span>');
    // The registry is compared against the rendered DOM by
    // chart-description-registry.spec.ts, so its colour words must name
    // the marks the components actually paint (accent blue since v1).
    expect(registry).not.toContain('green marks the layer');
    expect(registry).not.toContain('green nodes mark open weights');
    expect(registry).toContain('blue marks the layer');
    expect(registry).toContain('blue nodes mark open weights');
    expect(generalist).toContain('Blue nodes are open weights');
    expect(generalist).toContain('blue nodes mark open weights');
    // Fired timeline ticks are accent blue, not green.
    expect(hierarchy).toContain('blue ticks: updates fired');
    expect(hierarchy).not.toContain('green ticks');
    // The same sweep over the three modules whose lead series is signal
    // blue: the Kalman uncertainty band, the JEPA current-latent marker,
    // and the sim-to-real DR plateau, plus the advantage-scrubber trace.
    const stateEst = read('content/classical/state-estimation.mdx');
    const jepa = read('content/world-models/jepa.mdx');
    const sim2real = read('content/rl-sim2real/sim2real-transfer.mdx');
    const advantage = read('components/interactive/advantage-scrubber.tsx');
    expect(stateEst).not.toMatch(/green band/i);
    expect(stateEst.toLowerCase()).toContain('blue band');
    expect(jepa).not.toMatch(/green marker/i);
    expect(jepa.toLowerCase()).toContain('blue marker');
    expect(sim2real).not.toMatch(/green plateau/i);
    expect(sim2real.toLowerCase()).toContain('blue plateau');
    expect(advantage).not.toContain('elapsed portion green');
    expect(advantage).not.toMatch(/green (?:line|trace)/i);
  });

  it('keeps semantic colours semantic in the cross-embodiment schematic', () => {
    const cross = read('components/interactive/cross-embodiment-strategies.tsx');
    // The shared-latent slots are a schematic for an undisclosed
    // representation: ok-green is a state colour and "schematic" is not a
    // success state, so the latent must render through a neutral hatch,
    // which is also its non-colour distinction from the blue active dims.
    expect(cross).not.toContain("latent: 'var(--color-ok)'");
    expect(cross).toContain("latent: 'latent-hatch'");
    expect(cross).toContain('hatched: shared latent (schematic)');
    expect(cross).not.toContain('green</span>: shared latent');
    expect(cross).not.toContain('the green slots on the');
  });

  it('does not draw a chart-like teaser around unsourced quantities', () => {
    const home = read('app/page.tsx');
    // The market-map entry once drew a bubble scatter with a dashed
    // trend line: arbitrary circle radii read as funding values and the
    // diagonal implied a correlation, none of it sourced. The teaser must
    // stay structural (chips and rows), with no varying-radius marks and
    // no trend path.
    const teaser = home.slice(
      home.indexOf('Structural schematic of the market map'),
      home.indexOf('</svg>', home.indexOf('Structural schematic of the market map')),
    );
    expect(teaser.length).toBeGreaterThan(0);
    expect(teaser).not.toMatch(/circle\s+cx=/);
    expect(teaser).not.toMatch(/<path/);
    expect(teaser).not.toMatch(/r=\{\d+\}/);
  });
});
