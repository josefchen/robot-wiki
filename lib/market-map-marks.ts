/**
 * How the market map and the credits page size and place each company mark.
 *
 * Every mark is drawn plate-less, as a single-ink silhouette of its file's
 * alpha (components/ui/logo-mark.tsx). The files under public/images/logos
 * and their registry entries (data/logos.ts, data/logo-images.ts) change
 * only through a sourced replacement recorded in audit/market-map.md;
 * nothing here edits, recolours or cuts a file. What this module decides:
 *
 * - Size by artwork, not by file box. Some files carry wide transparent
 *   margins (the Boston Dynamics file is a square with the wordmark in its
 *   middle quarter). scripts/measure-logo-marks.ts records the box of every
 *   pixel with any opacity; the mark is sized to that box and the file is
 *   positioned so the box fills it. Only fully transparent margin falls
 *   outside, so no artwork is cut. A file that fills its own box records
 *   no box and is placed whole.
 * - One visual weight for every mark. A square symbol and a twelve-to-one
 *   wordmark drawn at one height look nothing alike, and a heavy slab of
 *   ink outweighs a hairline wordmark of the same size. Each preset gives
 *   every mark about the same area, nudged by how much of its box the ink
 *   fills (the measured `ink`), within a height range: the widest
 *   wordmarks keep a legible height (Apptronik drew 7 px high in the old
 *   fixed 96 x 36 tile; it now draws at least 10 px) and square marks do
 *   not outgrow the line they sit on.
 * - Never a blob. A mask is only as good as its alpha: a file with an
 *   opaque background or a badge read by its internal colours would draw
 *   as a solid block. The measured `ink` is the mask's fill, and the unit
 *   tests refuse any drawn mark whose fill says it is a block.
 * - Never a wrong mark. A file that turns out to show another company's
 *   artwork is withheld here, by file hash, with the reason; the company's
 *   name is shown as text instead until a correct official mark with its
 *   provenance is registered. A withheld entry stops applying the moment
 *   the file changes, and the unit tests then require it to be removed.
 */
import type { CompanyLogoAsset } from '@/data/logos';

export type MarkBox = readonly [x0: number, y0: number, x1: number, y1: number];

export type MarkPlacement = {
  /** First 16 hex digits of the file's SHA-256 when it was measured. */
  sha256: string;
  /** Artwork bounds as fractions of the file box, or null when it fills it. */
  box: MarkBox | null;
  /** Mean opacity inside the artwork box: how much of it the ink fills, 0 to 1. */
  ink: number;
};

