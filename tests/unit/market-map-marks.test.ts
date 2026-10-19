import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMPANIES } from '@/data/companies';
import { LOGO_IMAGES } from '@/data/logo-images';
import { companyLogoIds, getCompanyLogo } from '@/data/logos';
import {
  MARK_PLACEMENT,
  MARK_PLATE_PADDING,
  MARK_PRESETS,
  WITHHELD_MARKS,
  markGeometry,
  markRatio,
  withheldMark,
} from '@/lib/market-map-marks';

/**
 * Placement of the company marks (lib/market-map-marks.ts). The mark files
 * and their registry are locked; these checks hold the rendering rules to
 * the bytes on disk, so a changed file fails here until it is measured
 * again (node scripts/measure-logo-marks.ts) or, for a withheld file,
 * until the withholding is reviewed.
 */

const repoRoot = join(import.meta.dirname, '../..');
const bytesOf = (file: string) => readFileSync(join(repoRoot, 'public', file));
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

describe('measured mark placement', () => {
  it('covers every registered mark and nothing else', () => {
    expect(Object.keys(MARK_PLACEMENT).sort()).toEqual(companyLogoIds().sort());
  });

  it('was measured from the bytes on disk', () => {
    for (const id of companyLogoIds()) {
      const asset = getCompanyLogo(id)!;
      expect(MARK_PLACEMENT[id].sha256, id).toBe(sha256(bytesOf(asset.file)).slice(0, 16));
    }
  });

  it('records artwork boxes inside the file box, and only where there is margin', () => {
    for (const [id, { box }] of Object.entries(MARK_PLACEMENT)) {
      if (box === null) continue;
      const [x0, y0, x1, y1] = box;
      expect(0 <= x0 && x0 < x1 && x1 <= 1, id).toBe(true);
      expect(0 <= y0 && y0 < y1 && y1 <= 1, id).toBe(true);
      expect(x0 > 0.005 || y0 > 0.005 || x1 < 0.995 || y1 < 0.995, id).toBe(true);
    }
    // The square Boston Dynamics file holds its wordmark in the middle
    // quarter of its height.
    const boston = MARK_PLACEMENT['boston-dynamics-logo'].box!;
    expect(boston[3] - boston[1]).toBeLessThan(0.25);
  });
});

describe('mark geometry', () => {
  const tile = MARK_PRESETS.tile;

  it('draws every map mark at least 10 px high and fits the narrowest tile', () => {
    for (const id of companyLogoIds()) {
      const geometry = markGeometry(getCompanyLogo(id)!, MARK_PLACEMENT[id], 'tile');
      const inner = geometry.tile.height - 2 * MARK_PLATE_PADDING;
      expect(inner, id).toBeGreaterThanOrEqual(10);
      expect(inner, id).toBeLessThanOrEqual(tile.maxHeight);
      expect(geometry.tile.width, id).toBeLessThanOrEqual(139);
    }
  });

  it('draws Apptronik and Boston Dynamics at a legible size', () => {
    // The old fixed 96 x 36 tile drew Apptronik's 12:1 wordmark 7.4 px
    // high, and the padded Boston Dynamics file a quarter of the tile.
    const apptronik = markGeometry(
      getCompanyLogo('apptronik-logo')!,
      MARK_PLACEMENT['apptronik-logo'],
      'tile',
    );
    expect(apptronik.tile.height - 2 * MARK_PLATE_PADDING).toBeGreaterThanOrEqual(10.5);
    const asset = getCompanyLogo('boston-dynamics-logo')!;
    const placement = MARK_PLACEMENT['boston-dynamics-logo'];
    const boston = markGeometry(asset, placement, 'tile');
    const box = placement.box!;
    // The artwork box, not the file box, fills the plate's inner area.
    const artHeight = boston.image.height * (box[3] - box[1]);
    expect(artHeight).toBeCloseTo(boston.tile.height - 2 * MARK_PLATE_PADDING, 1);
    expect(boston.image.top + box[1] * boston.image.height).toBeCloseTo(MARK_PLATE_PADDING, 1);
    expect(artHeight).toBeGreaterThanOrEqual(10.5);
    expect(markRatio(asset, placement)).toBeGreaterThan(4);
  });

  it('places the artwork box exactly on the plate for every mark at every preset', () => {
    for (const preset of ['tile', 'sheet'] as const) {
      for (const id of companyLogoIds()) {
        const placement = MARK_PLACEMENT[id];
        const geometry = markGeometry(getCompanyLogo(id)!, placement, preset);
        const [x0, y0, x1, y1] = placement.box ?? [0, 0, 1, 1];
        const left = geometry.image.left + x0 * geometry.image.width;
        const right = geometry.image.left + x1 * geometry.image.width;
        const top = geometry.image.top + y0 * geometry.image.height;
        const bottom = geometry.image.top + y1 * geometry.image.height;
        expect(left, `${preset} ${id}`).toBeCloseTo(MARK_PLATE_PADDING, 0);
        expect(top, `${preset} ${id}`).toBeCloseTo(MARK_PLATE_PADDING, 0);
        expect(right, `${preset} ${id}`).toBeCloseTo(geometry.tile.width - MARK_PLATE_PADDING, 0);
        expect(bottom, `${preset} ${id}`).toBeCloseTo(geometry.tile.height - MARK_PLATE_PADDING, 0);
      }
    }
  });
});

describe('withheld marks', () => {
  it('withholds exactly the three files that show another company’s mark', () => {
    expect(Object.keys(WITHHELD_MARKS).sort()).toEqual([
      'assured-robot-intelligence-logo',
      'farm-ng-logo',
      'nimble-robotics-logo',
    ]);
  });

  it('applies to the recorded bytes only, so a corrected file ends it', () => {
    for (const [id, entry] of Object.entries(WITHHELD_MARKS)) {
      const asset = getCompanyLogo(id);
      expect(asset, id).toBeDefined();
      expect(sha256(bytesOf(asset!.file)), id).toBe(entry.sha256);
      expect(entry.reason.length, id).toBeGreaterThan(30);
      expect(entry.recorded).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // The registry entry is still there (the data is locked) and still
      // claims to be that company's mark: the gap is real.
      const record = LOGO_IMAGES.find((image) => image.id === id)!;
      const companies = COMPANIES.filter((company) => company.logo === id);
      expect(companies, id).toHaveLength(1);
      expect(record.alt, id).toContain(companies[0].name);
      expect(withheldMark(id)).toBe(entry);
    }
    expect(withheldMark('figure-ai-logo')).toBeNull();
    expect(withheldMark(null)).toBeNull();
  });
});
