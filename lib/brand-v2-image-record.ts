import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IMAGES, attributionText, figureKind, legalBasis, preservationPolicy } from '../data/images.ts';
import type { SiteImage } from '../data/schemas/image.ts';
import { sha256, stableJson } from './brand-v2-baseline.ts';
import { contrastRatio } from './brand-v2-mobile-shell-evidence.ts';
import type { Verdict } from './brand-v2-figure-evidence.ts';
import { REUSABLE_CONTENT_BASES } from './brand-v2-figure-evidence.ts';

/**
 * The record half of the imagery rows: the five claims a browser cannot
 * decide because they are about what the registry says and what the bytes on
 * disk are, not about anything a page painted.
 *
 * Every one of them is graded against a source this feature did not write:
 * the immutable baseline manifest for the SVG semantics, the file itself for
 * the content hash, and the registry census for the population. Grading them
 * against a stored copy of themselves would prove only that nothing had been
 * edited twice.
 */

/** The census row shape these verdicts read. */
export type AssetRow = {
  id: string;
  path: string;
  category: string;
  ownershipId: string;
  sourceRegistryId: string | null;
  byteHash: string;
  semanticHash: string | null;
};

export type MaterialRow = {
  id: string;
  treatment: string;
  deterministic: boolean;
  ownership: string;
};

const SLOP_MARKERS = [
  /\bai[- ]generated\b/i,
  /\bai[- ]rendered\b/i,
  /\bmidjourney\b/i,
  /\bstable diffusion\b/i,
  /\bdall[- ]?e\b/i,
  /\bgenerative (?:art|render|image)\b/i,
  /\bsynthesi[sz]ed\b/i,
  /\bsynthetic (?:lab|scene|render|photo)\b/i,
  /\bchrome (?:head|humanoid)\b/i,
  /\bglowing brain\b/i,
  /\bcircuit (?:wallpaper|board background)\b/i,
  /\bfake blueprint\b/i,
];

const EVIDENCE_IMPERSONATION_MARKERS = [
  /\bsensor\b/i,
  /\blidar\b/i,
  /\bdepth (?:map|field)\b/i,
  /\bpoint cloud\b/i,
  /\bmeasured\b/i,
  /\btelemetry\b/i,
  /\bscan(?:ned)?\b/i,
  /\bsignal trace\b/i,
];

const registryById = new Map(IMAGES.map((image) => [image.id, image]));

/**
 * What the shipped stylesheet actually paints for a registered material.
 *
 * The registry rows are prose an author wrote about their own texture --
 * "owned monochrome SVG dot field", `deterministic: true` -- and grading
 * them against a marker list only ever asked whether the author had used a
 * suspicious word. A texture that really did impersonate a sensor reading
 * would pass, provided its description did not say so. These facts come
 * from the CSS the export ships: the tile it draws, whether it repeats,
 * where its bytes come from, and how far its ink sits from the ground it
 * covers.
 */
export type MaterialPaint = {
  id: string;
  selector: string;
  /** Absent when the registry names a material the stylesheet never paints. */
  rule: string | null;
  declarations: Record<string, string>;
  /** The decoded SVG tile, when the material paints one. */
  tile: string | null;
  /** Any url() that is fetched rather than shipped inside the rule. */
  remoteUrls: string[];
  /** The resolved background the tile is composited over. */
  groundHex: string | null;
  /**
   * The contrast ratio between each drawn ink (composited at its own
   * opacity over the ground) and that ground, per WCAG 2.x.
   */
  inkContrast: Array<{ ink: string; ratio: number }>;
};

const MATERIAL_STYLESHEET_DIR = join('out', '_next', 'static', 'chunks');

