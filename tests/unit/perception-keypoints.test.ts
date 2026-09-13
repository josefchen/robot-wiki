import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const perception = readFileSync('content/classical/perception.mdx', 'utf8');
const hierarchy = readFileSync('content/manipulation/hierarchical.mdx', 'utf8');
const perceptionBlock = perception.slice(perception.indexOf('<Term id="promptable-segmentation">'), perception.indexOf('Dense Object Nets learns'));
const hierarchyBlock = hierarchy.slice(hierarchy.indexOf('## The keypoint turn'), hierarchy.indexOf('The bridge between this line'));

describe('source-scoped keypoint interfaces', () => {
  it('distinguishes MOKA selection, ReKep constraints and RoboPoint tuning in both articles', () => {
    for (const block of [perceptionBlock, hierarchyBlock]) {
      for (const phrase of ['GroundedSAM', 'grasp, function and target keypoints where applicable', 'waypoint regions and motion attributes', 'DINOv2 features within SAM masks', 'GPT-4o', 'sub-goal and path constraints', 'penalizes constraint violations', 'human annotations or disable tracking', 'real-image VQA and LVIS detection data', 'end-effector offset and a motion planner']) {
        expect(block.includes(phrase), phrase).toBe(true);
      }
      for (const id of ['moka-2024', 'rekep-2024', 'robopoint-2024']) {
        expect((block.match(new RegExp('<Cite id="' + id + '"', 'g')) ?? []).length).toBe(1);
      }
    }
    expect(perceptionBlock.includes('all three are emitting geometry into a frame')).toBe(false);
    expect(hierarchyBlock.includes('detection, and 6-DoF pose the marks ride on')).toBe(false);
    expect(hierarchyBlock.includes('21.8% gain')).toBe(false);
  });
  it('keeps the Where2Place point metric and protocol distinct from robot success', () => {
    for (const phrase of ['Where2Place', '100 real-world images', 'Table 2', '46.77%', '29.06%', 'means over three runs', 'not robot grasp success']) {
      expect(hierarchyBlock.includes(phrase), phrase).toBe(true);
    }
    expect(perceptionBlock.includes('does not require an external detector at test time')).toBe(true);
    expect(perceptionBlock.includes('not by itself a grasp pose or a complete control policy')).toBe(true);
  });
});
