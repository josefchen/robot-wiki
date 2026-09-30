/**
 * Generates the runtime artifacts of the motion language from
 * motion-tokens.json, the single source of truth:
 *
 *   lib/motion-tokens.ts                     TypeScript constants
 *   components/motion/motion-tokens.css      CSS custom properties
 *   scripts/motion/motion_theme.py           offline clip theme
 *
 * Edit motion-tokens.json, never the generated files. The committed bytes
 * must stay identical to a fresh run (tests/unit/motion-tokens.test.ts).
 *
 *   npm run generate:motion-tokens
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { smooth } from '../components/motion/easing.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'motion-tokens.json');

export interface MotionRole {
  means: string;
  stage: string;
  stageContrast: number;
  lightText: string;
  lightGraphic: string;
  lightGraphicTreatment?: string;
  encoding: string;
}

export interface MotionTokens {
  version: number;
  description: string;
  stage: {
    background: string;
    backgroundToken: string;
    axes: string;
    axesOpacity: number;
    grid: string;
    gridOpacity: number;
    label: string;
    labelSecondary: string;
    labelFont: string;
    labelMinPx: number;
  };
  roles: Record<string, MotionRole>;
  uncertainty: { fillAlpha: number; edge: string };
  easing: {
    smooth: { formula: string; note: string };
    thereAndBack: { formula: string; use: string };
    cssLinearStops: number;
  };
  timing: {
    unit: string;
    beat: number;
    beatShort: number;
    beatLong: number;
    indicate: number;
    create: number;
    createFillTail: number;
    write: number;
    writePerGlyph: number;
    writeMax: number;
    reducedMotionHold: number;
  };
  lag: { default: number; dense: number; denseThreshold: number };
  camera: { focusMaxZoom: number };
  type: {
    stageLabelFont: string;
    stageLabelMinPx: number;
    stageLabelFill: string;
    stageSecondaryFill: string;
    stageReadoutFont: string;
    stageScale: {
      note: string;
      labelPx: number;
      axisPx: number;
      tickPx: number;
      readoutPx: number;
      fullSizeMinStagePx: number;
    };
  };
}

export function loadTokens(): MotionTokens {
  return JSON.parse(readFileSync(SOURCE, 'utf8')) as MotionTokens;
}

/** Brand foundations resolve to the brand custom properties, not copies. */
const BRAND_VAR_BY_HEX: Record<string, string> = {
  '#242D33': 'var(--color-graphite)',
  '#D9DADB': 'var(--color-concrete)',
  '#FFFFFF': 'var(--color-white)',
};

const roleNames = (tokens: MotionTokens): string[] => Object.keys(tokens.roles);

function cssVarName(role: string, variant: 'stage' | 'text' | 'graphic') {
  return `--role-${role}-${variant}`;
}

function sampleSmooth(stops: number): string {
  return Array.from({ length: stops }, (_, i) => smooth(i / (stops - 1)))
    .map((value) => Number(value.toFixed(4)))
    .join(', ');
}

export function buildCss(tokens: MotionTokens): string {
  const lines: string[] = [
    '/*',
    ' * Generated from motion-tokens.json by scripts/generate-motion-tokens.ts.',
    ' * Do not edit: change motion-tokens.json and regenerate. This is the only',
    ' * file under components/motion/ allowed to carry colour literals; the',
    ' * token check enforces that everywhere else.',
    ' */',
    ':root {',
  ];
  for (const role of roleNames(tokens)) {
    lines.push(
      `  ${cssVarName(role, 'stage')}: ${tokens.roles[role].stage};`,
      `  ${cssVarName(role, 'text')}: ${tokens.roles[role].lightText};`,
      `  ${cssVarName(role, 'graphic')}: ${tokens.roles[role].lightGraphic};`,
    );
  }
  const stage = tokens.stage;
  lines.push(
    `  --motion-stage: ${stage.backgroundToken};`,
    `  --motion-stage-axes: ${BRAND_VAR_BY_HEX[stage.axes] ?? stage.axes};`,
    `  --motion-stage-axes-opacity: ${stage.axesOpacity};`,
    `  --motion-stage-grid: ${BRAND_VAR_BY_HEX[stage.grid] ?? stage.grid};`,
    `  --motion-stage-grid-opacity: ${stage.gridOpacity};`,
    `  --motion-stage-label: ${BRAND_VAR_BY_HEX[stage.label] ?? stage.label};`,
    `  --motion-stage-label-secondary: ${
      BRAND_VAR_BY_HEX[stage.labelSecondary] ?? stage.labelSecondary
    };`,
    `  --motion-stage-label-font: ${stage.labelFont};`,
    `  --motion-stage-readout-font: ${tokens.type.stageReadoutFont};`,
    `  --motion-stage-label-size: ${tokens.type.stageScale.labelPx}px;`,
    `  --motion-stage-axis-size: ${tokens.type.stageScale.axisPx}px;`,
    `  --motion-stage-tick-size: ${tokens.type.stageScale.tickPx}px;`,
    `  --motion-stage-readout-size: ${tokens.type.stageScale.readoutPx}px;`,
    `  --motion-stage-type-min-width: ${tokens.type.stageScale.fullSizeMinStagePx}px;`,
    `  --motion-uncertainty-fill-alpha: ${tokens.uncertainty.fillAlpha};`,
  );
  const timing = tokens.timing;
  const timingVars: Array<[string, number]> = [
    ['--motion-beat', timing.beat],
    ['--motion-beat-short', timing.beatShort],
    ['--motion-beat-long', timing.beatLong],
    ['--motion-indicate', timing.indicate],
    ['--motion-create', timing.create],
    ['--motion-write', timing.write],
    ['--motion-write-per-glyph', timing.writePerGlyph],
    ['--motion-write-max', timing.writeMax],
    ['--motion-reduced-hold', timing.reducedMotionHold],
  ];
  for (const [name, ms] of timingVars) lines.push(`  ${name}: ${ms}ms;`);
  lines.push(
    `  --motion-lag: ${tokens.lag.default};`,
    `  --motion-lag-dense: ${tokens.lag.dense};`,
    `  --motion-camera-focus-max-zoom: ${tokens.camera.focusMaxZoom};`,
    `  --motion-ease-smooth: linear(${sampleSmooth(tokens.easing.cssLinearStops)});`,
    '}',
    '',
  );
  return lines.join('\n');
}