/** `#RGB`/`#RRGGBB` to an sRGB triple. */
function hexToRgb(hex: string): [number, number, number] | null {
  const value = hex.trim().replace(/^#/, '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((character) => character + character)
          .join('')
      : value;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

/**
 * A custom property resolved to a literal colour.
 *
 * Tokens are defined in terms of each other (`--color-surface:
 * var(--color-white)`), so a single lookup answers with another variable.
 * The chain is followed to a literal or the property is reported as
 * unresolved; guessing a default would invent the ground the ink is
 * measured against.
 */
function resolveCustomProperty(
  blocks: readonly StyleBlock[],
  name: string,
): string | null {
  let current = name;
  for (let depth = 0; depth < 8; depth += 1) {
    const value = declaredValue(blocks, `--${current}`);
    if (value === null) return null;
    const chained = /^var\(\s*--([a-z0-9-]+)/i.exec(value);
    if (!chained) return value;
    current = chained[1];
  }
  return null;
}

/** One `selector { ... }` block, with the at-rules it is nested inside. */
type StyleBlock = {
  selectors: string[];
  body: string;
  /** `@media (...)`, `@supports (...)` and friends, outer to inner. */
  conditions: string[];
  /** `@layer name` preludes, outer to inner. */
  layers: string[];
};

/**
 * The value that wins among declarations of one property.
 *
 * Normal declarations resolve unlayered over layered, then by document
 * order. A property whose value depends on a media query, a `@supports`
 * test or two different layers disagreeing is not decidable from bytes, so
 * it is refused by name rather than guessed at.
 */
function winningValue(
  candidates: ReadonlyArray<{
    value: string;
    conditions: string[];
    layers: string[];
  }>,
  what: string,
): string | null {
  const conditional = candidates.filter(
    ({ conditions }) => conditions.length > 0,
  );
  if (conditional.length > 0) {
    throw new Error(
      `${what} is declared under ${[
        ...new Set(conditional.map(({ conditions }) => conditions.join(' '))),
      ].join(
        ', ',
      )}, so what the export paints depends on a condition this reader cannot resolve; measure it in a browser instead`,
    );
  }
  const unlayered = candidates.filter(({ layers }) => layers.length === 0);
  const pool = unlayered.length > 0 ? unlayered : candidates;
  const layerNames = new Set(pool.map(({ layers }) => layers.join('>')));
  const values = new Set(pool.map(({ value }) => value.trim()));
  if (layerNames.size > 1 && values.size > 1) {
    throw new Error(
      `${what} is declared differently in layers ${[...layerNames].join(
        ', ',
      )}, so which one wins depends on a layer order this reader cannot resolve; measure it in a browser instead`,
    );
  }
  return pool.length === 0 ? null : pool[pool.length - 1].value.trim();
}

/**
 * Every rule block in the shipped stylesheets, in document order, with the
 * at-rule context each one sits inside.
 *
 * The row used to take the FIRST `.material-x { ... }` the concatenated
 * chunks happened to contain and the LAST `--token:` anywhere in them.
 * Neither is what a browser paints: a later same-specificity rule wins, and
 * a token redefined under a dark-scheme query is a different ground. This
 * reader keeps document order and keeps the condition each declaration was
 * written under, so the cases it cannot decide can be refused instead of
 * guessed.
 */
function parseStyleBlocks(css: string): StyleBlock[] {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks: StyleBlock[] = [];
  const conditions: string[] = [];
  const layers: string[] = [];
  const opened: Array<'condition' | 'layer' | 'rule'> = [];
  let prelude = '';
  for (let i = 0; i < source.length; i += 1) {
    const character = source[i];
    if (character === '{') {
      const head = prelude.trim();
      prelude = '';
      if (head.startsWith('@')) {
        // A conditional group rule wraps more rules; `@font-face`, `@keyframes`
        // and the like wrap declarations and are skipped whole.
        if (/^@layer\b/i.test(head)) {
          layers.push(head);
          opened.push('layer');
          continue;
        }
        if (/^@(media|supports|container|scope)\b/i.test(head)) {
          conditions.push(head);
          opened.push('condition');
          continue;
        }
        let depth = 1;
        while (i + 1 < source.length && depth > 0) {
          i += 1;
          if (source[i] === '{') depth += 1;
          else if (source[i] === '}') depth -= 1;
        }
        continue;
      }
      let depth = 1;
      const start = i + 1;
      while (i + 1 < source.length && depth > 0) {
        i += 1;
        if (source[i] === '{') depth += 1;
        else if (source[i] === '}') depth -= 1;
      }
      blocks.push({
        selectors: head.split(',').map((part) => part.trim()).filter(Boolean),
        body: source.slice(start, i),
        conditions: [...conditions],
        layers: [...layers],
      });
      continue;
    }
    if (character === '}') {
      const closed = opened.pop();
      if (closed === 'layer') layers.pop();
      else if (closed === 'condition') conditions.pop();
      prelude = '';
      continue;
    }
    prelude += character;
  }
  return blocks;
}

function declarationsOf(body: string): Record<string, string> {
  const declarations: Record<string, string> = {};
  let depth = 0;
  let current = '';
  const parts: string[] = [];
  for (const character of body) {
    if (character === '(') depth += 1;
    else if (character === ')') depth -= 1;
    if (character === ';' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += character;
  }
  parts.push(current);
  for (const part of parts) {
    const separator = part.indexOf(':');
    if (separator < 0) continue;
    const property = part.slice(0, separator).trim();
    if (property === '') continue;
    declarations[property] = part.slice(separator + 1).trim();
  }
  return declarations;
}

/**
 * The last unconditional value declared for `property` on `:root`/`html`.
 *
 * A definition inside a media query, a `.dark` scope or any other condition
 * is a different ground for the same token, and this reader cannot say which
 * one the reader of the page is under, so it refuses rather than picking.
 */
function declaredValue(
  blocks: readonly StyleBlock[],
  property: string,
): string | null {
  const candidates = blocks
    .filter(({ selectors }) =>
      selectors.some((selector) => /^(:root|html)$/i.test(selector)),
    )
    .flatMap(({ body, conditions, layers }) => {
      const declared = declarationsOf(body)[property];
      return declared === undefined ? [] : [{ value: declared, conditions, layers }];
    });
  return winningValue(candidates, property);
}

export function readMaterialPaints(
  root: string,
  materials: readonly MaterialRow[],
): MaterialPaint[] {
  const directory = join(root, MATERIAL_STYLESHEET_DIR);
  const files = readdirSync(directory)
    .filter((name) => name.endsWith('.css'))
    .sort();
  const css = files
    .map((name) => readFileSync(join(directory, name), 'utf8'))
    .join('\n');
  if (!/\.material-/.test(css)) {
    throw new Error(
      `${MATERIAL_STYLESHEET_DIR} ships no .material- rule at all, so material honesty would be decided over nothing. Run npm run build first.`,
    );
  }
  return materialPaintsFromCss(css, materials);
}

/**
 * The same reading, from stylesheet text rather than from the export, so a
 * cascade this reader has to get right can be planted in a test.
 */
export function materialPaintsFromCss(
  css: string,
  materials: readonly MaterialRow[],
): MaterialPaint[] {
  const blocks = parseStyleBlocks(css);

  return materials.map((material) => {
    const name = material.id.replace(/^material:/, '');
    const selector = `.material-${name}`;
    const own = blocks.filter(({ selectors }) => selectors.includes(selector));
    // A rule that reaches the same element through a longer selector, or
    // only under a condition, wins or loses by specificity and state rather
    // than by document order. Reading it as if it were another equal rule
    // would be a guess, so it is refused by name.
    const contested = blocks.filter(({ selectors, conditions }) =>
      selectors.some(
        (candidate) =>
          candidate !== selector &&
          new RegExp(`(^|[\\s>+~])\\${selector}([\\s>+~:.\\[]|$)`).test(
            candidate,
          ) &&
          (conditions.length > 0 || candidate.trim() !== selector),
      ),
    );
    if (contested.length > 0) {
      throw new Error(
        `${selector} is also painted by ${contested
          .flatMap(({ selectors }) => selectors)
          .join(', ')}, so what the export paints depends on a cascade this reader cannot resolve; measure it in a browser instead`,
      );
    }
    // Unlayered over layered, then document order: the cascade a browser
    // applies to equal-specificity normal declarations, resolved per
    // property so a rule that sets only the ground does not erase a tile
    // another rule set.
    const rule = own.length > 0 ? own.map(({ body }) => body).join(';') : null;
    const declarations: Record<string, string> = {};
    for (const property of new Set(
      own.flatMap(({ body }) => Object.keys(declarationsOf(body))),
    )) {
      const value = winningValue(
        own.flatMap(({ body, conditions, layers }) => {
          const declared = declarationsOf(body)[property];
          return declared === undefined
            ? []
            : [{ value: declared, conditions, layers }];
        }),
        `${selector} { ${property} }`,
      );
      if (value !== null) declarations[property] = value;
    }

    // The tile is a data URI whose SVG payload is full of single quotes and
    // parentheses, so the quoted forms have to be matched as quoted strings
    // rather than as "anything up to the next bracket". Only the winning
    // declaration's urls count, so an overridden background is not read as
    // if it still painted.
    const urls = [
      ...Object.entries(declarations)
        .filter(([property]) => /^background(-image)?$/.test(property))
        .map(([, value]) => value)
        .join(' ')
        .matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/g),
    ].map((match) => match[1] ?? match[2] ?? match[3] ?? '');
    const dataUrl = urls.find((url) => url.startsWith('data:'));
    const tile = dataUrl
      ? decodeURIComponent(dataUrl.slice(dataUrl.indexOf(',') + 1))
      : null;

    const backgroundColor = declarations['background-color'] ?? '';
    const token = /^var\(\s*--([a-z0-9-]+)/i.exec(backgroundColor);
    const groundValue = token
      ? resolveCustomProperty(blocks, token[1])
      : backgroundColor || null;
    const groundRgb = groundValue ? hexToRgb(groundValue) : null;

    const inkContrast: Array<{ ink: string; ratio: number }> = [];
    if (tile && groundRgb) {
      const paints = [
        ...tile.matchAll(
          /(?:fill|stroke)=['"](#[0-9a-f]{3,6})['"](?:[^>]*?(?:fill|stroke)-opacity=['"]([\d.]+)['"])?/gi,
        ),
      ];
      for (const [, hex, opacity] of paints) {
        const rgb = hexToRgb(hex);
        if (!rgb) continue;
        const alpha = opacity === undefined ? 1 : Number.parseFloat(opacity);
        // What the reader sees is the ink composited over the ground at its
        // own opacity, not the ink's own colour.
        const composited = rgb.map((channel, index) =>
          Math.round(channel * alpha + groundRgb[index] * (1 - alpha)),
        ) as [number, number, number];
        inkContrast.push({
          ink: `${hex}@${alpha}`,
          ratio: Math.round(contrastRatio(composited, groundRgb) * 100) / 100,
        });
      }
    }

    return {
      id: material.id,
      selector,
      rule,
      declarations,
      tile,
      remoteUrls: urls.filter((url) => !url.startsWith('data:')),
      groundHex: groundRgb
        ? `#${groundRgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`
        : null,
      inkContrast,
    };
  });
}


function nonEmpty<T>(verdicts: Map<string, T>, what: string): Map<string, T> {
  if (verdicts.size === 0) {
    throw new Error(
      `the ${what} population is empty, so its verdicts would pass vacuously`,
    );
  }
  return verdicts;
}

/** The registered image an asset row belongs to, when it has one. */
function entryFor(asset: AssetRow): SiteImage | undefined {
  return asset.sourceRegistryId
    ? registryById.get(asset.sourceRegistryId)
    : undefined;
}

/** Editorial images: the reusable content whose §1.13 record this row owns. */
export function editorialAssetMembers(assets: readonly AssetRow[]): string[] {
  return assets
    .filter(({ category }) => category === 'editorial-image')
    .map(({ id }) => id)
    .sort();
}

/**
 * The first-party vector assets `VAL-B2-VIZ-014` quantifies over: an SVG
 * this repository drew, which is the only kind whose semantics it can pin.
 * The 70-odd company marks are vectors too and are deliberately excluded:
 * they are somebody else's drawing and their preservation row is
 * `VAL-B2-IMG-009`.
 */
export function firstPartySvgMembers(assets: readonly AssetRow[]): string[] {
  return assets
    .filter(
      (asset) =>
        asset.semanticHash !== null &&
        asset.category === 'editorial-image' &&
        entryFor(asset)?.figureKind === 'original-schematic',
    )
    .map(({ id }) => id)
    .sort();
}

/**
 * `VAL-B2-IMG-001`: no first-party surface carries an AI-generated robot, a
 * synthetic lab, a stock chrome head, a glowing brain, circuit wallpaper or
 * a fake blueprint.
 *
 * The member is every asset in the census, marks and models included,
 * because the row is about the surfaces as a whole and an excluded category
 * is exactly where such an image would be parked. What is graded is the
 * asset's own provenance: a real creator, a real source, and no synthesis
 * vocabulary anywhere in the strings that describe it. The check cannot look
 * at pixels, and says so rather than pretending to: it refuses an asset that
 * cannot name where it came from.
 */
export function firstPartyImageryVerdicts(
  assets: readonly AssetRow[],
): Map<string, Verdict<Record<string, string>>> {
  const verdicts = new Map<string, Verdict<Record<string, string>>>();
  for (const asset of assets) {
    const entry = entryFor(asset);
    const failures: string[] = [];
    const described = entry
      ? [entry.creator, entry.sourceName, entry.alt, entry.caption, asset.path]
      : [asset.path, asset.ownershipId];
    for (const value of described) {
      const marker = SLOP_MARKERS.find((pattern) => pattern.test(value));
      if (marker) {
        failures.push(
          `${asset.id} describes itself as "${value}", which matches the banned synthesis vocabulary ${marker}`,
        );
      }
    }
    if (entry) {
      if (entry.creator.trim().length === 0) {
        failures.push(`${asset.id} names no creator, so nobody made it`);
      }
      if (entry.sourceName.trim().length === 0) {
        failures.push(`${asset.id} names no source`);
      }
      // A first-party drawing has no external original; everything else must
      // point at the page it came from, which is what makes it checkable.
      if (figureKind(entry) !== 'original-schematic' && !entry.sourceUrl) {
        failures.push(
          `${asset.id} is not a first-party drawing and records no source URL, so its origin cannot be checked`,
        );
      }
    }
    verdicts.set(asset.id, {
      id: asset.id,
      observed: {
        path: asset.path,
        category: asset.category,
        creator: entry?.creator ?? asset.ownershipId,
        sourceName: entry?.sourceName ?? 'first-party asset',
      },
      failures,
    });
  }
  return nonEmpty(verdicts, 'first-party asset');
}

/**
 * `VAL-B2-IMG-002`: every external photograph, figure or texture records one
 * §1.13 legal-basis value plus creator, official source URL, retrieval date,
 * content hash, attribution text, licence reference and preservation policy,
 * and the recorded content hash is the hash of the file that shipped.
 */
export function provenanceRecordVerdicts(
  assets: readonly AssetRow[],
  root: string,
): Map<string, Verdict<Record<string, unknown>>> {
  const verdicts = new Map<string, Verdict<Record<string, unknown>>>();
  for (const asset of assets) {
    if (asset.category !== 'editorial-image') continue;
    const entry = entryFor(asset);
    const failures: string[] = [];
    if (!entry) {
      failures.push(`${asset.id} resolves to no registry entry, so it has no record at all`);
      verdicts.set(asset.id, { id: asset.id, observed: { path: asset.path }, failures });
      continue;
    }
    if (entry.legalBasis === undefined) {
      failures.push(`${asset.id} records no §1.13 legal basis`);
    }
    if (entry.attributionText === undefined) {
      failures.push(`${asset.id} records no attribution text`);
    } else if (entry.attributionText !== attributionText(entry)) {
      failures.push(
        `${asset.id} records attribution "${entry.attributionText}" where its own fields read "${attributionText(entry)}"`,
      );
    }
    if (entry.preservationPolicy === undefined) {
      failures.push(`${asset.id} records no preservation policy`);
    }
    if (!entry.retrieved) failures.push(`${asset.id} records no retrieval date`);
    if (!entry.licenceUrl.startsWith('https://')) {
      failures.push(`${asset.id} points its licence reference at ${entry.licenceUrl}`);
    }
    // An original drawing has no external page to cite; everything else does.
    if (figureKind(entry) !== 'original-schematic' && !entry.sourceUrl) {
      failures.push(`${asset.id} records no official source URL`);
    }
    const shipped = sha256(readFileSync(join(root, 'public', asset.path)));
    if (shipped !== asset.byteHash) {
      failures.push(
        `${asset.id} records content hash ${asset.byteHash.slice(0, 12)} where the shipped file hashes ${shipped.slice(0, 12)}`,
      );
    }
    // The two policies make different promises, and only the first-party
    // drawings are allowed the weaker one.
    if (
      preservationPolicy(entry) === 'first-party-restyled-semantics-preserved' &&
      figureKind(entry) !== 'original-schematic'
    ) {
      failures.push(
        `${asset.id} claims the restyle policy without being a first-party drawing`,
      );
    }
    verdicts.set(asset.id, {
      id: asset.id,
      observed: {
        legalBasis: legalBasis(entry),
        attributionText: attributionText(entry),
        preservationPolicy: preservationPolicy(entry),
        retrieved: entry.retrieved,
        sourceUrl: entry.sourceUrl ?? null,
        licenceUrl: entry.licenceUrl,
        contentHash: asset.byteHash,
      },
      failures,
    });
  }
  return nonEmpty(verdicts, 'editorial image');
}

/**
 * `VAL-B2-IMG-008`: reusable editorial content rests on one approved
 * reusable-content value from the closed enum. `unlicensed` is never
 * approved, and `official-identification-use` is the mark path in
 * `VAL-B2-MAP-010` rather than a licence for editorial reuse.
 */
export function reusableContentVerdicts(
  assets: readonly AssetRow[],
): Map<string, Verdict<Record<string, unknown>>> {
  const verdicts = new Map<string, Verdict<Record<string, unknown>>>();
  for (const asset of assets) {
    if (asset.category !== 'editorial-image') continue;
    const entry = entryFor(asset);
    const failures: string[] = [];
    if (!entry) {
      failures.push(`${asset.id} resolves to no registry entry`);
      verdicts.set(asset.id, { id: asset.id, observed: { path: asset.path }, failures });
      continue;
    }
    const basis = legalBasis(entry);
    if (!REUSABLE_CONTENT_BASES.includes(basis as (typeof REUSABLE_CONTENT_BASES)[number])) {
      failures.push(
        `${asset.id} rests on "${basis}", which is not one of the reusable-content values ${REUSABLE_CONTENT_BASES.join(', ')}`,
      );
    }
    if (entry.licence === 'unlicensed' || entry.licence === 'unknown') {
      failures.push(
        `${asset.id} is reusable editorial content carrying licence "${entry.licence}", which is never approved`,
      );
    }
    if (
      (entry.licence === 'press-kit' || entry.licence === 'permission') &&
      !entry.permissionNote
    ) {
      failures.push(`${asset.id} claims a grant without recording where it is stated`);
    }
    if (figureKind(entry) === 'official-mark') {
      failures.push(
        `${asset.id} is filed as editorial content while declaring itself a company mark`,
      );
    }
    verdicts.set(asset.id, {
      id: asset.id,
      observed: {
        licence: entry.licence,
        legalBasis: basis,
        permissionNote: entry.permissionNote ?? null,
      },
      failures,
    });
  }
  return nonEmpty(verdicts, 'reusable editorial image');
}

/**
 * The contrast a texture has to stay under.
 *
 * A texture is something the eye reads as surface; a reading is something
 * the eye reads as a value, and the difference that can be measured is
 * contrast against the ground. 3:1 is WCAG 2.x's non-text minimum: the
 * contrast at which a graphical object is required to be legible as
 * information. Ink under it cannot carry a value a reader could take for
 * data; ink at or over it is drawn to be read.
 */
const MATERIAL_TEXTURE_MAX_CONTRAST = 3;

/** SVG nodes that make a tile a drawing of something, or make it move. */
const TILE_DISQUALIFIERS: Array<{ pattern: RegExp; why: string }> = [
  { pattern: /<text\b|<tspan\b/i, why: 'draws text, which labels a value rather than covering a surface' },
  { pattern: /<image\b|<use\b/i, why: 'embeds another image, so what it paints is not decidable from this tile' },
  { pattern: /<animate|<script\b|<foreignObject\b/i, why: 'can change between renders, so no two readers see the same surface' },
];

/**
 * `VAL-B2-IMG-004`: a material texture never impersonates evidence, sensor
 * output, or measured data.
 *
 * The members are the registered materials, and they are graded against the
 * CSS the export actually ships rather than against the sentence the
 * registry writes about itself. The old row asked whether the author's own
 * description contained a suspicious word and whether the author's own
 * `deterministic` flag was true; a texture drawn as a labelled plot would
 * have passed both, and a registry that renamed its treatment could have
 * silenced either.
 *
 * What is measured instead: the rule exists in the shipped stylesheet, its
 * bytes are shipped rather than fetched, the tile repeats rather than
 * standing as a single figure, the tile draws no text and nothing that
 * moves, and its ink sits inside a luminance band of the ground it covers
 * so that it cannot carry a legible value.
 */
export function materialHonestyVerdicts(
  materials: readonly MaterialRow[],
  paints: readonly MaterialPaint[],
): Map<string, Verdict<MaterialRow & { paint: MaterialPaint | null }>> {
  const paintById = new Map(paints.map((paint) => [paint.id, paint]));
  const verdicts = new Map<
    string,
    Verdict<MaterialRow & { paint: MaterialPaint | null }>
  >();
  let measured = 0;
  for (const material of materials) {
    const failures: string[] = [];
    const marker = EVIDENCE_IMPERSONATION_MARKERS.find((pattern) =>
      pattern.test(material.treatment),
    );
    if (marker) {
      failures.push(
        `${material.id} describes its treatment as "${material.treatment}", which claims to be a reading rather than a texture`,
      );
    }
    if (!['owned', 'licensed'].includes(material.ownership)) {
      failures.push(
        `${material.id} declares ownership "${material.ownership}", which is neither owned nor licensed`,
      );
    }

    const paint = paintById.get(material.id) ?? null;
    if (!paint || paint.rule === null) {
      failures.push(
        `${material.id} is registered as a material the site paints, and the shipped stylesheet has no ${paint?.selector ?? `.material-*`} rule at all`,
      );
    } else {
      measured += 1;
      for (const url of paint.remoteUrls) {
        failures.push(
          `${material.id} paints from ${url}, which is fetched at read time rather than shipped, so neither its ownership nor what it draws is decidable from this repository`,
        );
      }
      const animated =
        'animation' in paint.declarations ||
        'animation-name' in paint.declarations;
      if (animated) {
        failures.push(
          `${material.id} declares itself deterministic while its shipped rule animates (${paint.declarations.animation ?? paint.declarations['animation-name']})`,
        );
      }
      if (!material.deterministic) {
        failures.push(`${material.id} renders non-deterministically`);
      }
      if (paint.tile !== null) {
        if (paint.declarations['background-repeat'] !== 'repeat') {
          failures.push(
            `${material.id} paints a tile with background-repeat "${paint.declarations['background-repeat'] ?? 'unset'}": a surface repeats, a single placed figure is a picture of something`,
          );
        }
        for (const { pattern, why } of TILE_DISQUALIFIERS) {
          if (pattern.test(paint.tile)) {
            failures.push(`${material.id} ${why}`);
          }
        }
        if (paint.groundHex === null) {
          failures.push(
            `${material.id} paints a tile over a ground this stylesheet cannot resolve to a colour, so its contrast against that ground is unmeasured`,
          );
        }
        if (paint.inkContrast.length === 0 && paint.groundHex !== null) {
          failures.push(
            `${material.id} paints a tile whose ink this reader could not resolve, so the clause that keeps a texture from carrying a value graded nothing`,
          );
        }
        for (const { ink, ratio } of paint.inkContrast) {
          if (ratio >= MATERIAL_TEXTURE_MAX_CONTRAST) {
            failures.push(
              `${material.id} paints ink ${ink} at ${ratio}:1 against its ${paint.groundHex} ground, at or past the ${MATERIAL_TEXTURE_MAX_CONTRAST}:1 WCAG non-text threshold: that is contrast drawn to be read as information, not to cover a surface`,
            );
          }
        }
      }
    }

    verdicts.set(material.id, {
      id: material.id,
      observed: { ...material, paint },
      failures,
    });
  }
  // A registry whose materials all lost their rules would otherwise report a
  // full population every clause of which was skipped.
  if (measured === 0) {
    throw new Error(
      'no registered material resolved to a shipped stylesheet rule, so every measured clause was skipped',
    );
  }
  return nonEmpty(verdicts, 'registered material');
}

/**
 * `VAL-B2-VIZ-014`: an original SVG compares against the immutable
 * normalized semantic baseline while excluding only the allowlisted style
 * attributes.
 *
 * The comparison is re-derived here rather than trusted from the census:
 * the census is regenerated from the same files, so a census-versus-file
 * comparison would be a file compared with itself. The pin is
 * `evidence/brand-v2/baseline/assets-svg.json`, which was sealed before the
 * rollout and is never rewritten.
 */
export function originalSvgSemanticVerdicts(
  assets: readonly AssetRow[],
  root: string,
  baselineMembers: ReadonlyArray<{ id: string; hash: string }>,
): Map<string, Verdict<Record<string, unknown>>> {
  const baseline = new Map(baselineMembers.map(({ id, hash }) => [id, hash]));
  const verdicts = new Map<string, Verdict<Record<string, unknown>>>();
  for (const id of firstPartySvgMembers(assets)) {
    const asset = assets.find((row) => row.id === id) as AssetRow;
    const failures: string[] = [];
    const svg = readFileSync(join(root, 'public', asset.path), 'utf8');
    const semanticHash = sha256(normalizeSvgSemantics(svg));
    const memberId = `public-svg:${asset.path}`;
    const sealed = baseline.get(memberId);
    if (!sealed) {
      failures.push(`${id} has no sealed baseline member at ${memberId}`);
    } else {
      const recomputed = sha256(
        stableJson({ path: asset.path, semanticHash }),
      );
      if (recomputed !== sealed) {
        failures.push(
          `${id} normalizes to semantic hash ${semanticHash.slice(0, 12)}, which does not reproduce the sealed baseline member: a node, a label, a coordinate or a textual alternative moved outside the style allowlist`,
        );
      }
    }
    // The hash proves equality with the seal, but a seal taken over an empty
    // drawing would be reproduced by an empty drawing. These assert the
    // drawing is still a drawing with a textual alternative and labels.
    if (!/\srole=["']img["']/.test(svg) || !/\saria-label=["'][^"']+["']/.test(svg)) {
      failures.push(`${id} ships without a role and an aria-label textual alternative`);
    }
    const labels = [...svg.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map(
      (match) => match[1],
    );
    if (labels.length === 0) {
      failures.push(`${id} carries no rendered labels`);
    }
    verdicts.set(id, {
      id,
      observed: {
        path: asset.path,
        semanticHash,
        sealedMember: memberId,
        labelCount: labels.length,
      },
      failures,
    });
  }
  return nonEmpty(verdicts, 'first-party SVG');
}

/**
 * The allowlist, spelled exactly as `scripts/brand-v2-baseline.ts` spells it.
 * Duplicated on purpose: the baseline script is a script rather than a
 * library, and importing it here would drag the whole census collection into
 * every consumer. The two are held together by the hash comparison above,
 * which fails the moment they disagree.
 */
function normalizeSvgSemantics(svg: string): string {
  return svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s(?:class|style|fill|stroke|stroke-width|opacity)=["'][^"']*["']/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .trim();
}
