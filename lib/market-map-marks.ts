/**
 * How the market map places each company mark on the logo tile.
 *
 * The files under public/images/logos and their registry entries
 * (data/logos.ts, data/logo-images.ts) are locked: nothing here edits a
 * mark, recolours it or cuts any of its artwork. Every mark keeps the one
 * logo tile (components/ui/logo-tile.ts: the neutral plate, 3 px of plate
 * around the mark and the one registered monochrome threshold). What this
 * module decides is placement:
 *
 * - Size by artwork, not by file box. Some files carry wide transparent
 *   margins (the Boston Dynamics file is a square with the wordmark in its
 *   middle quarter), so contain-fitting the file drew the wordmark a few
 *   pixels high. scripts/measure-logo-marks.ts records the box of every
 *   pixel with any opacity; the tile is sized to that box and the file is
 *   positioned so the box fills it. Only fully transparent margin falls
 *   outside, so no artwork is cut. A file that fills its own box records
 *   no box and is placed whole.
 * - One visual weight for every mark. A square symbol and a twelve-to-one
 *   wordmark drawn at one height look nothing alike, so each size preset
 *   gives every mark about the same area, within a height range: the
 *   widest wordmarks keep a legible height (Apptronik drew 7 px high in the
 *   old fixed 96 x 36 tile; it now draws at least 10 px) and square marks
 *   do not outgrow the line they sit on.
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
};

// BEGIN measured marks (written by scripts/measure-logo-marks.ts)
export const MARK_PLACEMENT: Readonly<Record<string, MarkPlacement>> = {
  '1x-technologies-logo': { sha256: 'fed812300cdcf902', box: [0, 0, 0.9895, 1] },
  'abb-logo': { sha256: 'c69ccbe3325b56e7', box: [0.0105, 0.0264, 0.9895, 0.9736] },
  'agibot-logo': { sha256: '3f5a555727f78471', box: null },
  'agility-robotics-logo': { sha256: '002ec3a67ac2d4b4', box: null },
  'amazon-robotics-logo': { sha256: '2a9bbfe5cefc4c98', box: null },
  'ambirobotics-logo': { sha256: '01bedd4837d4db48', box: [0, 0, 0.9915, 0.9987] },
  'anduril-logo': { sha256: 'fcdf6ed0f6f58d5e', box: null },
  'applied-intuition-logo': { sha256: '28400c3bf1cf3d11', box: [0.14, 0.099, 0.86, 0.901] },
  'apptronik-logo': { sha256: '1de32fafc1067e0c', box: null },
  'assured-robot-intelligence-logo': { sha256: '30e8b908eff58d07', box: null },
  'astribot-logo': { sha256: 'dcaf7edf89799411', box: [0, 0.2755, 1, 0.7194] },
  'automata-logo': { sha256: '0eadf9a3bd83239a', box: null },
  'avidbots-logo': { sha256: '46f75ea35aafb81f', box: [0.0125, 0.0495, 0.9875, 0.939] },
  'bedrock-robotics-logo': { sha256: 'ef7725a7c0fb1b6e', box: [0.0035, 0.0262, 0.9965, 0.9738] },
  'berkshire-grey-logo': { sha256: 'a435d21bd91e231a', box: null },
  'booster-robotics-logo': { sha256: 'e6ad6a165f2499f7', box: [0.062, 0.1035, 0.9175, 0.8965] },
  'boston-dynamics-logo': { sha256: 'd5f3c7c5371e487c', box: [0, 0.3825, 1, 0.618] },
  'brain-corp-logo': { sha256: '407e78af7411b004', box: null },
  'carbon-robotics-logo': { sha256: '563b8cc9e28c68c1', box: null },
  'chef-robotics-logo': { sha256: 'c032cbb38784252c', box: [0.0225, 0.1995, 0.987, 0.8616] },
  'clone-robotics-logo': { sha256: 'dda91af74f7dfd91', box: null },
  'cmr-surgical-logo': { sha256: '372d76bc8915307a', box: null },
  'coco-robotics-logo': { sha256: 'a631b8e840f671e2', box: null },
  'collaborative-robotics-logo': { sha256: 'ca8090ec535f0c5e', box: null },
  'covariant-logo': { sha256: '387078f439e917d5', box: null },
  'deep-robotics-logo': { sha256: 'e4bbdd82cf0fca94', box: null },
  'dexterity-logo': { sha256: '1d8250fab6d44a29', box: null },
  'diligent-robotics-logo': { sha256: 'f44d30dd0b8bea2d', box: null },
  'dyna-robotics-logo': { sha256: 'ff25acc405ad3892', box: null },
  'eka-robotics-logo': { sha256: '9f5e876be3125938', box: null },
  'encord-logo': { sha256: '7053e234155595f4', box: null },
  'engineai-logo': { sha256: '2f6e25ab155f8b00', box: [0.1513, 0.3107, 0.8477, 0.6872] },
  'farm-ng-logo': { sha256: '3e8030e3050445fd', box: null },
  'field-ai-logo': { sha256: '35ea012d62b6d0bd', box: [0.016, 0.0527, 0.984, 0.9473] },
  'figure-ai-logo': { sha256: '3a190c6601c047e0', box: null },
  'formic-logo': { sha256: '11e0a8a37e32b683', box: null },
  'foundry-robotics-logo': { sha256: 'ad9abd8bd0ebe40d', box: [0.0395, 0.0395, 0.9605, 0.9605] },
  'fourier-intelligence-logo': { sha256: '898ede3483071d3e', box: [0.0375, 0.136, 0.9625, 0.864] },
  'fox-robotics-logo': { sha256: 'e97014a3c766bd96', box: null },
  'galaxea-ai-logo': { sha256: '343665114cf5ee3a', box: null },
  'galbot-logo': { sha256: '9fb5943976af066b', box: null },
  'gecko-robotics-logo': { sha256: '7f3c4d161eba6758', box: null },
  'generalist-ai-logo': { sha256: '692bf5f9ff66640b', box: [0.029, 0.0465, 0.9615, 0.9535] },
  'genesis-ai-logo': { sha256: '3ab079634a7d6394', box: null },
  'google-deepmind-robotics-logo': { sha256: 'a0ef252f512e9750', box: null },
  'hanson-robotics-logo': { sha256: 'a9b6f489c4f29018', box: [0.0272, 0.102, 0.9778, 0.884] },
  'harmonic-drive-logo': { sha256: 'b669c836dcbbdfd9', box: [0.008, 0.0269, 0.992, 0.9731] },
  'hugging-face-logo': { sha256: 'fc95837e1bacb9b2', box: [0.044, 0.1165, 0.944, 0.8685] },
  'humanoid-uk-logo': { sha256: 'cd92590a15a0edaf', box: null },
  'intuitive-surgical-logo': { sha256: 'c264280dd715519a', box: null },
  'irobot-logo': { sha256: '51fd0c843c51c51a', box: [0.005, 0.0252, 0.995, 0.9748] },
  'k-scale-labs-logo': { sha256: 'a1dc6c50310938f0', box: null },
  'kepler-robot-logo': { sha256: 'a7b25f1c66388042', box: null },
  'knightscope-logo': { sha256: 'de4251964dac0e53', box: [0.1555, 0.217, 0.8445, 0.7835] },
  'leaderdrive-logo': { sha256: '60e53357da59e15d', box: null },
  'leju-robotics-logo': { sha256: 'f2d13ed0347a84ca', box: null },
  'lila-sciences-logo': { sha256: '62a4bb93c1a0f5d6', box: [0, 0, 0.999, 0.971] },
  'limx-dynamics-logo': { sha256: 'ebc4f8bb44e3d368', box: null },
  'locus-robotics-logo': { sha256: 'f4bdece2a435e15c', box: null },
  'mentee-robotics-logo': { sha256: '334175e1e217e684', box: [0, 0.0357, 1, 0.9881] },
  'meta-logo': { sha256: 'b536f39ac80d6b93', box: null },
  'micro1-logo': { sha256: '3c80d0ffe1f9633d', box: null },
  'mind-robotics-logo': { sha256: 'a11a9b7d8b4caff0', box: null },
  'miso-robotics-logo': { sha256: 'eeec45cbe291e5cc', box: [0, 0, 0.992, 0.9524] },
  'mitsubishi-logo': { sha256: '2826c5feb21cb65d', box: null },
  'monarch-tractor-logo': { sha256: '10873f36357e20a2', box: [0.0422, 0.0714, 0.96, 0.9108] },
  'moon-surgical-logo': { sha256: '563c280af7f6cbe4', box: null },
  'mujin-logo': { sha256: '268442b95bc2e4d5', box: null },
  'mytra-logo': { sha256: '3811b93d99a26e74', box: [0.189, 0.079, 0.7836, 0.9519] },
  'nabtesco-logo': { sha256: 'afb339191e3e2bed', box: [0.0155, 0.0828, 0.9845, 0.9172] },
  'neura-robotics-logo': { sha256: 'd3c10bb5d383131f', box: [0, 0, 1, 0.9875] },
  'nimble-robotics-logo': { sha256: '85383cb32a5d2ff2', box: [0.003, 0.2307, 0.999, 0.9697] },
  'nuro-logo': { sha256: 'ba113d2231f9feab', box: null },
  'nvidia-logo': { sha256: '6dce22178611da6f', box: null },
  'openai-logo': { sha256: '6e4c87d52178f470', box: null },
  'paxini-logo': { sha256: 'b2a88d6738e47e51', box: null },
  'persona-ai-logo': { sha256: '227f525b24a620e9', box: [0.0066, 0.1029, 0.9934, 0.8677] },
  'physical-intelligence-logo': { sha256: 'e9d0c305d49f04ed', box: [0, 0.015, 1, 0.985] },
  'plus-one-robotics-logo': { sha256: '6495996b5ac0c095', box: [0.0053, 0, 1, 1] },
  'pollen-robotics-logo': { sha256: 'ccae1aa71a658d59', box: [0, 0.0816, 0.994, 0.9184] },
  'rainbow-robotics-logo': { sha256: '801d3b9dc5962665', box: null },
  'rhoda-ai-logo': { sha256: 'b4e18713c8a5bf99', box: null },
  'righthand-robotics-logo': { sha256: '5113850e9b0c22ce', box: null },
  'robot-era-logo': { sha256: 'e5ca9950532f5d38', box: null },
  'robotphoenix-logo': { sha256: '179278412caad478', box: [0.028, 0.1, 0.988, 0.83] },
  'sanctuary-ai-logo': { sha256: '43a372ecc8ed4a5f', box: [0.0888, 0.0962, 0.9112, 0.9038] },
  'sanhua-logo': { sha256: '0aac0945e8f059ee', box: null },
  'saronic-logo': { sha256: 'd52613b5c59e8bf1', box: null },
  'serve-robotics-logo': { sha256: '6227552fc552e78f', box: null },
  'shadow-robot-logo': { sha256: 'cfd4a606a4a972da', box: null },
  'sharpa-logo': { sha256: '3d9e5fa6ebc4b5ad', box: null },
  'simbe-robotics-logo': { sha256: '6013877698d7c394', box: [0.0035, 0.0143, 0.994, 0.9919] },
  'skild-ai-logo': { sha256: '92003d2acb370b3a', box: null },
  'spirit-ai-logo': { sha256: 'a5dc5cb85406b0a1', box: [0.0045, 0.0208, 0.9995, 0.9804] },
  'standard-bots-logo': { sha256: 'f2075bb7562a6f31', box: [0.005, 0, 0.992, 1] },
  'starship-logo': { sha256: '95c2e46e3a137b3d', box: [0.004, 0.0263, 0.996, 0.9737] },
  'sunday-robotics-logo': { sha256: '3416dab04da25856', box: null },
  'switchbot-logo': { sha256: '637e5358ea2dd3d2', box: [0.0833, 0.1923, 0.9167, 0.8077] },
  'symbotic-logo': { sha256: '5fafb29fb45cf5bd', box: null },
  'tars-robotics-logo': { sha256: '1e6a98c085a34a4b', box: null },
  'tesla-logo': { sha256: '63dffdd057fb53b0', box: null },
  'the-bot-company-logo': { sha256: '0f176f24c2a76466', box: null },
  'ubtech-logo': { sha256: '74ec0762eb27cb88', box: null },
  'unitree-logo': { sha256: 'f2ace736d962af69', box: [0.014, 0.0779, 0.9905, 0.9288] },
  'wandercraft-logo': { sha256: '893924f1b4720abe', box: [0.094, 0.3278, 0.906, 0.675] },
  'weave-robotics-logo': { sha256: 'a0211fc10f670b01', box: null },
  'wonik-logo': { sha256: '13196cf95870b316', box: [0.2124, 0.2327, 0.8837, 0.3295] },
  'x-square-robot-logo': { sha256: '33720bc0f5f50d78', box: [0, 0, 0.9965, 0.9907] },
  'xdof-logo': { sha256: 'd84b3153e485bc8e', box: null },
  'xela-robotics-logo': { sha256: '65dc79101ec44bcd', box: null },
  'zebra-robotics-automation-logo': { sha256: 'ce8b05726abeb220', box: [0, 0, 1, 0.994] },
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
 * registry entry stays (the data is locked), but no page draws the file:
 * the map shows the company's name as text and its details say why, and
 * /credits, which credits what the site shows, leaves it out. Remove an
 * entry once the registry points at a correct official mark with recorded
 * provenance.
 */
