import { describe, expect, it } from 'vitest';
import {
  BACK_WALL,
  CAPABILITIES,
  DEFAULT_REPRESENTATION,
  DEFAULT_RESOLUTION_INDEX,
  OCCLUDER,
  REPRESENTATIONS,
  RESOLUTION_CM,
  SENSOR,
  THIN_POST,
  TRANSPARENT_BOTTLE,
  capabilityLabel,
  footprint,
  formatBytes,
  formatCount,
  hallucinatedSplats,
  occlusionShadow,
  occupancyCells,
  pointInPolygon,
  representationById,
  resolutionCm,
  surfaceSamples,
  type CapabilityId,
  type RepresentationId,
} from '@/lib/scene-representation';

const IDS = REPRESENTATIONS.map((r) => r.id);

function capabilityKey(id: RepresentationId): string {
  const rep = representationById(id);
  return CAPABILITIES.map((c) => `${c.id}=${rep.capabilities[c.id].state}`).join(
    '|',
  );
}

describe('the representation ladder', () => {
  it('carries the five rungs the module argues over', () => {
    expect(IDS).toEqual([
      'point-cloud',
      'occupancy-grid',
      'tsdf',
      'mesh',
      'gaussian-splat',
    ]);
    expect(IDS).toContain(DEFAULT_REPRESENTATION);
  });

  it('grades all three capabilities on every rung, with a reason on each', () => {
    for (const rep of REPRESENTATIONS) {
      for (const capability of CAPABILITIES) {
        const graded = rep.capabilities[capability.id];
        expect(graded, `${rep.id}/${capability.id}`).toBeDefined();
        expect(['yes', 'partial', 'no']).toContain(graded.state);
        expect(graded.note.length, `${rep.id}/${capability.id} note`).toBeGreaterThan(20);
      }
    }
  });

  it('gives at least two rungs different capability sets (VAL-CLASS-050)', () => {
    const distinct = new Set(IDS.map(capabilityKey));
    expect(distinct.size).toBeGreaterThanOrEqual(2);
  });

  it('reports a negative contact-normal state on at least one rung (VAL-CLASS-050)', () => {
    const negatives = REPRESENTATIONS.filter(
      (r) => r.capabilities['contact-normal'].state === 'no',
    ).map((r) => r.id);
    expect(negatives).toContain('gaussian-splat');
    expect(negatives).toContain('occupancy-grid');
  });

  it('separates the two rungs the article turns on', () => {
    // Occupancy answers free space and never a normal; a splat is the
    // mirror image, and that asymmetry is the whole argument.
    const grid = representationById('occupancy-grid');
    const splat = representationById('gaussian-splat');
    expect(grid.capabilities['free-space'].state).toBe('yes');
    expect(grid.capabilities['novel-view'].state).toBe('no');
    expect(splat.capabilities['free-space'].state).toBe('no');
    expect(splat.capabilities['novel-view'].state).toBe('yes');
    // The signed-distance field is the only rung that answers all three
    // of free space, a normal, and something renderable.
    const tsdf = representationById('tsdf');
    expect(tsdf.capabilities['free-space'].state).toBe('yes');
    expect(tsdf.capabilities['contact-normal'].state).toBe('yes');
  });

  it('says what each rung does with the unobserved region', () => {
    for (const rep of REPRESENTATIONS) {
      expect(rep.unobserved.length, rep.id).toBeGreaterThan(30);
    }
    expect(representationById('occupancy-grid').unobserved).toMatch(/unknown/i);
    expect(representationById('gaussian-splat').unobserved).toMatch(
      /no unknown state/i,
    );
  });

  it('rejects an unknown id or capability', () => {
    expect(() => representationById('nerf' as RepresentationId)).toThrow(
      /unknown scene representation/,
    );
    expect(() => capabilityLabel('texture' as CapabilityId)).toThrow(
      /unknown capability/,
    );
  });
});