// BEGIN measured marks (written by scripts/measure-logo-marks.ts)
export const MARK_PLACEMENT: Readonly<Record<string, MarkPlacement>> = {
  '1x-technologies-logo': { sha256: 'fed812300cdcf902', box: [0, 0, 0.9895, 1], ink: 0.215 },
  'abb-logo': { sha256: 'c69ccbe3325b56e7', box: [0.0105, 0.0264, 0.9895, 0.9736], ink: 0.627 },
  'agibot-logo': { sha256: '83535ee96d57a776', box: [0.0041, 0.0517, 1, 0.9656], ink: 0.199 },
  'agility-robotics-logo': { sha256: '002ec3a67ac2d4b4', box: null, ink: 0.338 },
  'amazon-robotics-logo': { sha256: '2a9bbfe5cefc4c98', box: null, ink: 0.16 },
  'ambirobotics-logo': { sha256: '01bedd4837d4db48', box: [0, 0, 0.9915, 0.9987], ink: 0.343 },
  'anduril-logo': { sha256: 'fcdf6ed0f6f58d5e', box: null, ink: 0.318 },
  'applied-intuition-logo': { sha256: '28400c3bf1cf3d11', box: [0.14, 0.099, 0.86, 0.901], ink: 0.323 },
  'apptronik-logo': { sha256: '1de32fafc1067e0c', box: null, ink: 0.25 },
  'assured-robot-intelligence-logo': { sha256: '30e8b908eff58d07', box: null, ink: 0.991 },
  'astribot-logo': { sha256: 'dcaf7edf89799411', box: [0, 0.2755, 1, 0.7194], ink: 0.346 },
  'automata-logo': { sha256: '0eadf9a3bd83239a', box: null, ink: 0.308 },
  'avidbots-logo': { sha256: '46f75ea35aafb81f', box: [0.0125, 0.0495, 0.9875, 0.939], ink: 0.402 },
  'bedrock-robotics-logo': { sha256: 'ef7725a7c0fb1b6e', box: [0.0035, 0.0262, 0.9965, 0.9738], ink: 0.388 },
  'berkshire-grey-logo': { sha256: 'a435d21bd91e231a', box: null, ink: 0.278 },
  'booster-robotics-logo': { sha256: 'e6ad6a165f2499f7', box: [0.062, 0.1035, 0.9175, 0.8965], ink: 0.855 },
  'boston-dynamics-logo': { sha256: 'd5f3c7c5371e487c', box: [0, 0.3825, 1, 0.618], ink: 0.198 },
  'brain-corp-logo': { sha256: '407e78af7411b004', box: null, ink: 0.285 },
  'carbon-robotics-logo': { sha256: '563b8cc9e28c68c1', box: null, ink: 0.441 },
  'chef-robotics-logo': { sha256: 'c032cbb38784252c', box: [0.0225, 0.1995, 0.987, 0.8616], ink: 0.294 },
  'clone-robotics-logo': { sha256: 'dda91af74f7dfd91', box: null, ink: 0.295 },
  'cmr-surgical-logo': { sha256: '18121d407b7da687', box: [0.0405, 0.0816, 0.9635, 0.9242], ink: 0.236 },
  'coco-robotics-logo': { sha256: 'a631b8e840f671e2', box: null, ink: 0.347 },
  'collaborative-robotics-logo': { sha256: '812ff81760dea8dc', box: [0, 0, 0.992, 1], ink: 0.306 },
  'covariant-logo': { sha256: 'f3b4b71e2da692e1', box: [0, 0, 0.972, 0.972], ink: 0.25 },
  'deep-robotics-logo': { sha256: 'e4bbdd82cf0fca94', box: null, ink: 0.298 },
  'dexterity-logo': { sha256: '1d8250fab6d44a29', box: null, ink: 0.512 },
  'diligent-robotics-logo': { sha256: 'f44d30dd0b8bea2d', box: null, ink: 0.371 },
  'dyna-robotics-logo': { sha256: 'ff25acc405ad3892', box: null, ink: 0.329 },
  'eka-robotics-logo': { sha256: '9f5e876be3125938', box: null, ink: 0.48 },
  'encord-logo': { sha256: '7053e234155595f4', box: null, ink: 0.593 },
  'engineai-logo': { sha256: '2f6e25ab155f8b00', box: [0.1513, 0.3107, 0.8477, 0.6872], ink: 0.386 },
  'farm-ng-logo': { sha256: 'afce0abf0c8a8fbb', box: null, ink: 0.156 },
  'field-ai-logo': { sha256: '35ea012d62b6d0bd', box: [0.016, 0.0527, 0.984, 0.9473], ink: 0.478 },
  'figure-ai-logo': { sha256: '01566fa8768852f2', box: null, ink: 0.31 },
  'formic-logo': { sha256: '2321647ef9c5751d', box: null, ink: 0.261 },
  'foundry-robotics-logo': { sha256: 'ad9abd8bd0ebe40d', box: [0.0395, 0.0395, 0.9605, 0.9605], ink: 0.462 },
  'fourier-intelligence-logo': { sha256: '898ede3483071d3e', box: [0.0375, 0.136, 0.9625, 0.864], ink: 0.46 },
  'fox-robotics-logo': { sha256: '21fb2728292a852d', box: null, ink: 0.41 },
  'galaxea-ai-logo': { sha256: '343665114cf5ee3a', box: null, ink: 0.255 },
  'galbot-logo': { sha256: '78ff7309207722d2', box: [0, 0, 0.999, 0.9904], ink: 0.306 },
  'gecko-robotics-logo': { sha256: '7f3c4d161eba6758', box: null, ink: 0.399 },
  'generalist-ai-logo': { sha256: '692bf5f9ff66640b', box: [0.029, 0.0465, 0.9615, 0.9535], ink: 0.459 },
  'genesis-ai-logo': { sha256: 'f68da5b54cd5ff74', box: [0.044, 0.1414, 0.9925, 0.864], ink: 0.173 },
  'google-deepmind-robotics-logo': { sha256: 'a0ef252f512e9750', box: null, ink: 0.286 },
  'hanson-robotics-logo': { sha256: 'a9b6f489c4f29018', box: [0.0272, 0.102, 0.9778, 0.884], ink: 0.219 },
  'harmonic-drive-logo': { sha256: '9d3fef6d80f0549a', box: null, ink: 0.249 },
  'hugging-face-logo': { sha256: '87ac947dc4f0a914', box: [0.0925, 0.12, 0.9075, 0.88], ink: 0.533 },
  'humanoid-uk-logo': { sha256: '0a86825d0538deb5', box: [0, 0, 0.9985, 0.9843], ink: 0.187 },
  'intuitive-surgical-logo': { sha256: 'c264280dd715519a', box: null, ink: 0.077 },
  'irobot-logo': { sha256: '51fd0c843c51c51a', box: [0.005, 0.0252, 0.995, 0.9748], ink: 0.56 },
  'k-scale-labs-logo': { sha256: 'a1dc6c50310938f0', box: [0.24, 0.24, 0.76, 0.76], ink: 0.225 },
  'kepler-robot-logo': { sha256: 'a7b25f1c66388042', box: null, ink: 0.725 },
  'knightscope-logo': { sha256: 'de4251964dac0e53', box: [0.1555, 0.217, 0.8445, 0.7835], ink: 0.619 },
  'leaderdrive-logo': { sha256: '60e53357da59e15d', box: null, ink: 0.285 },
  'leju-robotics-logo': { sha256: 'f2d13ed0347a84ca', box: null, ink: 0.316 },
  'lila-sciences-logo': { sha256: '62a4bb93c1a0f5d6', box: [0, 0, 0.999, 0.971], ink: 0.063 },
  'limx-dynamics-logo': { sha256: '0322dd27750096f9', box: null, ink: 0.238 },
  'locus-robotics-logo': { sha256: 'f4bdece2a435e15c', box: null, ink: 0.161 },
  'mentee-robotics-logo': { sha256: '334175e1e217e684', box: [0, 0.0357, 1, 0.9881], ink: 0.378 },
  'meta-logo': { sha256: 'b536f39ac80d6b93', box: null, ink: 0.39 },
  'micro1-logo': { sha256: 'd47e282dc81a7794', box: [0.005, 0.0356, 1, 0.9644], ink: 0.415 },
  'mind-robotics-logo': { sha256: '032c5a7e93709171', box: null, ink: 0.686 },
  'miso-robotics-logo': { sha256: 'eeec45cbe291e5cc', box: [0, 0, 0.992, 0.9524], ink: 0.41 },
  'mitsubishi-logo': { sha256: '2826c5feb21cb65d', box: null, ink: 0.334 },
  'monarch-tractor-logo': { sha256: '10873f36357e20a2', box: [0.0422, 0.0714, 0.96, 0.9108], ink: 0.292 },
  'moon-surgical-logo': { sha256: '563c280af7f6cbe4', box: null, ink: 0.17 },
  'mujin-logo': { sha256: '268442b95bc2e4d5', box: null, ink: 0.16 },
  'mytra-logo': { sha256: '3811b93d99a26e74', box: [0.189, 0.079, 0.7836, 0.9519], ink: 0.545 },
  'nabtesco-logo': { sha256: 'afb339191e3e2bed', box: [0.0155, 0.0828, 0.9845, 0.9172], ink: 0.441 },
  'neura-robotics-logo': { sha256: 'd3c10bb5d383131f', box: [0, 0, 1, 0.9875], ink: 0.405 },
  'nimble-robotics-logo': { sha256: '6919f3a3da946bf4', box: null, ink: 0.259 },
  'nuro-logo': { sha256: 'ba113d2231f9feab', box: null, ink: 0.567 },
  'nvidia-logo': { sha256: '6dce22178611da6f', box: null, ink: 0.566 },
  'openai-logo': { sha256: '6e4c87d52178f470', box: null, ink: 0.348 },
  'paxini-logo': { sha256: 'b2a88d6738e47e51', box: null, ink: 0.38 },
  'persona-ai-logo': { sha256: '227f525b24a620e9', box: [0.0066, 0.1029, 0.9934, 0.8677], ink: 0.149 },
  'physical-intelligence-logo': { sha256: 'e9d0c305d49f04ed', box: [0, 0.015, 1, 0.985], ink: 0.424 },
  'plus-one-robotics-logo': { sha256: '6495996b5ac0c095', box: [0.0053, 0, 1, 1], ink: 0.207 },
  'pollen-robotics-logo': { sha256: 'ccae1aa71a658d59', box: [0, 0.0816, 0.994, 0.9184], ink: 0.201 },
  'rainbow-robotics-logo': { sha256: '801d3b9dc5962665', box: null, ink: 0.467 },
  'rhoda-ai-logo': { sha256: 'b4e18713c8a5bf99', box: null, ink: 0.287 },
  'righthand-robotics-logo': { sha256: '5113850e9b0c22ce', box: null, ink: 0.229 },
  'robot-era-logo': { sha256: '621f1d9593021fe9', box: null, ink: 0.222 },
  'robotphoenix-logo': { sha256: '179278412caad478', box: [0.028, 0.1, 0.988, 0.83], ink: 0.429 },
  'sanctuary-ai-logo': { sha256: '43a372ecc8ed4a5f', box: [0.0888, 0.0962, 0.9112, 0.9038], ink: 0.305 },
  'sanhua-logo': { sha256: '0aac0945e8f059ee', box: null, ink: 0.657 },
  'saronic-logo': { sha256: 'fc59d18b3f78246c', box: null, ink: 0.269 },
  'serve-robotics-logo': { sha256: '0d564558c0025844', box: [0, 0, 0.9975, 0.985], ink: 0.192 },
  'shadow-robot-logo': { sha256: 'cfd4a606a4a972da', box: null, ink: 0.42 },
  'sharpa-logo': { sha256: '3d9e5fa6ebc4b5ad', box: null, ink: 0.357 },
  'simbe-robotics-logo': { sha256: '6013877698d7c394', box: [0.0035, 0.0143, 0.994, 0.9919], ink: 0.23 },
  'skild-ai-logo': { sha256: '92003d2acb370b3a', box: null, ink: 0.205 },
  'spirit-ai-logo': { sha256: 'a5dc5cb85406b0a1', box: [0.0045, 0.0208, 0.9995, 0.9804], ink: 0.304 },
  'standard-bots-logo': { sha256: 'f2075bb7562a6f31', box: [0.005, 0, 0.992, 1], ink: 0.267 },
  'starship-logo': { sha256: '95c2e46e3a137b3d', box: [0.004, 0.0263, 0.996, 0.9737], ink: 0.611 },
  'sunday-robotics-logo': { sha256: 'afbe6d1eb3fd3f54', box: null, ink: 0.452 },
  'switchbot-logo': { sha256: '637e5358ea2dd3d2', box: [0.0833, 0.1923, 0.9167, 0.8077], ink: 0.359 },
  'symbotic-logo': { sha256: '5fafb29fb45cf5bd', box: null, ink: 0.365 },
  'tars-robotics-logo': { sha256: '1e6a98c085a34a4b', box: null, ink: 0.377 },
  'tesla-logo': { sha256: '63dffdd057fb53b0', box: null, ink: 0.195 },
  'the-bot-company-logo': { sha256: '0f176f24c2a76466', box: null, ink: 0.709 },
  'ubtech-logo': { sha256: '74ec0762eb27cb88', box: null, ink: 0.306 },
  'unitree-logo': { sha256: 'f2ace736d962af69', box: [0.014, 0.0779, 0.9905, 0.9288], ink: 0.351 },
  'wandercraft-logo': { sha256: '893924f1b4720abe', box: [0.094, 0.3278, 0.906, 0.675], ink: 0.283 },
  'weave-robotics-logo': { sha256: 'fadd6aab37e07d0d', box: null, ink: 0.377 },
  'wonik-logo': { sha256: '38b3b2f6d95e5e83', box: null, ink: 0.34 },
  'x-square-robot-logo': { sha256: '33720bc0f5f50d78', box: [0, 0, 0.9965, 0.9907], ink: 0.5 },
  'xdof-logo': { sha256: 'd84b3153e485bc8e', box: null, ink: 0.43 },
  'xela-robotics-logo': { sha256: '65dc79101ec44bcd', box: null, ink: 0.449 },
  'zebra-robotics-automation-logo': { sha256: 'ce8b05726abeb220', box: [0, 0, 1, 0.994], ink: 0.289 },
};
// END measured marks