export const WITHHELD_MARKS: Readonly<Record<string, WithheldMark>> = {
  'assured-robot-intelligence-logo': {
    sha256: '30e8b908eff58d0754231b77d6b9d7c7f1163bd0b05e0207df59e65a6601786e',
    reason:
      'The file on record is the “TD.” icon of the domain-sale page now at ari.bot, not Assured Robot Intelligence’s mark.',
    recorded: '2026-10-19',
  },
  'farm-ng-logo': {
    sha256: '3e8030e3050445fd32d22cb06a45a42dd109721b397da1cdeed5f13dc96dbd38',
    reason:
      'The file on record is the Bonsai Robotics wordmark, from the site farm-ng.com now redirects to, not Farm-ng’s own mark.',
    recorded: '2026-10-19',
  },
  'nimble-robotics-logo': {
    sha256: '85383cb32a5d2ff2d064fb4ae24c0db7e70fd38147a49d83b0a08f8a24acf351',
    reason: 'The file on record shows another company’s wordmark (“Lisa Says Gah”), not Nimble’s.',
    recorded: '2026-10-19',
  },
};

export function withheldMark(logoId: string | null): WithheldMark | null {
  return logoId ? (WITHHELD_MARKS[logoId] ?? null) : null;
}

export type MarkPreset = 'tile' | 'sheet';