describe('memory footprint', () => {
  it('increases strictly as the map gets finer, on every rung (VAL-CLASS-051)', () => {
    for (const id of IDS) {
      const series = RESOLUTION_CM.map((cm) => footprint(id, cm).bytes);
      expect(series.length).toBeGreaterThanOrEqual(3);
      for (let i = 1; i < series.length; i += 1) {
        expect(series[i], `${id} at ${RESOLUTION_CM[i]} cm`).toBeGreaterThan(
          series[i - 1]!,
        );
      }
    }
  });

  it('bills volume cubically and surfaces quadratically', () => {
    // Halving the cell size costs 8x on a volumetric grid and 4x on a
    // surface store; the ratio is the reason a narrow band is affordable.
    const gridRatio =
      footprint('occupancy-grid', 10).bytes / footprint('occupancy-grid', 20).bytes;
    const bandRatio = footprint('tsdf', 10).bytes / footprint('tsdf', 20).bytes;
    expect(gridRatio).toBeCloseTo(8, 1);
    expect(bandRatio).toBeCloseTo(4, 1);
  });

  it('prices a Gaussian far above a voxel at the same spacing', () => {
    expect(footprint('gaussian-splat', 20).bytes).toBeGreaterThan(
      footprint('occupancy-grid', 20).bytes,
    );
  });

  it('reports element counts with the element name', () => {
    const grid = footprint('occupancy-grid', 10);
    // 3.0 x 3.0 x 2.0 m at 10 cm voxels is 30 x 30 x 20 cells.
    expect(grid.elements).toBe(18000);
    expect(grid.elementName).toBe('voxels');
    expect(footprint('gaussian-splat', 20).elementName).toBe('Gaussians');
  });

  it('rejects a non-positive cell size', () => {
    expect(() => footprint('occupancy-grid', 0)).toThrow(/must be positive/);
    expect(() => footprint('mesh', -4)).toThrow(/must be positive/);
  });

  it('indexes the resolution ladder and defaults inside it', () => {
    expect(resolutionCm(0)).toBe(RESOLUTION_CM[0]);
    expect(() => resolutionCm(RESOLUTION_CM.length)).toThrow(/out of range/);
    expect(DEFAULT_RESOLUTION_INDEX).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_RESOLUTION_INDEX).toBeLessThan(RESOLUTION_CM.length);
    // Coarsest first, so a higher slider value is always a finer map.
    for (let i = 1; i < RESOLUTION_CM.length; i += 1) {
      expect(RESOLUTION_CM[i]).toBeLessThan(RESOLUTION_CM[i - 1]!);
    }
  });

  it('formats bytes and counts for a reader', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(40 * 1024)).toBe('40 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB');
    expect(formatCount(18000)).toBe('18,000');
  });
});

