import { describe, expect, it } from 'vitest';
import {
  AUTONOMY_LEVELS,
  SURGICAL_SYSTEM_ROWS,
  systemAtLevel,
} from '@/lib/surgical-systems';

/**
 * Row content is checked against the primary sources the module cites:
 * the Intuitive da Vinci 5 clearance release (150+ enhancements, Force
 * Feedback, 10,000x compute), the CMR Versius De Novo authorization
 * (cholecystectomy indication), the Moon Surgical Maestro clearances
 * (hold-and-position assistant; ScoPilot camera following), and the Yang
 * et al. six-level autonomy framework that organizes the table.
 */
describe('SURGICAL_SYSTEM_ROWS', () => {
  it('covers the three systems the module is required to name', () => {
    const names = SURGICAL_SYSTEM_ROWS.map((r) => r.system);
    expect(names).toContain('Intuitive da Vinci');
    expect(names).toContain('CMR Versius');
    expect(names).toContain('Moon Surgical Maestro');
    expect(SURGICAL_SYSTEM_ROWS).toHaveLength(3);
  });

  it('states the da Vinci 5 figures from the clearance release', () => {
    const row = SURGICAL_SYSTEM_ROWS.find((r) => r.system === 'Intuitive da Vinci');
    expect(row?.focus).toMatch(/teleoperated/);
    // 150+ enhancements, Force Feedback, 10,000x compute over Xi.
    expect(row?.edge).toMatch(/150/);
    expect(row?.edge).toMatch(/Force Feedback/i);
    expect(row?.edge).toMatch(/10,000/);
  });

  it('states the Versius entry point from the De Novo authorization', () => {
    const row = SURGICAL_SYSTEM_ROWS.find((r) => r.system === 'CMR Versius');
    expect(row?.focus).toMatch(/compact/i);
    // US indication established via De Novo for cholecystectomy.
    expect(row?.regulatory).toMatch(/De Novo/i);
    expect(row?.regulatory).toMatch(/cholecystectomy/);
  });

  it('states the Maestro positioning from its 510(k) record', () => {
    const row = SURGICAL_SYSTEM_ROWS.find(
      (r) => r.system === 'Moon Surgical Maestro',
    );
    // Hold-and-position assistant, standard laparoscopic instruments.
    expect(row?.focus).toMatch(/hold/i);
    expect(row?.edge).toMatch(/standard laparoscopic/);
  });

  it('gives every row a Yang-framework autonomy level in 0..5', () => {
    for (const row of SURGICAL_SYSTEM_ROWS) {
      expect(row.autonomyLevel).toBeGreaterThanOrEqual(0);
      expect(row.autonomyLevel).toBeLessThanOrEqual(5);
      expect(typeof row.autonomyNote).toBe('string');
      expect(row.autonomyNote.length).toBeGreaterThan(0);
    }
  });
});

describe('AUTONOMY_LEVELS (Yang et al. framework)', () => {
  it('defines six levels numbered 0 through 5', () => {
    expect(AUTONOMY_LEVELS).toHaveLength(6);
    expect(AUTONOMY_LEVELS.map((l) => l.level)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('keeps Level 0 teleoperation and Level 5 full autonomy', () => {
    expect(AUTONOMY_LEVELS[0].name).toMatch(/No autonomy/i);
    expect(AUTONOMY_LEVELS[0].meaning).toMatch(/tele/i);
    expect(AUTONOMY_LEVELS[5].name).toMatch(/Full autonomy/i);
  });

  it('names the example the editorial gives for Level 2 task autonomy', () => {
    expect(AUTONOMY_LEVELS[2].meaning).toMatch(/suturing/i);
  });
});

describe('systemAtLevel', () => {
  it('returns the systems sitting at a given autonomy level', () => {
    expect(systemAtLevel(0)).toContain('Intuitive da Vinci');
    expect(systemAtLevel(0)).toContain('CMR Versius');
    expect(systemAtLevel(1)).toContain('Moon Surgical Maestro');
  });

  it('returns an empty array for levels no shipped system occupies', () => {
    expect(systemAtLevel(4)).toEqual([]);
    expect(systemAtLevel(5)).toEqual([]);
  });
});
