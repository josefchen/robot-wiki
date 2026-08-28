import { readFileSync, statSync } from 'node:fs';
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
const badge = read('components/ui/badge.tsx');
const callout = read('components/ui/callout.tsx');
const globals = read('app/globals.css');
const ogArtwork = read('lib/og-card-artwork.ts');
const robotScene = read('components/three/robot-scene.tsx');
const nextEnv = read('next-env.d.ts');

const palette = {
  ink: '#0B0B0C',
  graphite: '#242D33',
  concrete: '#D9DADB',
  paper: '#F5F6F7',
  white: '#FFFFFF',
  highlight: '#C6FF19',
  signal: '#245FFF',
} as const;

const semanticPalette = {
  ok: '#1A6F45',
  warn: '#8A5A00',
  error: '#A52A1E',
  destructive: '#6B1839',
} as const;

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) =>
    Number.parseInt(hex.slice(offset, offset + 2), 16) / 255,
  );
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  const darker = Math.min(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  return (lighter + 0.05) / (darker + 0.05);
}

describe('canonical design-system documentation', () => {
  it('exists as an implementation contract rather than a short moodboard', () => {
    expect(spec.length).toBeGreaterThan(12_000);
    for (const heading of [
      'Worker execution contract',
      'Brand foundation',
      'Identity and naming',
      'Typography',
      'Palette and semantic roles',
      'Structural grid, rails, and registration devices',
      'Shape, borders, and elevation',
      'Component language',
      'Visualizations and interactives',
      'Open Graph and X',
      'Anti-generic release bans',
      'Autonomous release review',
    ]) {
      expect(spec, `missing design-system section: ${heading}`).toContain(
        heading,
      );
    }
    expect(spec).toContain('locked v2.0');
    expect(spec).toContain('No invented symbol');
    expect(spec).toContain('Validation is autonomous');
    for (const reference of [
      'library/brand-reference-board.jpeg',
      'library/brand-reference-article.png',
    ]) {
      expect(statSync(join(process.cwd(), reference)).size).toBeGreaterThan(
        100_000,
      );
      expect(spec).toContain(reference.split('/').at(-1));
      expect(integrity).toContain(reference);
    }
  });

  it('has a measurable companion contract with sealed requirements', () => {
    expect(integrity.length).toBeGreaterThan(6_000);
    for (const id of [
      'VAL-B2-BASE-001',
      'VAL-B2-ID-001',
      'VAL-B2-COL-001',
      'VAL-B2-TYPE-001',
      'VAL-B2-GRID-001',
      'VAL-B2-SURF-001',
      'VAL-B2-COMP-001',
      'VAL-B2-OG-001',
      'VAL-B2-A11Y-001',
      'VAL-B2-EVID-001',
      'VAL-B2-GOV-001',
    ]) {
      expect(integrity).toContain(id);
    }
    expect(integrity).toContain('all 27 visual-evidence rows pass');
    expect(integrity).toContain('No human approval step is required');
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
  it('pins the complete v2 palette in both authority documents', () => {
    for (const [name, value] of Object.entries(palette)) {
      expect(spec, `documented token --color-${name}`).toContain(
        `\`--color-${name}\` | \`${value}\``,
      );
      expect(integrity, `contract colour ${value}`).toContain(value);
      expect(globals, `runtime token --color-${name}`).toContain(
        `--color-${name}: ${value};`,
      );
    }
    expect(globals).toContain('--color-focus: var(--color-signal);');
    expect(globals).toContain('--color-selection: var(--color-highlight);');
    expect(globals).toContain('::selection {\n    background: var(--color-selection);');
    expect(globals).toContain('outline: 2px solid var(--color-focus);');
    expect(spec).toContain('Primary actions are ink/black filled');
    expect(spec).toContain(
      'Selected, toggled, or highlighted states use highlight lime',
    );
    expect(spec).toContain(
      'Signal blue is for links, focus, registration, and active information paths',
    );
  });

  it('requires renderer mirrors to converge without claiming they already have', () => {
    expect(spec).toContain(
      'Offline OG and WebGL renderers may repeat resolved values',
    );
    expect(spec).toContain('Mirrors remain explicit and parity-tested');
    expect(integrity).toContain(
      'Runtime highlight token and all renderer mirrors resolve exactly to `#C6FF19`',
    );
    expect(integrity).toContain(
      'Runtime signal token and all renderer mirrors resolve exactly to `#245FFF`',
    );
    for (const token of [
      'paper',
      'white',
      'ink',
      'graphite',
      'concrete',
      'highlight',
      'signal',
    ]) {
      expect(ogArtwork).toContain(`BRAND_COLORS.${token}`);
    }
    for (const token of [
      'paper',
      'concrete',
      'graphite',
      'ok',
      'warn',
      'error',
    ]) {
      expect(robotScene).toContain(`BRAND_COLORS.${token}`);
    }
  });

  it('uses semantic warning colour in warning primitives', () => {
    expect(badge).toContain("warn: 'border-warn text-warn'");
    expect(callout).toContain("warn: 'border-l-warn'");
    expect(callout).toContain("warn: 'text-warn'");
    expect(badge).not.toContain("warn: 'border-accent text-accent'");
    expect(callout).not.toContain("warn: 'border-l-accent'");
    expect(new Set(Object.values(semanticPalette)).size).toBe(4);
    for (const [name, value] of Object.entries(semanticPalette)) {
      expect(globals, `semantic token --color-${name}`).toContain(
        `--color-${name}: ${value};`,
      );
      expect(
        contrastRatio(value, palette.paper),
        `${name} on paper must meet WCAG AA`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(value, palette.white),
        `${name} on white must meet WCAG AA`,
      ).toBeGreaterThanOrEqual(4.5);
    }
    expect(globals).toContain('--color-err: var(--color-error);');
    expect(integrity).toContain(
      'Semantic tokens `ok`, `warn`, `error`, and `destructive` exist separately from brand accents',
    );
  });

  it('exposes the fixed executable spacing ladder without extra steps', () => {
    const declared = [...globals.matchAll(/--space-(\d+):\s*(\d+)px;/g)].map(
      ([, name, value]) => [Number(name), Number(value)],
    );
    expect(declared).toEqual(
      [4, 8, 12, 16, 24, 32, 48, 64, 96, 128].map((value) => [
        value,
        value,
      ]),
    );
    expect(integrity).toContain(
      'Executable spacing tokens expose exactly the fixed ladder `4, 8, 12, 16, 24, 32, 48, 64, 96, 128` px',
    );
  });
});

describe('identity geometry and typography stay aligned', () => {
  it('seals the exact v2 identity while preserving technical identifiers', () => {
    for (const text of [spec, integrity, agents]) {
      expect(text).toContain('Robot Wiki');
      expect(text).toContain(
        'Citation-first encyclopedia of modern robot learning.',
      );
      expect(text).toContain('robot-wiki');
      expect(text).toContain('robot-atlas-trajectory');
    }
    expect(spec).toContain('Capital `R`');
    expect(spec).toContain('Capital `W`');
    expect(spec).toContain('One literal space');
    expect(integrity).toContain('VAL-B2-ID-001');
    expect(integrity).toContain('VAL-B2-ID-002');
    expect(integrity).toContain('VAL-B2-ID-004');
  });

  it('seals the site-card and article-card descriptor split', () => {
    expect(spec).toContain(
      'Site card: `Robot Wiki` plus the exact descriptor.',
    );
    expect(spec).toContain(
      'Article cards: real article title, domain, review year, reference count, and compact `Robot Wiki` identity.',
    );
    expect(integrity).toContain(
      'Site card contains exact `Robot Wiki` and exact descriptor.',
    );
    expect(integrity).toContain(
      'Every article card contains the real title, domain, review year, reference count, and compact `Robot Wiki`; it omits the descriptor.',
    );
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

  it('seals Tektur delivery and all four first-party font roles', () => {
    for (const family of [
      'Tektur Variable',
      'IBM Plex Sans',
      'Newsreader',
      'IBM Plex Mono',
    ]) {
      expect(spec).toContain(family);
      expect(integrity).toContain(family);
    }
    expect(spec).toContain('loaded through `next/font/local`');
    expect(spec).toContain('separate checked-in static TTF');
    expect(integrity).toContain('VAL-B2-TYPE-011');
    expect(integrity).toContain('VAL-B2-TYPE-012');
  });

  it('seals the v2 grid, surface, and autonomous-validation rules', () => {
    expect(spec).toContain('12-column desktop grid');
    expect(spec).toContain('8-column tablet grid');
    expect(spec).toContain('4-column mobile grid');
    expect(spec).toContain('`0, 2, 4, 8, 16, 24px`');
    for (const level of ['Flat', 'Raised', 'Floating']) {
      expect(spec).toContain(`| ${level} |`);
    }
    expect(spec).toContain('bounded dark instrument');
    expect(spec).toContain('without waiting for a human visual-review pass');
    expect(integrity).toContain('No human approval step is required');
    for (const id of [
      'VAL-B2-GRID-001',
      'VAL-B2-SURF-001',
      'VAL-B2-SURF-004',
      'VAL-B2-SURF-006',
      'VAL-B2-EVID-004',
      'VAL-B2-EVID-007',
    ]) {
      expect(integrity).toContain(id);
    }
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