export function buildTypeScript(tokens: MotionTokens): string {
  const roles = roleNames(tokens)
    .map((role) => {
      const value = tokens.roles[role];
      const treatment = value.lightGraphicTreatment
        ? `\n    lightGraphicTreatment: '${value.lightGraphicTreatment}',`
        : '';
      return [
        `  ${role}: {`,
        `    means: ${JSON.stringify(value.means)},`,
        `    stage: '${value.stage}',`,
        `    stageContrast: ${value.stageContrast},`,
        `    lightText: '${value.lightText}',`,
        `    lightGraphic: '${value.lightGraphic}',${
          treatment
        }`,
        `    encoding: ${JSON.stringify(value.encoding)},`,
        '  },',
      ].join('\n');
    })
    .join('\n');

  return `/**
 * Generated from motion-tokens.json by scripts/generate-motion-tokens.ts.
 * Do not edit: change motion-tokens.json and regenerate.
 */
export type MotionRoleName =
${roleNames(tokens)
  .map((role) => `  | '${role}'`)
  .join('\n')};

export type MotionRoleVariant = 'stage' | 'text' | 'graphic';

export interface MotionRole {
  means: string;
  stage: string;
  stageContrast: number;
  lightText: string;
  lightGraphic: string;
  lightGraphicTreatment?: string;
  encoding: string;
}

/** The semantic colour roles. The same quantity has the same colour on every page. */
export const MOTION_ROLES: Record<MotionRoleName, MotionRole> = {
${roles}
};

/** CSS custom property reference for a role variant, e.g. var(--role-state-stage). */
export function motionRoleVar(
  role: MotionRoleName,
  variant: MotionRoleVariant,
): string {
  return \`var(--role-\${role}-\${variant})\`;
}

/** The graphite stage and its structure, resolved from the brand tokens. */
export const MOTION_STAGE = {
  background: '${tokens.stage.backgroundToken}',
  axes: '${BRAND_VAR_BY_HEX[tokens.stage.axes] ?? tokens.stage.axes}',
  axesOpacity: ${tokens.stage.axesOpacity},
  grid: '${BRAND_VAR_BY_HEX[tokens.stage.grid] ?? tokens.stage.grid}',
  gridOpacity: ${tokens.stage.gridOpacity},
  label: '${BRAND_VAR_BY_HEX[tokens.stage.label] ?? tokens.stage.label}',
  labelSecondary: '${
    BRAND_VAR_BY_HEX[tokens.stage.labelSecondary] ?? tokens.stage.labelSecondary
  }',
  labelFont: '${tokens.stage.labelFont}',
  labelMinPx: ${tokens.stage.labelMinPx},
} as const;

/**
 * The stage type scale in painted CSS pixels. components/motion/stage.css
 * divides each size by the stage's current scale, so these hold on every
 * stage at least fullSizeMinStagePx wide; a narrower stage shrinks whole.
 */
export const MOTION_STAGE_TYPE = {
  labelFont: '${tokens.type.stageLabelFont}',
  readoutFont: '${tokens.type.stageReadoutFont}',
  minPx: ${tokens.type.stageLabelMinPx},
  labelPx: ${tokens.type.stageScale.labelPx},
  axisPx: ${tokens.type.stageScale.axisPx},
  tickPx: ${tokens.type.stageScale.tickPx},
  readoutPx: ${tokens.type.stageScale.readoutPx},
  fullSizeMinStagePx: ${tokens.type.stageScale.fullSizeMinStagePx},
} as const;

/** Uncertainty is not its own colour: the object's hue at 22% with a dashed edge. */
export const MOTION_UNCERTAINTY = {
  fillAlpha: ${tokens.uncertainty.fillAlpha},
  edge: '${tokens.uncertainty.edge}',
} as const;

/** Beat durations in milliseconds. UI micro-transitions keep the brand's short timings and are not beats. */
export const MOTION_TIMING = {
  beat: ${tokens.timing.beat},
  beatShort: ${tokens.timing.beatShort},
  beatLong: ${tokens.timing.beatLong},
  indicate: ${tokens.timing.indicate},
  create: ${tokens.timing.create},
  createFillTail: ${tokens.timing.createFillTail},
  write: ${tokens.timing.write},
  writePerGlyph: ${tokens.timing.writePerGlyph},
  writeMax: ${tokens.timing.writeMax},
  reducedMotionHold: ${tokens.timing.reducedMotionHold},
} as const;

export const MOTION_LAG = {
  default: ${tokens.lag.default},
  dense: ${tokens.lag.dense},
  denseThreshold: ${tokens.lag.denseThreshold},
} as const;

export const MOTION_EASING = {
  smoothFormula: '${tokens.easing.smooth.formula}',
  thereAndBackFormula: '${tokens.easing.thereAndBack.formula}',
  cssLinearStops: ${tokens.easing.cssLinearStops},
} as const;
`;
}