describe('the synthetic scene', () => {
  it('casts a shadow away from the sensor, clipped at the wall', () => {
    const shadow = occlusionShadow();
    expect(shadow).toHaveLength(4);
    // The near edge is the occluder's far face; the far edge sits at the wall.
    expect(shadow[0]!.y).toBe(OCCLUDER.y + OCCLUDER.height);
    expect(shadow[2]!.y).toBe(BACK_WALL.y + BACK_WALL.height);
    // The shadow widens with distance from the sensor.
    const nearWidth = shadow[1]!.x - shadow[0]!.x;
    const farWidth = shadow[2]!.x - shadow[3]!.x;
    expect(farWidth).toBeGreaterThan(nearWidth);
    // And it lies on the far side of the occluder, not the sensor's side.
    expect(shadow[2]!.y).toBeLessThan(SENSOR.y);
  });

  it('refuses an occluder behind the sensor', () => {
    expect(() =>
      occlusionShadow(SENSOR, { x: 0, y: SENSOR.y + 10, width: 10, height: 10 }),
    ).toThrow(/in front of the sensor/);
  });

  it('puts points inside and outside the shadow polygon correctly', () => {
    const shadow = occlusionShadow();
    const midX = (shadow[0]!.x + shadow[1]!.x) / 2;
    const midY = (shadow[0]!.y + shadow[2]!.y) / 2;
    expect(pointInPolygon({ x: midX, y: midY }, shadow)).toBe(true);
    expect(pointInPolygon({ x: 290, y: midY }, shadow)).toBe(false);
    expect(pointInPolygon({ x: midX, y: 190 }, shadow)).toBe(false);
  });

  it('labels grid cells free, occupied and unknown', () => {
    const cells = occupancyCells(10);
    const states = new Set(cells.map((c) => c.state));
    expect(states).toEqual(new Set(['free', 'occupied', 'unknown']));
    // Finer cells mean more of them, and the unknown region survives.
    const fine = occupancyCells(10);
    const coarse = occupancyCells(30);
    expect(fine.length).toBeGreaterThan(coarse.length);
    expect(fine.some((c) => c.state === 'unknown')).toBe(true);
    expect(coarse.some((c) => c.state === 'unknown')).toBe(true);
  });

  it('marks the transparent object at the wrong depth, not at its surface', () => {
    const cells = occupancyCells(10);
    const occupiedNearBottle = cells.filter(
      (c) => c.state === 'occupied' && c.x >= 220 && c.x <= 260,
    );
    expect(occupiedNearBottle.length).toBeGreaterThan(0);
    // The sensor sits at y=196 and the back wall at y=14, so "further from
    // the sensor" means SMALLER y. The bottle spans y 62 to 86, which makes
    // 86 the face the sensor sees first; a depth return that lands behind it
    // has y < 86. (An earlier version of this test used 62, the bottle's far
    // face, and so demanded the returns fall behind the whole object.)
    const trueFront = TRANSPARENT_BOTTLE.y + TRANSPARENT_BOTTLE.height;
    for (const cell of occupiedNearBottle) {
      expect(cell.y + cell.size).toBeLessThanOrEqual(trueFront);
    }
  });

  it('drops the thin post to a single sample once the spacing cannot resolve it', () => {
    const coarse = surfaceSamples(10).filter((s) => s.kind === 'thin');
    const fine = surfaceSamples(THIN_POST.width).filter((s) => s.kind === 'thin');
    expect(coarse).toHaveLength(1);
    expect(fine.length).toBeGreaterThan(1);
  });

  it('samples every visible surface and skips the shadowed wall', () => {
    const samples = surfaceSamples(10);
    const kinds = new Set(samples.map((s) => s.kind));
    expect(kinds).toEqual(new Set(['wall', 'occluder', 'thin', 'transparent']));
    const shadow = occlusionShadow();
    const wall = samples.filter((s) => s.kind === 'wall');
    expect(wall.length).toBeGreaterThan(4);
    for (const sample of wall) {
      expect(pointInPolygon(sample, shadow), `wall sample at ${sample.x}`).toBe(
        false,
      );
    }
  });

  it('puts the transparent samples behind the real surface', () => {
    const samples = surfaceSamples(10).filter((s) => s.kind === 'transparent');
    expect(samples.length).toBeGreaterThan(3);
    // Behind the face the sensor actually sees (y = 86), not behind the far
    // face at y = 62. Smaller y is further away; see the occupancy test above.
    const trueFront = TRANSPARENT_BOTTLE.y + TRANSPARENT_BOTTLE.height;
    for (const sample of samples) {
      expect(sample.y).toBeLessThan(trueFront);
    }
  });

  it('rejects a non-positive spacing', () => {
    expect(() => surfaceSamples(0)).toThrow(/must be positive/);
  });

  it('hallucinates splats only inside the unobserved region, deterministically', () => {
    const shadow = occlusionShadow();
    const first = hallucinatedSplats(10);
    const second = hallucinatedSplats(10);
    expect(first.length).toBeGreaterThan(3);
    expect(second).toEqual(first);
    for (const splat of first) {
      expect(pointInPolygon(splat, shadow)).toBe(true);
    }
  });
});
