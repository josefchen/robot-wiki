import { render } from '@testing-library/react';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { ImageRef } from '@/components/mdx/image-ref';
import { CompanyDetail } from '@/components/market-map/company-card';
import { CompanyLogo } from '@/components/market-map/company-logo';
import { COMPANIES } from '@/data/companies';
import { attributionText, creditNoun, legalBasis, licenceLabel } from '@/data/images';
import { LOGO_IMAGES } from '@/data/logo-images';
import { getCompanyLogo } from '@/data/logos';
import { pngDimensions } from '@/lib/png-decode';
import { MARKET_MAP_AS_OF } from '@/lib/market-map';
import {
  MARK_PLACEMENT,
  MARK_PRESETS,
  WITHHELD_MARKS,
  markGeometry,
  markRatio,
  withheldMark,
  type MarkPreset,
} from '@/lib/market-map-marks';
import registries from '@/contract/brand-v2-registries.json';

/**
 * The provenance of every company mark the market map can draw
 * (VAL-B2-MAP-010), joined record by record from each company's `logo`:
 * the registry entry that credits it (data/logo-images.ts), the slim lookup
 * the map reads (data/logos.ts), its measured placement and any withholding
 * (lib/market-map-marks.ts), the contract's byte hash of the file
 * (contract/brand-v2-registries.json), and the bytes on disk.
 */

const repoRoot = join(import.meta.dirname, '../..');
const bytesOf = (file: string) => readFileSync(join(repoRoot, 'public', file));
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

type RegistryAsset = { path: string; category: string; sourceRegistryId?: string; byteHash: string };
const markAssets = (registries.assets as RegistryAsset[]).filter(
  (asset) => asset.category === 'official-mark',
);

/** The day this test runs, as an ISO date: no file can have been retrieved later. */
const today = new Date().toISOString().slice(0, 10);

/** A real calendar day written YYYY-MM-DD (2026-02-30 is not one). */
function isIsoDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

/** Width over height of the file itself, read from its own bytes. */
function intrinsicRatio(file: string): number {
  const bytes = bytesOf(file);
  if (file.endsWith('.png')) {
    const { width, height } = pngDimensions(bytes);
    return width / height;
  }
  if (file.endsWith('.webp')) {
    const chunk = bytes.toString('latin1', 12, 16);
    if (chunk === 'VP8X') return (1 + bytes.readUIntLE(24, 3)) / (1 + bytes.readUIntLE(27, 3));
    if (chunk === 'VP8L') {
      const bits = bytes.readUInt32LE(21);
      return ((bits & 0x3fff) + 1) / (((bits >> 14) & 0x3fff) + 1);
    }
    return (bytes.readUInt16LE(26) & 0x3fff) / (bytes.readUInt16LE(28) & 0x3fff);
  }
  if (file.endsWith('.svg')) {
    const tag = /<svg\b[^>]*>/i.exec(bytes.toString('utf8'))?.[0] ?? '';
    const attr = (name: string) =>
      new RegExp(`\\s${name}\\s*=\\s*["']([^"']+)["']`, 'i').exec(tag)?.[1]?.trim();
    const length = (value: string | undefined) => {
      const match = value ? /^([\d.]+)\s*(px|pt|mm|cm|in)?$/.exec(value) : null;
      return match ? { size: Number(match[1]), unit: match[2] ?? 'px' } : null;
    };
    const width = length(attr('width'));
    const height = length(attr('height'));
    if (width && height && width.unit === height.unit) return width.size / height.size;
    const box = attr('viewBox')?.split(/[\s,]+/).map(Number);
    if (box?.length === 4 && box[2] > 0 && box[3] > 0) return box[2] / box[3];
  }
  throw new Error(`${file}: no intrinsic size`);
}

const marks = COMPANIES.filter((company) => company.logo !== null).map((company) => {
  const id = company.logo!;
  return {
    company,
    id,
    record: LOGO_IMAGES.find((image) => image.id === id),
    asset: getCompanyLogo(id),
    placement: MARK_PLACEMENT[id],
    registered: markAssets.find((asset) => asset.sourceRegistryId === id),
  };
});

