import { describe, expect, it } from 'vitest';
import { expectedApparatusGraph } from '@/lib/brand-v2-apparatus-evidence';
import { METHODS } from '@/data/methods';
import { CITATIONS } from '@/data/citations';
import { missingOccurrences } from '../e2e/source-reader-requirements';

describe('source reader obligations, independently derived before navigation', () => {
  const graph = expectedApparatusGraph(process.cwd());
  const oxe = 'open-x-embodiment-2023';

  it('distinguishes OXE further reading from inline chips on the two affected routes', () => {
    for (const route of ['/manipulation/comparison-matrix/', '/frontier/generalization/']) {
      const expected = graph.get(route)!;
      expect(expected.references).toContain(oxe);
      expect(expected.furtherReading).toContain(oxe);
      expect(expected.citationMarkers).not.toContain(oxe);
      expect(expected.componentCitationSites.map(site => site.id)).not.toContain(oxe);
    }
  });

  it('fails removal of an actual required GR2 inline occurrence on each affected route', () => {
    for (const route of ['/manipulation/comparison-matrix/', '/frontier/generalization/', '/frontier/reliability-gap/']) {
      const required = graph.get(route)!.citationMarkers;
      const observed = [...required];
      const index = observed.indexOf('gemini-robotics-2-2026');
      expect(index).toBeGreaterThanOrEqual(0);
      observed.splice(index, 1);
      expect(missingOccurrences(required, observed)).toEqual(['gemini-robotics-2-2026']);
    }
  });

  it('fails removal of an OXE interactive method-source link despite its surviving bibliography', () => {
    const required = METHODS.flatMap(method => [...method.sources]);
    const observed = [...required];
    const index = observed.indexOf(oxe);
    expect(index).toBeGreaterThanOrEqual(0);
    observed.splice(index, 1);
    expect(missingOccurrences(required, observed)).toEqual([oxe]);
  });

  it('does not let a single surviving duplicate satisfy two required chips', () => {
    expect(missingOccurrences(['source', 'source'], ['source'])).toEqual(['source']);
    expect(missingOccurrences(['source', 'source'], ['source', 'source'])).toEqual([]);
  });

  it('fails removal of a required bibliography entry even when its inline chip survives', () => {
    const expected = graph.get('/manipulation/vla-models/')!;
    const observed = [...expected.references];
    expect(expected.citationMarkers).toContain('rt1-2022');
    observed.splice(observed.indexOf('rt1-2022'), 1);
    expect(missingOccurrences(expected.references, observed)).toEqual(['rt1-2022']);
  });

  it('fails an incomplete expanded author list even when the team byline survives', () => {
    const required = CITATIONS.find(citation => citation.id === 'gemini-robotics-2025')!.authors;
    const observed = required.filter(author => author !== 'Saminda Abeyruwan');
    expect(required).toHaveLength(118);
    expect(required[0]).toBe('Gemini Robotics Team');
    expect(new Set(required).size).toBe(118);
    expect(required.at(-1)).toBe('Yuxiang Zhou');
    expect(observed).toContain('Gemini Robotics Team');
    expect(missingOccurrences(required, observed)).toEqual(['Saminda Abeyruwan']);
  });
});
