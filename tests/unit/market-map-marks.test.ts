import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMPANIES } from '@/data/companies';
import { LOGO_IMAGES } from '@/data/logo-images';
import { companyLogoIds, getCompanyLogo } from '@/data/logos';
import {
  BLOCK_FILL,
  INK_WEIGHT,
  LUMINANCE_MASKS,
  MARK_PLACEMENT,
  MARK_PRESETS,
  WITHHELD_MARKS,
  inkWeight,
  markGeometry,
  markInk,
  markRatio,
  withheldMark,
} from '@/lib/market-map-marks';

/**
 * Placement and ink of the company marks (lib/market-map-marks.ts). These
 * checks hold the rendering rules to the bytes on disk, so a changed file
 * fails here until it is measured again (node scripts/measure-logo-marks.ts)
 * or, for a withheld file or a luminance-derived mask, until the entry is
 * reviewed.
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

describe('no mark draws as a block', () => {
  const drawn = companyLogoIds().filter((id) => !(id in WITHHELD_MARKS));

  it('measures every mask’s ink inside its artwork box', () => {
    for (const id of companyLogoIds()) {
      const { ink } = MARK_PLACEMENT[id];
      expect(ink, id).toBeGreaterThan(0);
      expect(ink, id).toBeLessThanOrEqual(1);
    }
  });

  it('keeps every drawn mask under the block fill, so a silhouette is never a solid shape', () => {
    expect(drawn.length).toBeGreaterThan(100);
    const blocks = drawn.filter((id) => MARK_PLACEMENT[id].ink >= BLOCK_FILL).map((id) => `${id} ${MARK_PLACEMENT[id].ink}`);
    expect(blocks).toEqual([]);
  });

  it('refuses a file with an opaque background: its alpha mask fills its box', () => {
    // The withheld ARI file is an app icon on an opaque square; drawn by its
    // alpha it would be exactly the block the rule refuses.
    expect(MARK_PLACEMENT['assured-robot-intelligence-logo'].ink).toBeGreaterThanOrEqual(BLOCK_FILL);
  });
});

describe('luminance-derived masks', () => {
  it('apply to the recorded bytes only and name their reason', () => {
    expect(Object.keys(LUMINANCE_MASKS).sort()).toEqual([
      'k-scale-labs-logo',
      'miso-robotics-logo',
      'rainbow-robotics-logo',
      'sanhua-logo',
    ]);
    for (const [id, entry] of Object.entries(LUMINANCE_MASKS)) {
      const asset = getCompanyLogo(id);
      expect(asset, id).toBeDefined();
      expect(sha256(bytesOf(asset!.file)), id).toBe(entry.sha256);
      expect(['light', 'dark'], id).toContain(entry.ink);
      expect(entry.reason.length, id).toBeGreaterThan(30);
      expect(entry.recorded).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(markInk(id)).toBe(entry.ink);
      expect(id in WITHHELD_MARKS, id).toBe(false);
    }
    expect(markInk('nvidia-logo')).toBe('alpha');
    expect(markInk(null)).toBe('alpha');
  });
});

describe('mark geometry', () => {
  const tile = MARK_PRESETS.tile;

  it('draws every map mark at least 10 px high and fits the narrowest tile', () => {
    for (const id of companyLogoIds()) {
      const geometry = markGeometry(getCompanyLogo(id)!, MARK_PLACEMENT[id], 'tile');
      expect(geometry.box.height, id).toBeGreaterThanOrEqual(10);
      expect(geometry.box.height, id).toBeLessThanOrEqual(tile.maxHeight);
      expect(geometry.box.width, id).toBeLessThanOrEqual(tile.maxWidth);
    }
  });

  it('weights each mark’s area by its ink, within the recorded range', () => {
    for (const id of companyLogoIds()) {
      const weight = inkWeight(MARK_PLACEMENT[id]);
      expect(weight, id).toBeGreaterThanOrEqual(INK_WEIGHT.min);
      expect(weight, id).toBeLessThanOrEqual(INK_WEIGHT.max);
    }
    // A hairline wordmark is drawn larger than a solid slab of the same shape.
    const light = { sha256: 'x', box: null, ink: 0.1 };
    const heavy = { sha256: 'x', box: null, ink: 0.7 };
    const asset = { file: '/x.svg', width: 300, height: 100 };
    expect(markGeometry(asset, light, 'sheet').box.height).toBeGreaterThan(
      markGeometry(asset, heavy, 'sheet').box.height,
    );
  });

  it('draws Apptronik and Boston Dynamics at a legible size', () => {
    // The old fixed 96 x 36 tile drew Apptronik's 12:1 wordmark 7.4 px
    // high, and the padded Boston Dynamics file a quarter of the tile.
    const apptronik = markGeometry(
      getCompanyLogo('apptronik-logo')!,
      MARK_PLACEMENT['apptronik-logo'],
      'tile',
    );
    expect(apptronik.box.height).toBeGreaterThanOrEqual(10.5);
    const asset = getCompanyLogo('boston-dynamics-logo')!;
    const placement = MARK_PLACEMENT['boston-dynamics-logo'];
    const boston = markGeometry(asset, placement, 'tile');
    const box = placement.box!;
    // The artwork box, not the file box, fills the drawn box.
    const artHeight = boston.image.height * (box[3] - box[1]);
    expect(artHeight).toBeCloseTo(boston.box.height, 1);
    expect(boston.image.top + box[1] * boston.image.height).toBeCloseTo(0, 1);
    expect(artHeight).toBeGreaterThanOrEqual(10.5);
    expect(markRatio(asset, placement)).toBeGreaterThan(4);
  });

  it('places the artwork box exactly on the drawn box for every mark at every preset', () => {
    for (const preset of ['tile', 'sheet', 'credits'] as const) {
      for (const id of companyLogoIds()) {
        const placement = MARK_PLACEMENT[id];
        const geometry = markGeometry(getCompanyLogo(id)!, placement, preset);
        const [x0, y0, x1, y1] = placement.box ?? [0, 0, 1, 1];
        const left = geometry.image.left + x0 * geometry.image.width;
        const right = geometry.image.left + x1 * geometry.image.width;
        const top = geometry.image.top + y0 * geometry.image.height;
        const bottom = geometry.image.top + y1 * geometry.image.height;
        expect(left, `${preset} ${id}`).toBeCloseTo(0, 0);
        expect(top, `${preset} ${id}`).toBeCloseTo(0, 0);
        expect(right, `${preset} ${id}`).toBeCloseTo(geometry.box.width, 0);
        expect(bottom, `${preset} ${id}`).toBeCloseTo(geometry.box.height, 0);
      }
    }
  });
});

describe('withheld marks', () => {
  it('withholds exactly the one file that shows another company’s mark', () => {
    // Nimble's and Farm-ng's files were replaced by their official marks on
    // 19 October 2026 (Farm-ng's from the archived farm-ng.com, by the owner
    // session's decision); ARI never published a mark.
    expect(Object.keys(WITHHELD_MARKS).sort()).toEqual(['assured-robot-intelligence-logo']);
    expect(withheldMark('nimble-robotics-logo')).toBeNull();
    expect(withheldMark('farm-ng-logo')).toBeNull();
    // The replaced Farm-ng file no longer carries the Bonsai wordmark's bytes.
    expect(sha256(bytesOf(getCompanyLogo('farm-ng-logo')!.file))).not.toBe(
      '3e8030e3050445fd32d22cb06a45a42dd109721b397da1cdeed5f13dc96dbd38',
    );
  });

  it('applies to the recorded bytes only, so a corrected file ends it', () => {
    for (const [id, entry] of Object.entries(WITHHELD_MARKS)) {
      const asset = getCompanyLogo(id);
      expect(asset, id).toBeDefined();
      expect(sha256(bytesOf(asset!.file)), id).toBe(entry.sha256);
      expect(entry.reason.length, id).toBeGreaterThan(30);
      expect(entry.recorded).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // The registry entry is still there and still claims to be that
      // company's mark: the gap is real.
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
