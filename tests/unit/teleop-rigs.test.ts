import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { TELEOP_RIGS } from '@/data/teleop-rigs';
import { teleopRigSchema } from '@/data/schemas/teleop-rig';
import { getCitation } from '@/data/citations';
import {
  RATING_RANK,
  RIG_FIELDS,
  rigSortValue,
  type TeleopRigField,
} from '@/lib/teleop-rigs';

/**
 * The teleop-rig matrix data contract (VAL-DATA-017 through VAL-DATA-020):
 * rows validate against the schema, the four named rig families are
 * present, every row carries citation-registry sources and external links,
 * every comparison dimension is populated per row, and unpublished figures
 * stay null rather than invented.
 */

const REQUIRED_IDS = ['aloha-workstation', 'gello', 'umi', 'vr-teleop'];

describe('TELEOP_RIGS data', () => {
  it('validates against the teleop-rig schema', () => {
    const parsed = z.array(teleopRigSchema).safeParse(TELEOP_RIGS);
    expect(parsed.success).toBe(true);
  });

  it('covers the four rig families VAL-DATA-019 requires', () => {
    const ids = new Set(TELEOP_RIGS.map((rig) => rig.id));
    for (const id of REQUIRED_IDS) {
      expect(ids.has(id), `missing rig family: ${id}`).toBe(true);
    }
  });

  it('gives every row at least one source in the citation registry', () => {
    for (const rig of TELEOP_RIGS) {
      expect(rig.sources.length).toBeGreaterThan(0);
      for (const id of rig.sources) {
        expect(
          getCitation(id),
          `${rig.id} cites unregistered source ${id}`,
        ).toBeDefined();
      }
    }
  });

  it('gives every row at least one external https link', () => {
    for (const rig of TELEOP_RIGS) {
      expect(rig.links.length).toBeGreaterThan(0);
      for (const link of rig.links) {
        expect(link.url).toMatch(/^https:\/\//);
      }
    }
  });

  it('populates all four comparison dimensions for every row (VAL-DATA-019)', () => {
    for (const rig of TELEOP_RIGS) {
      expect(rig.dataQualityNote.length).toBeGreaterThan(0);
      expect(rig.throughputNote.length).toBeGreaterThan(0);
      expect(rig.embodimentGapNote.length).toBeGreaterThan(0);
      for (const field of RIG_FIELDS) {
        expect(
          rig.details[field.id]?.length,
          `${rig.id} missing detail for ${field.id}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('keeps the unpublished VR system cost null instead of guessed (VAL-DATA-020)', () => {
    const vr = TELEOP_RIGS.find((rig) => rig.id === 'vr-teleop');
    expect(vr, 'missing vr-teleop row').toBeDefined();
    expect(vr?.costUsd).toBeNull();
    // A null cost cell must carry no numeric note either; the module prose
    // carries the headset prices.
    expect(vr?.costNote).toBeUndefined();
  });

  it('honors the source-verified cost anchors', () => {
    // GELLO: parts BOM under $300 (GELLO project site / paper).
    expect(TELEOP_RIGS.find((r) => r.id === 'gello')?.costUsd).toBe(300);
    // UMI: $73 printed gripper + $298 GoPro and accessories (paper, Sec. III).
    expect(TELEOP_RIGS.find((r) => r.id === 'umi')?.costUsd).toBe(371);
    // ALOHA 2 low end of the $17,000-$32,000 range (LeRobot pricing).
    expect(TELEOP_RIGS.find((r) => r.id === 'aloha-workstation')?.costUsd).toBe(
      17000,
    );
  });
});

describe('teleop-rig helpers', () => {
  it('orders ratings low < medium < high', () => {
    expect(RATING_RANK.low).toBeLessThan(RATING_RANK.medium);
    expect(RATING_RANK.medium).toBeLessThan(RATING_RANK.high);
  });

  it('lists exactly the four comparison dimensions', () => {
    const ids = RIG_FIELDS.map((field) => field.id).sort();
    expect(ids).toEqual(['cost', 'dataQuality', 'embodimentGap', 'throughput']);
    for (const field of RIG_FIELDS) {
      expect(field.label.length).toBeGreaterThan(0);
      expect(field.legend.length).toBeGreaterThan(0);
    }
  });

  it('maps cost to the USD figure and ratings to their rank', () => {
    const gello = TELEOP_RIGS.find((r) => r.id === 'gello');
    const vr = TELEOP_RIGS.find((r) => r.id === 'vr-teleop');
    expect(gello && rigSortValue(gello, 'cost')).toBe(300);
    expect(vr && rigSortValue(vr, 'cost')).toBeNull();
    for (const field of ['dataQuality', 'throughput', 'embodimentGap'] as Array<
      Exclude<TeleopRigField, 'cost'>
    >) {
      for (const rig of TELEOP_RIGS) {
        const value = rigSortValue(rig, field);
        expect([0, 1, 2]).toContain(value);
      }
    }
  });
});