type PresetSize = {
  /** Area every mark is drawn at, in square CSS pixels. */
  area: number;
  minHeight: number;
  maxHeight: number;
  maxWidth: number;
};

/**
 * Two sizes: the map tile and the detail view. The
 * floors are what keep a wide wordmark readable: on a tile every mark
 * draws at least 10 px high (Apptronik, 7.4 px in the old tile, draws 10.8 px)
 * and the plate, 3 px wider on each side, fits a desktop tile (143 px wide
 * at 1280 px); narrower phone tiles scale the plate down whole.
 */
export const MARK_PRESETS: Readonly<Record<MarkPreset, PresetSize>> = {
  tile: { area: 520, minHeight: 11, maxHeight: 16, maxWidth: 132 },
  sheet: { area: 2200, minHeight: 16, maxHeight: 36, maxWidth: 240 },
};

/** Plate drawn around the mark on every side, as on /credits. */
export const MARK_PLATE_PADDING = 3;

export type MarkGeometry = {
  /** The tile, plate included. */
  tile: { width: number; height: number };
  /** The image element inside the tile, relative to the tile's corner. */
  image: { left: number; top: number; width: number; height: number };
};

const round = (value: number) => Math.round(value * 100) / 100;

/** Width over height of the artwork itself. */
export function markRatio(asset: CompanyLogoAsset, placement: MarkPlacement | undefined): number {
  const box = placement?.box ?? [0, 0, 1, 1];
  return ((box[2] - box[0]) * asset.width) / ((box[3] - box[1]) * asset.height);
}