export type WithheldMark = {
  /** SHA-256 of the withheld file; the withholding applies to these bytes only. */
  sha256: string;
  /** Why the file is not shown, in words a reader can be shown. */
  reason: string;
  /** The day the file was checked and withheld. */
  recorded: string;
};

/**
 * Registered company-mark files that do not show the company's mark. The
 * registry entry stays, but no page draws the file: the map shows the
 * company's name as text and its details say why, and /credits, which
 * credits what the site shows, leaves it out. Remove an entry once the
 * registry points at a correct official mark with recorded provenance
 * (Nimble's and Farm-ng's were, on 19 October 2026: audit/market-map.md).
 */
export const WITHHELD_MARKS: Readonly<Record<string, WithheldMark>> = {
  'assured-robot-intelligence-logo': {
    sha256: '30e8b908eff58d0754231b77d6b9d7c7f1163bd0b05e0207df59e65a6601786e',
    reason:
      'The file on record is the “TD.” icon of a domain-sale page at ari.bot, a domain that was never the company’s; its own site showed its name in type, with no logo file.',
    recorded: '2026-10-19',
  },
};

export function withheldMark(logoId: string | null): WithheldMark | null {
  return logoId ? (WITHHELD_MARKS[logoId] ?? null) : null;
}

/** How a mark's file becomes its mask. */
export type MarkInk = 'alpha' | 'light' | 'dark';

