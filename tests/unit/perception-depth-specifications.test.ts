import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITATIONS } from '@/data/citations';
import {
  DEFAULT_PARAMS, NOMINAL_RANGE_M, PUBLISHED_DEPTH_SPEC_PCT,
  TARGET_CLASSES,
} from '@/lib/perception-error';

const article = readFileSync('content/classical/perception.mdx', 'utf8');
const depth = article.split('## Depth sensing:')[1].split('## Detection:')[0];

describe('named-device depth specification corrections', () => {
  it('retains D400 model ranges, valid-pixel metric, ROI and test conditions', () => {
    for (const text of ['D410/D415 and D43x', 'up to 2 m', '80%', 'HD resolution',
      'D450/D455/D455f/D456', 'up to 4 m', 'D401/D405', 'up to 0.5 m',
      'valid pixels', 'ground truth', 'typical conditions', 'auto exposure',
      '150 mW', '250 lux']) expect(depth).toContain(text);
    expect(depth).toContain('not a whole-image guarantee');
  });

  it('separates PhoXi L fields without family ranking or uniform-range inference', () => {
    for (const text of ['PhoXi 3D Scanner L', '0.200 mm (1 σ)', '0.190 mm (1 σ)',
      '870 to 2150 mm', '250 to 2750 ms', 'not a family-wide ranking',
      'not establish uniform accuracy throughout']) expect(depth).toContain(text);
    expect(depth).not.toMatch(/Three families of depth sensor|accurate option and the slow one|rules out closing a control loop/);
    expect(depth).toContain('named devices');
  });

  it('preserves both D400 and D400f saturation statements and Azure citation', () => {
    const specular = depth.split('- **Specular')[1].split('\n')[0];
    for (const text of ['D400f', 'May cause image saturation', 'Saturation mitigated',
      'does not mean eliminated', 'azure-kinect-depth-docs-2026']) expect(specular).toContain(text);
  });

  it('removes the opaque guarantee without changing teaching constants or defaults', () => {
    expect(TARGET_CLASSES[0].failureMode).toContain('not a material-specific accuracy guarantee');
    expect(TARGET_CLASSES.map(target => target.specMultiple)).toEqual([1, 3, 8]);
    expect(PUBLISHED_DEPTH_SPEC_PCT).toBe(2);
    expect(NOMINAL_RANGE_M).toBe(0.5);
    expect(DEFAULT_PARAMS).toEqual({
      handEyeDeg: 0.5, depthPct: 2, poseMm: 3, workingDistanceM: 0.5, target: 'opaque',
    });
    expect(CITATIONS.find(c => c.id === 'realsense-d400-datasheet-2026')?.title)
      .toBe('RealSense Product Family D400 Series Datasheet');
    expect(article).toContain('lastReviewed: "2026-08-22"');
  });
});
