import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BRAND_COLORS, BRAND_SPACING } from '@/lib/brand-v2-tokens';
import { OG_RENDERER_FACES } from '@/lib/og-renderer-fonts';

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
// The playground's WebGL palette lives in its stage-look module (owner
// request of 2026-10-19: the playground takes the light clay look of the
// /how-robots-work/ explainers); robot-scene.tsx paints from it.
const playgroundLook = read('components/three/stage-look.ts');
const nextEnv = read('next-env.d.ts');

// Owner-approved successor (Josef, 2026-10-10, the Pantheon standard): the
// sealed palette is paper and ink, grayscale chart tones and one muted blue
// accent, in place of the brand-v2 lime and signal blue.
const palette = {
  ink: '#1C1C1A',
  graphite: '#3F3F3B',
  concrete: '#DEDEDB',
  paper: '#FAFAF8',
  white: '#FFFFFF',
  highlight: '#A3A39E',
  signal: '#3B6EA8',
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
    expect(readme).toMatch(/there is\s+no separate logo/i);
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
    // Owner-approved successor (Josef, 2026-10-10): focus and links are ink,
    // selection is the light grey tone, and the focus ring is 1 px.
    expect(globals).toContain('--color-focus: var(--color-ink);');
    expect(globals).toContain('--color-link: var(--color-ink);');
    expect(globals).toContain('--color-selection: var(--color-concrete);');
    expect(globals).toContain('::selection {\n    background: var(--color-selection);');
    expect(globals).toContain('outline: 1px solid var(--color-focus);');
    expect(spec).toContain('Primary actions are ink/black filled');
    expect(spec).toContain(
      'Selected, toggled, or highlighted states use ink weight with a 1 px ink rule or underline, never a colour fill',
    );
    expect(spec).toContain(
      'The muted blue signal is for registration, active information paths and the one highlighted series of a figure',
    );
  });

  it('requires renderer mirrors to converge without claiming they already have', () => {
    expect(spec).toContain(
      'Offline OG and WebGL renderers may repeat resolved values',
    );
    expect(spec).toContain('Mirrors remain explicit and parity-tested');
    expect(integrity).toContain(
      'Runtime highlight token and all renderer mirrors resolve exactly to `#A3A39E`',
    );
    expect(integrity).toContain(
      'Runtime signal token and all renderer mirrors resolve exactly to `#3B6EA8`',
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
    // The WebGL scene reads every colour it paints from the renderer
    // mirror: the paper it clears to, the concrete and graphite its clay and
    // motor greys mix, the signal accent of the target and the active
    // motor, and the error token of the dashed gap when a target is out of
    // reach. tests/unit/playground-stage-look.test.ts compares the resolved
    // values with app/globals.css and explainers.css.
    for (const token of ['paper', 'concrete', 'graphite', 'signal', 'error']) {
      expect(playgroundLook).toContain(`BRAND_COLORS.${token}`);
    }
  });

  it('compares the shared renderer constants against the sealed values', () => {
    // Asserting only that lib/og-card-artwork.ts mentions BRAND_COLORS.signal
    // proves the renderer reads the mirror, not that the mirror is right: a
    // wrong literal in lib/brand-v2-tokens.ts propagates to every card and
    // to the WebGL scene and stays green through regeneration. The values
    // themselves are therefore compared against the same expectations the
    // authority documents and app/globals.css are held to.
    expect(BRAND_COLORS).toEqual({ ...palette, ...semanticPalette });
    expect(Object.keys(BRAND_COLORS)).toEqual([
      ...Object.keys(palette),
      ...Object.keys(semanticPalette),
    ]);
    for (const [name, value] of Object.entries(BRAND_COLORS)) {
      expect(
        globals,
        `renderer mirror BRAND_COLORS.${name} must equal --color-${name}`,
      ).toContain(`--color-${name}: ${value};`);
      expect(value).toMatch(/^#[0-9A-F]{6}$/);
    }
    expect([...BRAND_SPACING]).toEqual([4, 8, 12, 16, 24, 32, 48, 64, 96, 128]);
    for (const step of BRAND_SPACING) {
      expect(
        globals,
        `renderer mirror BRAND_SPACING ${step} must equal --space-${step}`,
      ).toContain(`--space-${step}: ${step}px;`);
    }
    // The OG faces are the other half of the mirror: every registered face
    // serves one of the four first-party roles and names its own family
    // first, so a card cannot be painted in an unregistered family.
    expect(OG_RENDERER_FACES.length).toBeGreaterThan(0);
    for (const face of OG_RENDERER_FACES) {
      expect(spec, `renderer face role ${face.roleId}`).toContain(face.family);
      expect(face.stack.startsWith(face.family)).toBe(true);
      expect(face.sha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it('uses semantic warning colour in warning primitives', () => {
    // Owner-approved successor (Josef, 2026-10-10, the Pantheon standard):
    // badges lost their outline box and the callout its coloured left bar,
    // so the warning colour now lives on the text alone ("border-warn
    // text-warn" became "text-warn"; "border-l-warn" is gone). The accent
    // must still never stand in for it.
    expect(badge).toContain("warn: 'text-warn'");
    expect(callout).not.toContain('border-l-');
    expect(callout).toContain("warn: 'text-warn'");
    expect(badge).not.toContain("warn: 'border-accent text-accent'");
    expect(badge).not.toContain('text-accent');
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
    // The research-page successors of the grid and surface rows (owner
    // decision of 10 October 2026), each at the brand-v2 row's strength.
    const row = (id: string) => integrity.split('\n').find((line) => line.startsWith(`| \`${id}\``)) ?? '';
    expect(row('VAL-B2-GRID-001')).toContain('within 4px of a line of that frame');
    expect(row('VAL-B2-GRID-002')).toContain('on every generated card');
    expect(row('VAL-B2-SURF-002')).toContain('no state takes a 2px border');
    expect(row('VAL-B2-SURF-003')).toContain('No first-party surface outside a data figure has a dashed or dotted border');
    expect(row('VAL-B2-SURF-004')).toContain('"No shadows"');
    expect(row('VAL-B2-SURF-006')).toContain('no bounded dark instrument');
    expect(row('VAL-B2-SURF-007')).toContain('the one material is the registered flat `material:paper`');
    expect(row('VAL-B2-SURF-008')).toContain('"No pills"');
    expect(row('VAL-B2-GRID-010')).toContain('`lib/notation-case.ts`');
    expect(row('VAL-B2-SURF-011')).toContain('renders byte-identically twice');
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
    // The WBC stack points its highlight note and arrow at the layer that
    // drives the joint motors, so its takeaway names the note, not a colour.
    expect(wbc).toMatch(/the note points at (?:that bottom layer|the controller|the VLA)/i);
    expect(wbc).not.toMatch(/(?:green|blue|lime) (?:note|bar)? ?(?:still )?(?:marks|points at) the (?:layer|VLA)/i);
    // The insulation diagram and the slot strips paint through the stage
    // roles on the graphite stage, so no legend narrates a blue mark.
    expect(mot).not.toContain('text-accent">blue</span>');
    expect(cross).not.toContain('text-accent">blue</span>');
    expect(mot).toContain("const actionColour = roleColour('action')");
    expect(cross).toContain("active: roleColour('action')");
    // The registry is compared against the rendered DOM by
    // chart-description-registry.spec.ts, so its colour words must name
    // the marks the components actually paint (accent blue since v1).
    // The generalist takeaway names no node colour at all; the colour and
    // dim-node legend lives in the chart's aria-label, pinned below.
    expect(registry).not.toContain('green marks the layer');
    expect(registry).not.toMatch(/green nodes/i);
    expect(registry).toContain('the note points at that bottom layer');
    expect(registry).not.toContain('blue marks the layer');
    expect(registry).toContain('dim nodes do not establish closed licensing');
    expect(registry).not.toContain('dim nodes mark closed ones');
    expect(generalist).toContain("fill: open ? measurement : 'none'");
    expect(generalist).toContain('dim nodes include unavailable and not-disclosed records');
    expect(generalist).toContain('dim nodes do not establish closed licensing');
    expect(generalist).not.toMatch(/green/i);
    // Fired timeline ticks take the action role, and the legend names the
    // update state, not a hue.
    expect(hierarchy).toContain("const fired = roleColour('action')");
    expect(hierarchy).toContain('update fired');
    expect(hierarchy).not.toMatch(/(?:blue|green) ticks/);
    // The same sweep over the three modules whose lead series is signal
    // blue: the Kalman uncertainty band, the JEPA current-latent marker,
    // and the sim-to-real DR plateau, plus the advantage-scrubber trace.
    const stateEst = read('content/classical/state-estimation.mdx');
    const jepa = read('content/world-models/jepa.mdx');
    const latentImagination = read('components/interactive/latent-imagination.tsx');
    const sim2real = read('content/rl-sim2real/sim2real-transfer.mdx');
    const frictionTransfer = read('components/interactive/friction-transfer.tsx');
    const jepaChart = read('components/interactive/jepa-planning.tsx');
    const frictionChart = read('components/interactive/friction-transfer.tsx');
    const advantage = read('components/interactive/advantage-scrubber.tsx');
    // The 20260926 motion-language pass replaced the tracking lab with the
    // predict-update scene, whose uncertainty is the belief ellipse painted
    // by the motion state role. The article no longer narrates colours at
    // all; the scene keeps the estimate on the state token and never says
    // green.
    const kalmanScene = read('components/motion/scenes/kalman-predict-update.tsx');
    expect(stateEst).not.toMatch(/green band/i);
    expect(stateEst).not.toMatch(/blue band/i);
    expect(kalmanScene).toContain('var(--role-state-stage)');
    expect(kalmanScene).not.toMatch(/green/i);
    // The JEPA article no longer narrates the marker's colour. The
    // latent-imagination chart paints its imagined latent through the state
    // role on the graphite stage, keeps signal blue off its marks, and
    // nothing calls it green.
    expect(jepa).not.toMatch(/green marker/i);
    expect(latentImagination).toContain("roleColour('state')");
    expect(latentImagination).not.toMatch(/ACCENT|--color-accent/);
    expect(latentImagination).not.toMatch(/green/i);
    expect(sim2real).not.toMatch(/green plateau/i);
    // The DR plateau prose lost its colour word in the audit rewrite. The
    // friction chart paints both success curves through the value role on
    // the graphite stage, keeps signal blue off its marks, and nothing calls
    // the plateau green.
    expect(frictionTransfer).toContain("const valueColour = roleColour('value')");
    expect(frictionTransfer).not.toMatch(/--color-accent/);
    expect(frictionTransfer).not.toMatch(/green/i);
    expect(jepaChart).toContain('two-dimensional points and loads no trained encoder or predictor');
    // The JEPA figure is a planning table drawn with the isometric figure kit
    // (owner directive of 2026-10-12). The current summary is the probe head
    // and the walked path is the scribed trail of prick marks, each its own
    // group, drawn in the kit's ink tones; the one lit part is the kept
    // feeler and its pin, never the path or the head. The distance strip in
    // the method fold paints its current point through the value role.
    // Signal blue stays off the marks' code, and nothing calls any of it
    // green.
    const jepaTable = read('components/iso/figures/planning-table.ts');
    expect(jepaChart).toContain("'walked-path': 'walked-path'");
    expect(jepaChart).toContain("carriage: 'probe-head'");
    expect(jepaTable).toMatch(
      /role: 'walked-path',\s*parts: \[\s*\{ kind: 'line', d: onTop\(history, TABLE_H, P\), tone: 'mid' \},\s*\{ kind: 'dots', [^}]*tone: 'hi' \},\s*\]/,
    );
    expect([...jepaTable.matchAll(/tone: (?:isKept \? )?'lit'|\blit: \w+/g)].map((m) => m[0]))
      .toEqual(["tone: isKept ? 'lit'", 'lit: isKept', "tone: 'lit'"]);
    expect(jepaChart).toContain('<PointMarker x={traceX(steps)} y={traceY(gaps[steps])} role="value" />');
    expect(jepaChart).not.toMatch(/ACCENT|--color-accent/);
    expect(jepaChart).not.toMatch(/green/i);
    expect(jepaTable).not.toMatch(/ACCENT|--color-accent/);
    expect(jepaTable).not.toMatch(/green/i);
    // VAL-OPUS-068: the friction chart's authored status is labelled once, in
    // its frame next to the controls, and the prose disclaimer is gone.
    expect(sim2real).not.toContain('authored toy');
    expect(frictionChart).toContain('<StageStatus>Illustrative, not measured</StageStatus>');
    expect(frictionChart).toMatch(/points=\{polyline\(drCurvePoints\(range\)\)\}[\s\S]*?stroke=\{valueColour\}/);
    expect(advantage).not.toContain('elapsed portion green');
    expect(advantage).not.toMatch(/green (?:line|trace)/i);
  });

  it('keeps semantic colours semantic in the cross-embodiment schematic', () => {
    const cross = read('components/interactive/cross-embodiment-strategies.tsx');
    // The shared-latent slots are a schematic for an undisclosed
    // representation: ok-green is a state colour and "schematic" is not a
    // success state, so the latent must render through a neutral hatch,
    // which is also its non-colour distinction from the action-role active
    // dims.
    expect(cross).not.toContain("latent: 'var(--color-ok)'");
    expect(cross).toContain("latent: 'latent-hatch'");
    expect(cross).toContain('hatched: illustrative link, not model dimensions');
    expect(cross).toContain('patternUnits="userSpaceOnUse"');
    expect(cross).toContain('state === \'latent\' ? `url(#${hatchId})`');
    expect(cross).not.toContain('green</span>: shared latent');
    expect(cross).not.toContain('the green slots on the');
  });

  it('does not draw a chart-like teaser around unsourced quantities', () => {
    const home = read('app/page.tsx');
    // The market-map entry once drew a bubble scatter with a dashed
    // trend line: arbitrary circle radii read as funding values and the
    // diagonal implied a correlation, none of it sourced. The front page
    // now links the map from its tools line as plain text, so home draws
    // no marks for it at all.
    expect(home).toContain('href="/market-map/"');
    expect(home).not.toMatch(/MarketMapPoster|<svg|circle\s+cx=|<path/);
    expect(existsSync(join(process.cwd(), 'components/market-map/market-map-poster.tsx'))).toBe(false);
  });
});

/**
 * Owner-approved successors recorded on 23 October 2026 (brand-v2-interactives
 * round-1 triage): VAL-B2-COMP-007 leaves lime selection for the research-page
 * selected state (owner decision of 10 October 2026), and VAL-B2-VIZ-007 no
 * longer requires a reset control on every mount (owner decision of 2 October
 * 2026, reader-first figures addendum item 4). Each row is pinned verbatim, each
 * clause is pinned on its own so a planted deletion names it, and each row's
 * population is derived from the census registry and must be non-empty.
 */
describe('research-page successors of the chip and figure-default rows', () => {
  type Control = { id: string; treatment: string; persistentAria: string[]; definedIn: string[] };
  type InteractiveSource = { id: string; cases: Array<{ id: string; kind: string }> };
  type InteractiveMount = { id: string; sourceId: string };
  type Registries = {
    controls: Control[];
    interactive: { sources: InteractiveSource[]; mounts: InteractiveMount[] };
  };
  type EnforcementRow = {
    assertionId: string;
    canonicalPopulationSource: string;
    machinePredicate: { populationSize: number; statement: string; expected: string };
  };
  const registries: Registries = JSON.parse(read('contract/brand-v2-registries.json'));
  const enforcement: { rows: EnforcementRow[] } = JSON.parse(read('contract/brand-v2-enforcement-map.json'));
  const rowIn = (text: string, id: string) =>
    text.split('\n').find((line) => line.startsWith(`| \`${id}\``)) ?? '';
  const missing = (line: string, clauses: readonly string[]) => clauses.filter((clause) => !line.includes(clause));
  const withoutClause = (line: string, clause: string) => line.split(clause).join('');

  const COMP_007 =
    '| `VAL-B2-COMP-007` | Selected chips and filter tokens are unfilled, read in ink with a 1 px ink rule or underline (or a weight step of at least 200), and carry a text, icon or shape confirmation plus the semantic state (`aria-pressed`, `aria-selected` or native checked); status chips use the dedicated status colours (green and red outcome marks only) with a text label. Fail on any lime (`#C6FF19`) paint, any colour fill or tint carrying selection, a rounded pill, or a selection carried by colour alone. Same strength: two independent cues, one of them semantic, on every registered chip member at 375 and 1440 px. (Owner decision of 10 October 2026, `PANTHEON-SPEC.md`, `VAL-B2-COL-005`; the brand-v2 row required lime plus text/icon/semantic confirmation.) |';
  const COMP_007_SUPERSEDED =
    '| `VAL-B2-COMP-007` | Selected chips use lime plus text/icon/semantic confirmation. Status chips use dedicated semantic colours. |';
  const COMP_007_CLAUSES = [
    'Selected chips and filter tokens are unfilled',
    'read in ink with a 1 px ink rule or underline',
    '(or a weight step of at least 200)',
    'a text, icon or shape confirmation plus the semantic state (`aria-pressed`, `aria-selected` or native checked)',
    'status chips use the dedicated status colours (green and red outcome marks only) with a text label',
    'Fail on any lime (`#C6FF19`) paint',
    'any colour fill or tint carrying selection',
    'a rounded pill',
    'a selection carried by colour alone',
    'two independent cues, one of them semantic, on every registered chip member at 375 and 1440 px',
    'Owner decision of 10 October 2026, `PANTHEON-SPEC.md`, `VAL-B2-COL-005`',
  ] as const;

  const VIZ_007 =
    '| `VAL-B2-VIZ-007` | Native or equivalent controls work by keyboard, expose state, render visible focus, and return to a deterministic default: where the figure has a reset control, activating it by keyboard restores the exact default state (control values, readouts, drawing state and any running animation stopped); where the figure has no reset control, returning each changed control to its default value by keyboard alone restores the same default state digest, the default value of each control is stated in its visible readout, and any started run ends or can be stopped on the default frame. (Owner decision of 2 October 2026, reader-first figures addendum item 4, no "Reset" unless it is truly needed, under the research-page standard of 10 October 2026, `PANTHEON-SPEC.md`; the brand-v2 row required a return to a deterministic default through reset on every mount. Same strength: every registered mount, by keyboard, with the default state measured.) |';
  const VIZ_007_SUPERSEDED =
    '| `VAL-B2-VIZ-007` | Native or equivalent controls work by keyboard, expose state, render visible focus, and return to a deterministic default through reset. |';
  const VIZ_007_CLAUSES = [
    'Native or equivalent controls work by keyboard, expose state, render visible focus, and return to a deterministic default:',
    'where the figure has a reset control, activating it by keyboard restores the exact default state (control values, readouts, drawing state and any running animation stopped)',
    'where the figure has no reset control, returning each changed control to its default value by keyboard alone restores the same default state digest',
    'the default value of each control is stated in its visible readout',
    'any started run ends or can be stopped on the default frame',
    'Owner decision of 2 October 2026, reader-first figures addendum item 4, no "Reset" unless it is truly needed',
    'Same strength: every registered mount, by keyboard, with the default state measured.',
  ] as const;

  /** Selection controls: the registered members whose persistent state is aria-pressed or aria-selected. */
  const chipMembers = (controls: readonly Control[]) =>
    controls.filter((control) => control.persistentAria.some((aria) => /aria-(?:pressed|selected)/.test(aria)));
  /**
   * A chip member breaks the row when its registered treatment is a fill, a
   * tint, lime or a pill. The segmented row registers its outer frame; its
   * options paint through the same ink-and-underline tab as a selection chip.
   */
  const chipTreatmentFindings = (controls: readonly Control[]) =>
    chipMembers(controls)
      .filter((control) => /lime|fill|tint|pill/i.test(control.treatment))
      .map((control) => control.id);
  /** The row's two branches, each of which must quantify over at least one registered source. */
  const resetBranches = (sources: readonly InteractiveSource[]) => ({
    withReset: sources.filter((source) => source.cases.some((c) => c.kind === 'reset')),
    withoutReset: sources.filter((source) => !source.cases.some((c) => c.kind === 'reset')),
  });
  const enforcementRow = (id: string) => enforcement.rows.find((row) => row.assertionId === id);
  /** The requirement cell of a contract row, which the generated enforcement map copies as its predicate. */
  const requirementOf = (line: string, id: string) => line.slice(`| \`${id}\` | `.length, -' |'.length);

  it('carries the VAL-B2-COMP-007 successor verbatim over a non-empty registered chip population', () => {
    const line = rowIn(integrity, 'VAL-B2-COMP-007');
    expect(line).toBe(COMP_007);
    expect(missing(line, COMP_007_CLAUSES)).toEqual([]);
    expect(integrity).not.toContain(COMP_007_SUPERSEDED);

    const chips = chipMembers(registries.controls);
    expect(chips.length, 'no registered chip member carries persistent selection').toBeGreaterThan(0);
    expect(chips.map((control) => control.id)).toContain('control:selection');
    expect(registries.controls.find((control) => control.id === 'control:selection')?.treatment).toBe(
      'ink-weight-plus-ink-rule',
    );
    for (const chip of chips) expect(chip.definedIn.length, `${chip.id} has no defining source`).toBeGreaterThan(0);
    expect(chipTreatmentFindings(registries.controls)).toEqual([]);

    const mapped = enforcementRow('VAL-B2-COMP-007');
    expect(mapped?.canonicalPopulationSource).toBe('contract/brand-v2-registries.json#controls');
    expect(mapped?.machinePredicate.populationSize).toBe(registries.controls.length);
    expect(mapped?.machinePredicate.statement).toBe(requirementOf(COMP_007, 'VAL-B2-COMP-007'));
    expect(mapped?.machinePredicate.expected).toBe(requirementOf(COMP_007, 'VAL-B2-COMP-007'));
  });

  it('fails the VAL-B2-COMP-007 pin on each planted clause deletion, the superseded row and a broken population', () => {
    for (const clause of COMP_007_CLAUSES) {
      expect(missing(withoutClause(COMP_007, clause), COMP_007_CLAUSES)).toEqual([clause]);
    }
    expect(missing(COMP_007_SUPERSEDED, COMP_007_CLAUSES)).toEqual([...COMP_007_CLAUSES]);
    expect(chipMembers([])).toEqual([]);
    expect(
      chipMembers(registries.controls.map((control) => ({ ...control, persistentAria: [] }))),
      'stripping the semantic state leaves no chip member',
    ).toEqual([]);
    const planted = registries.controls.map((control) =>
      control.id === 'control:selection' ? { ...control, treatment: 'lime-fill-plus-icon' } : control,
    );
    expect(chipTreatmentFindings(planted)).toEqual(['control:selection']);
    const tinted = registries.controls.map((control) =>
      control.id === 'control:segmented' ? { ...control, treatment: 'tinted-tile' } : control,
    );
    expect(chipTreatmentFindings(tinted)).toEqual(['control:segmented']);
  });

  it('carries the VAL-B2-VIZ-007 successor verbatim over non-empty reset and no-reset mount populations', () => {
    const line = rowIn(integrity, 'VAL-B2-VIZ-007');
    expect(line).toBe(VIZ_007);
    expect(missing(line, VIZ_007_CLAUSES)).toEqual([]);
    expect(integrity).not.toContain(VIZ_007_SUPERSEDED);

    const { sources, mounts } = registries.interactive;
    expect(sources.length, 'no registered interactive source').toBeGreaterThan(0);
    expect(mounts.length, 'no registered interactive mount').toBeGreaterThan(0);
    const ids = new Set(sources.map((source) => source.id));
    expect(mounts.filter((mount) => !ids.has(mount.sourceId)).map((mount) => mount.id)).toEqual([]);
    const { withReset, withoutReset } = resetBranches(sources);
    expect(withReset.length, 'the reset branch quantifies over no source').toBeGreaterThan(0);
    expect(withoutReset.length, 'the no-reset branch quantifies over no source').toBeGreaterThan(0);
    expect(withReset.length + withoutReset.length).toBe(sources.length);

    // The row is decided per production mount by the keyboard transition
    // ledger, so it quantifies over every registered mount.
    const mapped = enforcementRow('VAL-B2-VIZ-007');
    expect(mapped?.canonicalPopulationSource).toBe('contract/brand-v2-registries.json#interactive.mounts');
    expect(mapped?.machinePredicate.populationSize).toBe(mounts.length);
    expect(mapped?.machinePredicate.statement).toBe(requirementOf(VIZ_007, 'VAL-B2-VIZ-007'));
    expect(mapped?.machinePredicate.expected).toBe(requirementOf(VIZ_007, 'VAL-B2-VIZ-007'));
  });

  it('fails the VAL-B2-VIZ-007 pin on each planted clause deletion, the superseded row and an empty branch', () => {
    for (const clause of VIZ_007_CLAUSES) {
      expect(missing(withoutClause(VIZ_007, clause), VIZ_007_CLAUSES)).toEqual([clause]);
    }
    expect(missing(VIZ_007_SUPERSEDED, VIZ_007_CLAUSES)).toEqual([...VIZ_007_CLAUSES]);
    const everyReset = registries.interactive.sources.map((source) => ({
      ...source,
      cases: [...source.cases.filter((c) => c.kind !== 'reset'), { id: 'reset', kind: 'reset' }],
    }));
    expect(resetBranches(everyReset).withoutReset).toEqual([]);
    const noReset = registries.interactive.sources.map((source) => ({
      ...source,
      cases: source.cases.filter((c) => c.kind !== 'reset'),
    }));
    expect(resetBranches(noReset).withReset).toEqual([]);
    expect(resetBranches([])).toEqual({ withReset: [], withoutReset: [] });
  });

  /** Mirror lines the design system must carry, and the superseded wording it must not. */
  const MIRROR = [
    'Selected chips and filter tokens are unfilled and read in ink with a 1 px ink rule or underline (or a weight step of at least 200), plus a text, icon or shape confirmation and the semantic state (`aria-pressed`, `aria-selected` or native checked).',
    'No lime, colour fill, tint or rounded pill carries selection, and colour is never the only cue (owner decision of 10 October 2026, `VAL-B2-COMP-007`).',
    'Status chips use the dedicated status colours (green and red outcome marks only) with a text label.',
    'Where the figure has a reset control, activating it by keyboard restores the exact default state; where it has none, returning each changed control to its default value by keyboard restores the same default state',
    '(owner decision of 2 October 2026, no "Reset" unless it is truly needed; `VAL-B2-VIZ-007`)',
    'The selected option takes the research-page selected state: ink weight or a 1 px ink rule, never a colour fill or tint, and a reader\'s committed answer in a prediction step or self-check also carries the "Your pick" marker.',
  ] as const;
  const RETIRED = [
    'Selected filters use lime plus an independent selected indicator.',
    'Selected filters use lime with text/icon confirmation.',
    'a working reset',
    'an ink hairline and a tinted tile',
  ] as const;
  const mirrorFindings = (text: string) => [
    ...missing(text, MIRROR).map((line) => `missing: ${line}`),
    ...RETIRED.filter((line) => text.includes(line)).map((line) => `retired: ${line}`),
  ];

  it('mirrors both successors and the research-page selected option in the design system', () => {
    expect(mirrorFindings(spec)).toEqual([]);
    for (const line of MIRROR) expect(spec.split(line)).toHaveLength(2);
  });

  it('fails the mirror on each planted deletion and each restored retired line', () => {
    for (const line of MIRROR) expect(mirrorFindings(spec.replace(line, ''))).toEqual([`missing: ${line}`]);
    for (const line of RETIRED) expect(mirrorFindings(`${spec}\n${line}`)).toEqual([`retired: ${line}`]);
  });
});