export type LuminanceMask = {
  /** SHA-256 of the file the mask is derived from; the mask applies to these bytes only. */
  sha256: string;
  /** light: the file's light parts are the ink; dark: its dark parts are, its white parts cut out. */
  ink: 'light' | 'dark';
  /** Why the file's alpha alone would not do, and what the reader now sees. */
  reason: string;
  /** The day the mask was checked on a contact sheet. */
  recorded: string;
};

/**
 * Marks drawn by a luminance-derived mask: their file's alpha is a solid
 * badge, and neither the company's site nor a brand page offered a
 * transparent or one-colour version on 19 October 2026. The file is not
 * edited; the mask reads its colours (luminance of the sRGB-encoded
 * channels, as the browser computes a luminance mask):
 *
 * - light: ink = luminance x alpha. A white glyph on a dark badge keeps its
 *   glyph; the badge, at luminance 0, drops out.
 * - dark: ink = alpha x (1 - luminance x alpha). Dark type and a coloured
 *   badge are the ink and the badge's white glyph is cut out of it.
 *
 * Each cut-out was checked on a contact sheet (audit/market-map.md). Like a
 * withholding, an entry stops applying the moment its file changes, and the
 * unit tests then require it to be reviewed.
 */
export const LUMINANCE_MASKS: Readonly<Record<string, LuminanceMask>> = {
  'k-scale-labs-logo': {
    sha256: 'a1dc6c50310938f0d90be4304cd1a19fd58c3cf85bc8d049784911e9a1ad1f1a',
    ink: 'light',
    reason: 'The file is the company’s white mark on a black square; the white mark is drawn and the square drops out.',
    recorded: '2026-10-19',
  },
  'miso-robotics-logo': {
    sha256: 'eeec45cbe291e5ccd24259fbcbd4f856d16f47dc296f7ae5cd981e648a84fddf',
    ink: 'dark',
    reason: 'The purple badge beside the wordmark would draw as a plain square; its white onion is cut out of it.',
    recorded: '2026-10-19',
  },
  'rainbow-robotics-logo': {
    sha256: '801d3b9dc5962665b80316dc5825f286a7112c9db73b79281355a7a9e2264344',
    ink: 'dark',
    reason: 'The red badge beside the wordmark would draw as a plain square; its white “rb” is cut out of it.',
    recorded: '2026-10-19',
  },
  'sanhua-logo': {
    sha256: '0aac0945e8f059ee33a25d3415440ba3d655f79d662d78232aaac207a6bac60e',
    ink: 'dark',
    reason: 'The file is a blue badge holding three white flowers; the badge is drawn with the flowers cut out of it.',
    recorded: '2026-10-19',
  },
};