export function buildPythonTheme(tokens: MotionTokens): string {
  const roles = roleNames(tokens)
    .map((role) => `    '${role}': '${tokens.roles[role].stage}',`)
    .join('\n');
  const encodings = roleNames(tokens)
    .map((role) => `    '${role}': ${JSON.stringify(tokens.roles[role].encoding)},`)
    .join('\n');
  return `"""Generated from motion-tokens.json by scripts/generate-motion-tokens.ts.

Theme module for offline cinematic clips. The renderer's own default
smooth() is a different sigmoid, so smooth() here overrides it with the
motion language's curve. Keep this file generated.
"""

STAGE_BACKGROUND = "${tokens.stage.background}"
STAGE_AXES = "${tokens.stage.axes}"
STAGE_AXES_OPACITY = ${tokens.stage.axesOpacity}
STAGE_GRID_OPACITY = ${tokens.stage.gridOpacity}
STAGE_LABEL = "${tokens.stage.label}"
STAGE_LABEL_SECONDARY = "${tokens.stage.labelSecondary}"

ROLE_COLORS = {
${roles}
}

ROLE_ENCODINGS = {
${encodings}
}

UNCERTAINTY_FILL_ALPHA = ${tokens.uncertainty.fillAlpha}

# Seconds. The beat ladder matches the web tokens exactly.
BEAT = ${(tokens.timing.beat / 1000).toFixed(3)}
BEAT_SHORT = ${(tokens.timing.beatShort / 1000).toFixed(3)}
BEAT_LONG = ${(tokens.timing.beatLong / 1000).toFixed(3)}
INDICATE = ${(tokens.timing.indicate / 1000).toFixed(3)}
CREATE = ${(tokens.timing.create / 1000).toFixed(3)}
WRITE = ${(tokens.timing.write / 1000).toFixed(3)}

LAG_DEFAULT = ${tokens.lag.default}
LAG_DENSE = ${tokens.lag.dense}
LAG_DENSE_THRESHOLD = ${tokens.lag.denseThreshold}


def smooth(t: float) -> float:
    """The motion language's eased-motion curve, overriding the renderer default."""
    t = min(1.0, max(0.0, t))
    return t ** 3 * (10 * (1 - t) ** 2 + 5 * t * (1 - t) + t ** 2)


def there_and_back(t: float) -> float:
    t = min(1.0, max(0.0, t))
    return smooth(2 * t) if t < 0.5 else smooth(2 - 2 * t)
`;
}

function main(): void {
  const tokens = loadTokens();
  const outputs: Array<[string, string]> = [
    ['lib/motion-tokens.ts', buildTypeScript(tokens)],
    ['components/motion/motion-tokens.css', buildCss(tokens)],
    ['scripts/motion/motion_theme.py', buildPythonTheme(tokens)],
  ];
  for (const [relative, text] of outputs) {
    const path = join(ROOT, relative);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
  console.log(
    `motion tokens: generated ${outputs.length} artifacts from motion-tokens.json`,
  );
}

const isDirectRun =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) main();