describe('market-map mark provenance, mark by mark (VAL-B2-MAP-010)', () => {
  it('joins every company mark to one registry record, lookup, placement and contract hash', () => {
    expect(marks.length).toBeGreaterThan(0);
    // One mark per company, and every registered mark belongs to a company.
    expect(new Set(marks.map((mark) => mark.id)).size).toBe(marks.length);
    expect(marks.map((mark) => mark.id).sort()).toEqual(LOGO_IMAGES.map((image) => image.id).sort());
    expect(markAssets).toHaveLength(marks.length);
    for (const mark of marks) {
      expect(mark.record, `${mark.company.id}: registry record for ${mark.id}`).toBeDefined();
      expect(mark.asset, `${mark.company.id}: lookup entry for ${mark.id}`).toBeDefined();
      expect(mark.placement, `${mark.company.id}: measured placement for ${mark.id}`).toBeDefined();
      expect(mark.registered, `${mark.company.id}: contract asset for ${mark.id}`).toBeDefined();
      expect(mark.asset!.file, mark.id).toBe(mark.record!.file);
      expect(`/${mark.registered!.path}`, mark.id).toBe(mark.record!.file);
    }
  });

  it('rests every mark on official identification use, from an https source, retrieved on a real day', () => {
    for (const { id, record } of marks) {
      expect(record!.file, id).toMatch(/^\/images\/logos\/[\w.-]+$/);
      expect(legalBasis(record!), id).toBe('official-identification-use');
      expect(record!.sourceUrl, `${id} source URL`).toBeDefined();
      expect(new URL(record!.sourceUrl!).protocol, `${id} source URL`).toBe('https:');
      expect(record!.creator.trim(), `${id} creator`).not.toBe('');
      expect(record!.sourceName.trim(), `${id} source name`).not.toBe('');
      expect(isIsoDay(record!.retrieved), `${id} retrieved ${record!.retrieved}`).toBe(true);
      // Fetched for this edition of the map: no earlier than the map's own
      // as-of date (the source checks that followed it run to October), and
      // never in the future.
      expect(record!.retrieved >= MARKET_MAP_AS_OF, `${id} retrieved ${record!.retrieved}`).toBe(true);
      expect(record!.retrieved <= today, `${id} retrieved ${record!.retrieved}`).toBe(true);
    }
  });

  it('renders each drawn mark’s attribution as its credit', () => {
    for (const { id, record } of marks) {
      expect(creditNoun(record!), id).toBe('Logo');
      expect(attributionText(record!), id).toBe(
        `Logo: ${record!.creator} / ${record!.sourceName}. Licence: ${licenceLabel(record!)}.`,
      );
      if (withheldMark(id)) continue;
      const { container, unmount } = render(createElement(ImageRef, { id }));
      const credit = container.querySelector('[data-image-credit]');
      expect(credit, id).not.toBeNull();
      expect(credit!.textContent!.replace(/\s+/g, ' ').trim(), id).toBe(attributionText(record!));
      expect(credit!.querySelector(`a[href="${record!.sourceUrl}"]`), `${id} links its source`).not.toBeNull();
      unmount();
    }
  });

  it('records the hash of the bytes on disk, in full in the contract and as the measured prefix', () => {
    for (const { id, record, placement, registered } of marks) {
      const disk = sha256(bytesOf(record!.file));
      expect(registered!.byteHash, `${id} contract byte hash`).toMatch(/^[0-9a-f]{64}$/);
      expect(registered!.byteHash, `${id} contract byte hash`).toBe(disk);
      expect(placement!.sha256, `${id} measured hash prefix`).toBe(disk.slice(0, 16));
    }
  });

  it('keeps every mark’s aspect ratio, from file to registry to drawn box', () => {
    const presets = Object.keys(MARK_PRESETS) as MarkPreset[];
    for (const { id, record, asset, placement } of marks) {
      // The recorded size is the file's own shape, within the rounding of
      // whole-pixel dimensions.
      const recorded = record!.width / record!.height;
      const tolerance = 0.5 / record!.width + 0.5 / record!.height;
      expect(
        Math.abs(recorded / intrinsicRatio(record!.file) - 1),
        `${id}: recorded ${record!.width}x${record!.height}`,
      ).toBeLessThanOrEqual(tolerance);
      expect([asset!.width, asset!.height], id).toEqual([record!.width, record!.height]);
      if (withheldMark(id)) continue;
      for (const preset of presets) {
        const geometry = markGeometry(asset!, placement, preset);
        // Rounded to 0.01 px: a drawn box is never stretched or squashed.
        const drawn = geometry.box.width / geometry.box.height;
        expect(Math.abs(drawn / markRatio(asset!, placement) - 1), `${id} ${preset} box`).toBeLessThan(
          0.01 / geometry.box.height + 0.01 / geometry.box.width + 1e-9,
        );
        const file = geometry.image.width / geometry.image.height;
        expect(Math.abs(file / recorded - 1), `${id} ${preset} file box`).toBeLessThan(
          0.01 / geometry.image.height + 0.01 / geometry.image.width + 1e-9,
        );
      }
    }
  });

  it('withholds exactly one mark, by its full hash, and never draws it', () => {
    const withheld = marks.filter(({ id }) => withheldMark(id) !== null);
    expect(withheld.map(({ id }) => id)).toEqual(Object.keys(WITHHELD_MARKS));
    expect(withheld).toHaveLength(1);
    for (const mark of marks) {
      const entry = withheldMark(mark.id);
      for (const preset of ['tile', 'sheet'] as const) {
        const { container, unmount } = render(
          createElement(CompanyLogo, { company: mark.company, preset, fallback: 'text' }),
        );
        const drawn = container.querySelector('[data-logo-mark]');
        if (entry) {
          expect(entry.sha256, mark.id).toBe(sha256(bytesOf(mark.record!.file)));
          expect(drawn, `${mark.id} is drawn at ${preset}`).toBeNull();
          expect(container.innerHTML, mark.id).not.toContain(mark.record!.file);
          // The name stands in as text.
          expect(container.textContent, mark.id).toContain(mark.company.name.split(' (')[0]);
        } else {
          expect(drawn?.getAttribute('data-logo-src'), `${mark.id} at ${preset}`).toBe(mark.record!.file);
        }
        unmount();
      }
    }
    const [ari] = withheld;
    const { container } = render(
      createElement(CompanyDetail, { company: ari.company, headingId: 'detail', onClose: () => {} }),
    );
    expect(container.querySelector('[data-logo-mark]')).toBeNull();
    expect(container.innerHTML).not.toContain(ari.record!.file);
    expect(container.querySelector('[data-logo-credit]')).toHaveTextContent(
      `Logo not shown. ${WITHHELD_MARKS[ari.id].reason}`,
    );
    expect(container.querySelector(`a[href="/credits/#${ari.id}"]`)).toBeNull();
  });
});