export function markInk(logoId: string | null): MarkInk {
  return (logoId && LUMINANCE_MASKS[logoId]?.ink) || 'alpha';
}

export type MarkPreset = 'tile' | 'sheet' | 'credits';

type PresetSize = {
  /** Area every mark is drawn at before its ink weighting, in square CSS pixels. */
  area: number;
  minHeight: number;
  maxHeight: number;
  maxWidth: number;
};

/**
 * Three sizes: the map tile, the detail view and the credits entry. The
 * floors are what keep a wide wordmark readable: on a tile every mark
 * draws at least 10 px high (Apptronik, 7.4 px in the old tile, draws 10.8 px)
 * and fits a desktop tile (143 px wide at 1280 px); narrower phone tiles
 * scale the mark down whole.
 */
export const MARK_PRESETS: Readonly<Record<MarkPreset, PresetSize>> = {
  tile: { area: 680, minHeight: 10.5, maxHeight: 18, maxWidth: 132 },
  sheet: { area: 2200, minHeight: 16, maxHeight: 36, maxWidth: 240 },
  credits: { area: 5200, minHeight: 24, maxHeight: 56, maxWidth: 300 },
};

/**
 * Optical weight. A mark's ink is the share of its artwork box it fills;
 * the area it is drawn at is scaled by the square root of INK_REFERENCE
 * over that share, within INK_WEIGHT, so a hairline wordmark grows a
 * little and a solid slab shrinks a little (a heavy mark's height cap
 * shrinks with it), and the grid reads even.
 */
