import { describe, expect, it } from 'vitest';
import { getCitation } from '@/data/citations';
import {
  GENERALIST_RELEASES,
  filterReleases,
  isVendorReported,
  provenanceLabel,
} from '@/lib/generalist-policies';

describe('GENERALIST_RELEASES registry', () => {
  it('covers every system the module surveys', () => {
    const names = GENERALIST_RELEASES.map((r) => r.name);
    for (const required of [
      'Helix',
      'Gemini Robotics 1.0',
      'GR00T N1',
      'AgiBot GO-1',
      'Gemini Robotics 1.5',
      'Helix 02',
      'Skild Brain',
      'GR00T N1.7',
      'AgiBot GO-2',
      'Gemini Robotics 2',
    ]) {
      expect(names).toContain(required);
    }
  });

  it('labels Gemini 1.5 chronology as its report submission rather than a release', () => {
    const gr15 = GENERALIST_RELEASES.find((r) => r.id === 'gemini-robotics-15');
    expect(gr15?.dateLabel).toBe('Oct 2025 report');
    expect(gr15?.capability).toMatch(/does not establish the release date/);
  });

  it('is sorted by release date', () => {
    const dates = GENERALIST_RELEASES.map((r) => r.released);
    expect([...dates].sort()).toEqual(dates);
  });

  it('partitions three availability states without treating null as closed', () => {
    const open = filterReleases('open');
    const unavailable = filterReleases('closed');
    const unknown = filterReleases('undisclosed');
    expect(open.every((r) => r.openWeights === true)).toBe(true);
    expect(unavailable.every((r) => r.openWeights === false)).toBe(true);
    expect(unknown.map((r) => r.id).sort()).toEqual([
      'gemini-robotics-15', 'gemini-robotics-2', 'skild-brain',
    ]);
    expect(unknown.every((r) => r.openWeights === null && Boolean(r.weightsNote))).toBe(true);
    expect(new Set([...open, ...unavailable, ...unknown].map((r) => r.id)).size).toBe(GENERALIST_RELEASES.length);
    expect(open.length + unavailable.length + unknown.length).toBe(GENERALIST_RELEASES.length);
    expect(filterReleases('all')).toHaveLength(GENERALIST_RELEASES.length);
    expect(open.map((r) => r.name)).toEqual(expect.arrayContaining(['GR00T N1', 'GR00T N1.7', 'AgiBot GO-1']));
  });

  it('every release cites a registered source', () => {
    for (const r of GENERALIST_RELEASES) {
      expect(
        getCitation(r.citationId),
        `${r.name} citation ${r.citationId}`,
      ).toBeDefined();
    }
  });

  it('paper-tier releases cite arXiv papers', () => {
    for (const r of GENERALIST_RELEASES.filter((x) => x.provenance === 'paper')) {
      const citation = getCitation(r.citationId);
      expect(citation?.arxiv, `${r.name} should have an arXiv id`).toMatch(
        /^\d{4}\.\d{4,5}$/,
      );
    }
  });

  it('marks Helix 02 and Skild as vendor-reported, GR00T N1 and Gemini Robotics 1.0 as papers', () => {
    const byName = (name: string) =>
      GENERALIST_RELEASES.find((r) => r.name === name);
    expect(isVendorReported(byName('Helix 02')!)).toBe(true);
    expect(isVendorReported(byName('Skild Brain')!)).toBe(true);
    expect(isVendorReported(byName('AgiBot GO-2')!)).toBe(true);
    expect(byName('GR00T N1')!.provenance).toBe('paper');
    expect(byName('Gemini Robotics 1.0')!.provenance).toBe('paper');
    expect(isVendorReported(byName('GR00T N1')!)).toBe(false);
    expect(isVendorReported(byName('Gemini Robotics 1.0')!)).toBe(false);
  });

  it('labels each provenance tier distinctly', () => {
    expect(provenanceLabel('paper')).toMatch(/paper/i);
    expect(provenanceLabel('docs')).toMatch(/repo|release notes/i);
    expect(provenanceLabel('blog')).toMatch(/vendor-reported/i);
    expect(provenanceLabel('press')).toMatch(/vendor-reported/i);
    expect(provenanceLabel('press')).not.toEqual(provenanceLabel('blog'));
  });

  it('marks pi-line context entries as cross-references', () => {
    const context = GENERALIST_RELEASES.filter((r) => r.context);
    expect(context.map((r) => r.name)).toEqual(
      expect.arrayContaining(['π0.5', 'π0.6', 'π0.7']),
    );
  });
});