/**
 * The tile and image boxes for one mark at one preset. The artwork box
 * gets the preset's area at its own ratio, clamped to the height range and
 * then to the width cap; the image is scaled and offset so that box fills
 * the plate's inner area exactly.
 */
export function markGeometry(
  asset: CompanyLogoAsset,
  placement: MarkPlacement | undefined,
  preset: MarkPreset,
): MarkGeometry {
  const size = MARK_PRESETS[preset];
  const ratio = markRatio(asset, placement);
  let height = Math.min(size.maxHeight, Math.max(size.minHeight, Math.sqrt(size.area / ratio)));
  let width = height * ratio;
  if (width > size.maxWidth) {
    width = size.maxWidth;
    height = width / ratio;
  }
  const box = placement?.box ?? [0, 0, 1, 1];
  const imageWidth = width / (box[2] - box[0]);
  const imageHeight = height / (box[3] - box[1]);
  return {
    tile: {
      width: round(width + 2 * MARK_PLATE_PADDING),
      height: round(height + 2 * MARK_PLATE_PADDING),
    },
    image: {
      left: round(MARK_PLATE_PADDING - box[0] * imageWidth),
      top: round(MARK_PLATE_PADDING - box[1] * imageHeight),
      width: round(imageWidth),
      height: round(imageHeight),
    },
  };
}