export const INK_REFERENCE = 0.33;
export const INK_WEIGHT = { min: 0.75, max: 1.45 } as const;

/**
 * The fill at which a mask stops being a mark and reads as a block: a file
 * with an opaque background, or a badge whose meaning is its internal
 * colour, draws as one solid shape. No drawn mark may reach it.
 */
export const BLOCK_FILL = 0.88;

export type MarkGeometry = {
  /** The drawn artwork box. */
  box: { width: number; height: number };
  /** The file's full box inside it, relative to the artwork box's corner. */
  image: { left: number; top: number; width: number; height: number };
};

const round = (value: number) => Math.round(value * 100) / 100;

/** Width over height of the artwork itself. */
export function markRatio(asset: CompanyLogoAsset, placement: MarkPlacement | undefined): number {
  const box = placement?.box ?? [0, 0, 1, 1];
  return ((box[2] - box[0]) * asset.width) / ((box[3] - box[1]) * asset.height);
}

/** The factor a mark's area is scaled by for its ink (1 when unmeasured). */
export function inkWeight(placement: MarkPlacement | undefined): number {
  if (!placement || !(placement.ink > 0)) return 1;
  const weight = Math.sqrt(INK_REFERENCE / placement.ink);
  return Math.min(INK_WEIGHT.max, Math.max(INK_WEIGHT.min, weight));
}

/**
 * The artwork box and file box for one mark at one preset. The artwork box
 * gets the preset's area, weighted by its ink, at its own ratio, clamped to
 * the height range and then to the width cap; the file is scaled and
 * offset so the artwork box fills the drawn box exactly.
 */
export function markGeometry(
  asset: CompanyLogoAsset,
  placement: MarkPlacement | undefined,
  preset: MarkPreset,
): MarkGeometry {
  const size = MARK_PRESETS[preset];
  const ratio = markRatio(asset, placement);
  const weight = inkWeight(placement);
  const area = size.area * weight;
  // A dense compact mark meets the height cap before its weight can shrink
  // it, so the cap itself shrinks with the weight (never below the floor).
  const maxHeight = Math.max(size.minHeight, size.maxHeight * Math.min(1, Math.sqrt(weight)));
  let height = Math.min(maxHeight, Math.max(size.minHeight, Math.sqrt(area / ratio)));
  let width = height * ratio;
  if (width > size.maxWidth) {
    width = size.maxWidth;
    height = width / ratio;
  }
  const box = placement?.box ?? [0, 0, 1, 1];
  const imageWidth = width / (box[2] - box[0]);
  const imageHeight = height / (box[3] - box[1]);
  return {
    box: { width: round(width), height: round(height) },
    image: {
      left: round(-box[0] * imageWidth),
      top: round(-box[1] * imageHeight),
      width: round(imageWidth),
      height: round(imageHeight),
    },
  };
}
