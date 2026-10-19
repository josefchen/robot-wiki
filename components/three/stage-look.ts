import { Color, MeshStandardMaterial, SRGBColorSpace } from 'three';
import { BRAND_COLORS } from '@/lib/brand-v2-tokens';

/**
 * The playground's look, borrowed from the /how-robots-work/ explainers so
 * the two 3D pages read as one family: a light matte clay arm with dark
 * motors, one soft key-light shadow on the page's own paper, and one muted
 * accent for the part the reader is working with.
 *
 * WebGL cannot read CSS custom properties, so the colours are derived here
 * from the renderer mirror in lib/brand-v2-tokens.ts, which a unit test
 * holds equal to app/globals.css. The clay and motor greys repeat the
 * explainers' `color-mix(in srgb, ...)` declarations in
 * components/explainers/explainers.css, and the light rig repeats the
 * explainer stage in components/explainers/kit.js; tests/unit/
 * playground-stage-look.test.ts reads both files, so a change there fails
 * until the playground follows.
 */

function channels(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** An sRGB colour as gamma-encoded channels in 0..1, exact (no byte rounding). */
export type SrgbTriplet = readonly [number, number, number];

export function hexToSrgb(hex: string): SrgbTriplet {
  const [r, g, b] = channels(hex);
  return [r / 255, g / 255, b / 255];
}

/**
 * `color-mix(in srgb, a, b share)`: a straight blend of the gamma-encoded
 * channels, kept as floats the way the browser resolves the mix.
 */
export function mixSrgb(a: string, b: string, share: number): SrgbTriplet {
  const from = hexToSrgb(a);
  const to = hexToSrgb(b);
  return [0, 1, 2].map((i) => from[i] * (1 - share) + to[i] * share) as unknown as SrgbTriplet;
}

/** The colour three.js should paint for an sRGB triplet. */
export function srgbColor([r, g, b]: SrgbTriplet): Color {
  return new Color().setRGB(r, g, b, SRGBColorSpace);
}

/** The explainers' `--clay` and `--dark` mixes, as fractions. */
export const CLAY_MIX = { graphiteInClay: 0.09, concreteInDark: 0.22 } as const;

/** The table disc and its rings, mixed toward the page's own concrete and graphite. */
export const FLOOR_MIX = { concreteInFloor: 0.26, graphiteInRing: 0.16 } as const;

/** The table disc: its radius and the spacing of its rings, metres. */
export const FLOOR = { radius: 0.4, ringStep: 0.1 } as const;

export const PLAYGROUND_COLORS = {
  /** The canvas clears to the page ground, so the arm sits on the page. */
  paper: hexToSrgb(BRAND_COLORS.paper),
  /** Printed structure: `--clay`. */
  clay: mixSrgb(BRAND_COLORS.concrete, BRAND_COLORS.graphite, CLAY_MIX.graphiteInClay),
  /** Motors: `--dark`. */
  dark: mixSrgb(BRAND_COLORS.graphite, BRAND_COLORS.concrete, CLAY_MIX.concreteInDark),
  /**
   * The semantic error token, for the one outcome mark the scene draws: the
   * dashed gap the hand stops short by when a target is out of reach. The
   * words under the stage ("Out of reach, 24 cm short") and the dashed shape
   * carry the same verdict, so colour is never the only cue.
   */
  miss: hexToSrgb(BRAND_COLORS.error),
  /**
   * The table under the arm: a disc one step darker than the paper, the way
   * the site separates surfaces by a tone step, with faint rings every 10 cm
   * so a reader sees where to click and how far the hand is from the base.
   */
  floor: mixSrgb(BRAND_COLORS.paper, BRAND_COLORS.concrete, FLOOR_MIX.concreteInFloor),
  floorRing: mixSrgb(BRAND_COLORS.paper, BRAND_COLORS.graphite, FLOOR_MIX.graphiteInRing),
  /** The one accent: the motor being moved and the reach target (`--accent`). */
  accent: hexToSrgb(BRAND_COLORS.signal),
} as const;

/** The explainer stage's light rig (kit.js `Stage`), at the arm scene's scale. */
export const STAGE_LIGHTS = {
  /** The arm explainer calls `stage.setScale(0.45)`; positions scale with it. */
  size: 0.45,
  hemisphere: { sky: '#FFFFFF', ground: '#9A958C', intensity: 1.55 },
  key: {
    intensity: 2.1,
    /** Multiplied by `size`. */
    direction: [0.9, 2.0, 0.8] as const,
    mapSize: 2048,
    radius: 5,
    bias: -0.0004,
    /** Half-width of the shadow camera, multiplied by `size`. */
    extent: 1.4,
  },
  fill: { intensity: 0.65, position: [-0.8, 0.5, -0.7] as const },
  /** The explainers' `--shadow` token: the floor shows only the arm's shadow. */
  floorShadowOpacity: 0.13,
  material: { roughness: 0.8, metalness: 0 },
  accentRoughness: 0.6,
} as const;

/**
 * The explainer camera: 30 degrees of vertical field on a 16:10 stage, and
 * on a narrower stage enough field to keep the same horizontal view, so a
 * phone sees the whole arm (kit.js `Stage.resize`).
 */
export function stageFov(aspect: number): number {
  const halfWidth = Math.atan(Math.tan((15 * Math.PI) / 180) * 1.6);
  return Math.max(30, (2 * Math.atan(Math.tan(halfWidth) / aspect) * 180) / Math.PI);
}

function matte(colour: SrgbTriplet, roughness: number = STAGE_LIGHTS.material.roughness) {
  return new MeshStandardMaterial({
    color: srgbColor(colour),
    roughness,
    metalness: STAGE_LIGHTS.material.metalness,
  });
}

/** Shared materials: one per role, so recolouring a motor is a swap. */
export const PLAYGROUND_MATERIALS = {
  clay: matte(PLAYGROUND_COLORS.clay),
  dark: matte(PLAYGROUND_COLORS.dark),
  accent: matte(PLAYGROUND_COLORS.accent, STAGE_LIGHTS.accentRoughness),
} as const;
PLAYGROUND_MATERIALS.clay.name = 'playground-clay';
PLAYGROUND_MATERIALS.dark.name = 'playground-motor';
PLAYGROUND_MATERIALS.accent.name = 'playground-accent';
