import { describe, expect, it } from 'vitest';
import { entityAnchorId, parseEntityAnchor } from '@/lib/entity-anchor';

describe('entity anchors', () => {
  it('builds and parses company, method, and dataset hashes', () => {
    expect(entityAnchorId('company', 'figure-ai')).toBe('company-figure-ai');
    expect(parseEntityAnchor('#company-figure-ai')).toEqual({
      kind: 'company',
      id: 'figure-ai',
    });
    expect(parseEntityAnchor('#method-diffusion-policy')).toEqual({
      kind: 'method',
      id: 'diffusion-policy',
    });
    expect(parseEntityAnchor('#dataset-droid')).toEqual({
      kind: 'dataset',
      id: 'droid',
    });
  });

  it('rejects empty or unknown hashes', () => {
    expect(parseEntityAnchor('')).toBeNull();
    expect(parseEntityAnchor('#segment-humanoids')).toBeNull();
    expect(parseEntityAnchor('#company-')).toBeNull();
  });
});
