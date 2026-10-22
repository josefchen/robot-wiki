import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEVICE_REGISTRATION } from '@/components/ui/brand-device';

/**
 * Every rendered grid device names its purpose and owner (VAL-B2-GRID-009,
 * the purposeful-devices anchor of contract/design-integrity.md §1.12). The
 * component carries the registry half of each row so an instance never
 * renders as a bare mark; this keeps that half equal to the generated
 * registry instead of letting the two drift apart.
 */

type DeviceRow = {
  id: string;
  ownerSurface: string;
  structuralPurpose: string;
  definedIn: string[];
  mountState: string;
};

const registry = JSON.parse(
  readFileSync(join(process.cwd(), 'contract', 'brand-v2-registries.json'), 'utf8'),
) as { gridDevices: DeviceRow[] };

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

describe('brand device registration', () => {
  it('mirrors the purpose and owner surface of every registry row the component writes', () => {
    const written = Object.keys(DEVICE_REGISTRATION).map((device) => `device:${device}`);
    const rows = registry.gridDevices.filter(({ definedIn }) =>
      definedIn.includes('components/ui/brand-device.tsx'),
    );
    expect(rows.map(({ id }) => id).sort()).toEqual(written.sort());
    for (const row of rows) {
      const mirror = DEVICE_REGISTRATION[row.id.replace(/^device:/, '') as keyof typeof DEVICE_REGISTRATION];
      expect(mirror, row.id).toEqual({
        structuralPurpose: row.structuralPurpose,
        ownerSurface: row.ownerSurface,
      });
    }
  });

  it('gives every hand-written production device a registered purpose and an owner', () => {
    // Devices mounted as plain elements rather than through <BrandDevice>
    // have to state the same two facts themselves.
    for (const row of registry.gridDevices.filter(({ mountState }) => mountState === 'production')) {
      for (const owner of row.definedIn.filter((path) => path !== 'components/ui/brand-device.tsx')) {
        const source = read(owner);
        if (!source.includes(`data-brand-device-id="${row.id}"`)) continue;
        const start = source.indexOf(`data-brand-device-id="${row.id}"`);
        // The opening tag's annotation block, up to its class list.
        const element = source.slice(source.lastIndexOf('<', start), source.indexOf('className=', start));
        expect(element, `${owner} ${row.id}`).toContain(`data-brand-purpose="${row.structuralPurpose}"`);
        expect(element, `${owner} ${row.id}`).toMatch(/data-brand-owner="[^"]+"/);
        expect(element, `${owner} ${row.id}`).toContain(
          `data-brand-motif="${row.id.replace(/^device:/, '')}"`,
        );
      }
    }
  });

  it('draws rails and rules as 1px hairlines with no accent bar', () => {
    const source = read('components/ui/brand-device.tsx');
    expect(source).not.toMatch(/border-[lrtbxy]-\[[2-9]px\]|border-[lrtbxy]-[2-8]\b/);
    expect(source).not.toMatch(/border-(?:selection|highlight|concrete)\b/);
  });
});
