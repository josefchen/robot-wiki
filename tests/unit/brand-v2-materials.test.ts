import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MATERIAL_TEXT_CONTRAST_FLOOR,
  SITE_MATERIALS,
  materialAttributes,
  materialContrast,
} from '@/lib/brand-v2-materials';

/**
 * Material treatments are deterministic, owned or provenance-backed,
 * contrast-safe, and absent behind prose (VAL-B2-SURF-007, VAL-B2-SURF-011,
 * VAL-DESIGN-030). The site paints one material, paper, and each named
 * representative surface declares it on its own element.
 */

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');
const registry = JSON.parse(read('contract/brand-v2-registries.json')) as {
  materials: Array<{ id: string; treatment: string; deterministic: boolean; ownership: string }>;
};

/** One named representative surface per surface class the contract lists. */
const REPRESENTATIVE_SURFACES = [
  ['home', 'app/page.tsx'],
  ['article', 'app/(content)/[domain]/[slug]/page.tsx'],
  ['discovery', 'app/(content)/[domain]/page.tsx'],
  ['market map', 'app/market-map/page.tsx'],
  ['playground', 'app/playground/page.tsx'],
] as const;

describe('site materials', () => {
  it('mirrors the material registry row for row', () => {
    expect(
      Object.values(SITE_MATERIALS).map(({ id, treatment, deterministic, ownership }) => ({
        id,
        treatment,
        deterministic,
        ownership,
      })),
    ).toEqual(
      registry.materials.map(({ id, treatment, deterministic, ownership }) => ({
        id,
        treatment,
        deterministic,
        ownership,
      })),
    );
  });

  it('declares a deterministic, owned, contrast-passing treatment', () => {
    const attributes = materialAttributes('paper');
    expect(attributes).toEqual({
      'data-brand-material-id': 'material:paper',
      'data-brand-material-owned': 'owned',
      'data-brand-material-deterministic': 'true',
      'data-brand-material-external': 'false',
      'data-brand-material-contrast': 'pass',
    });
    const paper = SITE_MATERIALS.paper;
    expect(materialContrast(paper.text, paper.ground)).toBeGreaterThanOrEqual(
      MATERIAL_TEXT_CONTRAST_FLOOR,
    );
  });

  it('computes the contrast verdict rather than asserting it', () => {
    // A low-contrast pair must come out below the floor, so the verdict in
    // the rendered attribute is a measurement and not a constant.
    expect(materialContrast('#A3A39E', '#FAFAF8')).toBeLessThan(MATERIAL_TEXT_CONTRAST_FLOOR);
    expect(materialContrast('#1C1C1A', '#FAFAF8')).toBeGreaterThan(15);
  });

  it('paints paper as a flat token fill with no image, pattern or noise', () => {
    const css = read('app/globals.css');
    const rule = /\.material-paper\s*\{([^}]*)\}/.exec(
      css.replace(/\.engineering-grid,\s*\n/, ''),
    );
    expect(rule?.[1]).toContain('background-color: var(--paper)');
    expect(rule?.[1]).toContain('background-image: none');
    expect(css).not.toMatch(/feTurbulence|url\([^)]*(?:noise|grain|halftone|dither)/i);
  });

  it('is declared on a named representative surface of every surface class, outside prose', () => {
    for (const [surface, module] of REPRESENTATIVE_SURFACES) {
      const source = read(module);
      expect(source, `${surface}: ${module}`).toMatch(/\{\.\.\.materialAttributes\('paper'\)\}/);
      // The declaration never lands on the prose column or inside it.
      expect(source, `${surface}: ${module}`).not.toMatch(
        /className="prose[^"]*"[^>]*materialAttributes|materialAttributes[^>]*className="prose/,
      );
    }
  });
});
