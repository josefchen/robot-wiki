import { BRAND_COLORS } from './brand-v2-tokens.ts';

/**
 * The materials the site paints, and the attributes a representative
 * surface carries to declare one (VAL-B2-SURF-011, VAL-DESIGN-030).
 *
 * Owner decision of 10 October 2026 (`PANTHEON-SPEC.md`): the research-page
 * sheet is plain paper, so the concrete micro-texture and the halftone dot
 * field are retired and `material:paper` is the one material left. It is a
 * flat token fill with no image, pattern or noise, so it is deterministic by
 * construction, owned, and carries no external provenance record.
 *
 * The rows mirror `contract/brand-v2-registries.json#materials` (written by
 * scripts/brand-v2-census.ts); tests/unit/brand-v2-materials.test.ts keeps
 * the two equal. The contrast verdict is computed here from the token pair
 * the material grounds (ink on paper) rather than typed as a literal, so a
 * token change that broke the text floor would flip the rendered verdict.
 */

export type MaterialTreatment = 'paper';

export type SiteMaterial = {
  id: `material:${MaterialTreatment}`;
  treatment: string;
  deterministic: true;
  ownership: 'owned';
  external: false;
  className: string;
  /** The ground the material paints, as a renderer-mirror hex. */
  ground: string;
  /** The text the ground carries, as a renderer-mirror hex. */
  text: string;
};

export const SITE_MATERIALS: Readonly<Record<MaterialTreatment, SiteMaterial>> = {
  paper: {
    id: 'material:paper',
    treatment: 'texture-free reading ground',
    deterministic: true,
    ownership: 'owned',
    external: false,
    className: 'material-paper',
    ground: BRAND_COLORS.paper,
    text: BRAND_COLORS.ink,
  },
};

/** WCAG 2.x normal-text floor the material's text pair must clear. */
export const MATERIAL_TEXT_CONTRAST_FLOOR = 4.5;

function channel(value: number): number {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const match = /^#([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})$/i.exec(hex);
  if (!match) throw new Error(`Material colours must be six-digit hexes; received ${hex}`);
  const [r, g, b] = match.slice(1).map((part) => channel(Number.parseInt(part, 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two six-digit hexes. */
export function materialContrast(foreground: string, background: string): number {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

export type MaterialAttributes = {
  'data-brand-material-id': SiteMaterial['id'];
  'data-brand-material-owned': SiteMaterial['ownership'];
  'data-brand-material-deterministic': 'true';
  'data-brand-material-external': 'false';
  'data-brand-material-contrast': 'pass' | 'fail';
};

/**
 * The declaration a representative surface carries. Spread it on the
 * surface's own element, never on an element that contains or sits inside
 * article prose: prose glyph grounds stay texture-free and undeclared.
 */
export function materialAttributes(
  treatment: MaterialTreatment = 'paper',
): MaterialAttributes {
  const material = SITE_MATERIALS[treatment];
  return {
    'data-brand-material-id': material.id,
    'data-brand-material-owned': material.ownership,
    'data-brand-material-deterministic': 'true',
    'data-brand-material-external': 'false',
    'data-brand-material-contrast':
      materialContrast(material.text, material.ground) >= MATERIAL_TEXT_CONTRAST_FLOOR
        ? 'pass'
        : 'fail',
  };
}
