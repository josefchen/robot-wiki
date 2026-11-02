import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMPANIES } from '../../data/companies';
import { canonicalPlaygroundLandmarks, canonicalPlaygroundModel, playgroundModelProblems, type CanonicalPlaygroundModel } from '../../lib/brand-v2-playground-oracle';
import { CANONICAL_PLAYGROUND_TRAJECTORY } from '../../lib/playground-canonical-fixture';
import { playgroundExpectedColours, playgroundNumericalStateIds } from '../../lib/brand-v2-release-playground';
import { expectedMapCompanyFields, mapCompanyRecordProblems, mapDataLogoIds, mapDataRecordIds, mapDataViewIds, type MapDataRecord } from '../../lib/brand-v2-release-map-data';
import { ASSERTION_POPULATION_SOURCES, independentInteractionCensus, frameAccentProblems, frameLegendProblems, frameUnknownProblems, tableSemanticProblems } from '../../lib/brand-v2-release-interaction-evidence';
import { authoredArticleTables, authoredTableProblems } from '../../lib/brand-v2-release-authored-tables';
import type { PlaygroundRenderProbe } from '../../lib/playground-render-probe';
import type { RawFrameData } from '../../lib/brand-v2-release-frame-data';
import type { ReleaseInteractionDetails } from '../../lib/brand-v2-release-interaction-details';
describe('independent rendered robot oracle', () => {
  const chain: CanonicalPlaygroundModel = {
    name: 'fixture',
    root: 'base',
    links: ['base', 'shoulder', 'gripper_frame_link'],
    visuals: 1,
    joints: [{
      name: 'turn',
      type: 'revolute',
      parent: 'base',
      child: 'shoulder',
      position: [1, 0, 0],
      rpy: [0, 0, 0],
      axis: [0, 0, 1],
      lower: -2,
      upper: 2
    }, {
      name: 'tip',
      type: 'fixed',
      parent: 'shoulder',
      child: 'gripper_frame_link',
      position: [1, 0, 0],
      rpy: [0, 0, 0],
      axis: [0, 0, 1],
      lower: 0,
      upper: 0
    }]
  };
  it('composes URDF translation, joint rotation and scene basis from first principles', () => {
    const actual = canonicalPlaygroundLandmarks(chain, {
      turn: Math.PI / 2
    });
    expect(actual.links.gripper_frame_link[0]).toBeCloseTo(1, 12);
    expect(actual.links.gripper_frame_link[1]).toBeCloseTo(0, 12);
    expect(actual.links.gripper_frame_link[2]).toBeCloseTo(-1, 12);
  });
  const actual = (): PlaygroundRenderProbe => ({
    kind: 'so101',
    name: 'fixture',
    contextActive: true,
    clearColour: '#fafaf8',
    toneMapping: 0,
    points: 0,
    sprites: 0,
    fog: false,
    joints: [{
      name: 'turn',
      angle: Math.PI / 2,
      lower: -2,
      upper: 2,
      position: [1, 0, 0]
    }],
    links: [{
      name: 'base',
      position: [0, 0, 0]
    }, {
      name: 'shoulder',
      position: [1, 0, 0]
    }, {
      name: 'gripper_frame_link',
      position: [1, 0, -1]
    }],
    meshes: [{
      name: 'part',
      vertices: 36,
      colours: ['#a3a39e'],
      roughness: [.85],
      metalness: [0]
    }]
  });
  it('accepts a known analytic landmark and correctly rounded text', () => expect(playgroundModelProblems(chain, actual(), {
    turn: Math.PI / 2
  }, [1, 1, 0])).toEqual([]));
  it.each(['fallback', 'context', 'landmark', 'joint', 'limits', 'mesh', 'hand'] as const)('rejects actual %s corruption', kind => {
    const model = actual();
    let hand: [number, number, number] = [1, 1, 0];
    if (kind === 'fallback') model.kind = 'fallback';
    if (kind === 'context') model.contextActive = false;
    if (kind === 'landmark') model.links[2].position[0] += .02;
    if (kind === 'joint') model.joints[0].angle = 0;
    if (kind === 'limits') model.joints[0].upper = 3;
    if (kind === 'mesh') model.meshes[0].vertices = 0;
    if (kind === 'hand') hand = [0, 0, 0];
    expect(playgroundModelProblems(chain, model, {
      turn: Math.PI / 2
    }, hand)).not.toEqual([]);
  });
  it('derives the live canonical six-joint model and preserves the sealed fixture', () => {
    const model = canonicalPlaygroundModel(process.cwd());
    expect(model.name).toBe('so101_new_calib');
    expect(model.joints.filter(j => j.type === 'revolute')).toHaveLength(6);
    expect(model.visuals).toBeGreaterThan(10);
    expect(CANONICAL_PLAYGROUND_TRAJECTORY.keyframes[1].angles).toEqual({
      shoulder_pan: .2,
      shoulder_lift: .1,
      elbow_flex: -.1,
      wrist_flex: .1,
      wrist_roll: .1,
      gripper: .05
    });
    expect(playgroundNumericalStateIds()).toContain('desktop:trajectory-middle');
    expect(playgroundNumericalStateIds()).toContain('unavailable:fallback');
  });
  it('derives material colours from CSS rather than from measured mesh output', () => {
    expect(playgroundExpectedColours(process.cwd())).toMatchObject({
      paper: '#fafaf8',
      accent: '#3b6ea8'
    });
  });
});
function frame(): RawFrameData {
  return {
    labels: [{
      seriesIds: ['value'],
      via: 'label-for',
      visibleText: 'Measured value',
      inPlot: true,
      hidden: []
    }],
    legend: [{
      text: 'Measured value',
      seriesId: 'value',
      swatch: {
        tag: 'line',
        fill: null,
        stroke: 'rgb(28, 28, 26)',
        dash: null,
        strokeWidth: '1'
      }
    }],
    series: {
      value: {
        paints: ['rgb(28, 28, 26)'],
        geometries: ['line'],
        labelled: true,
        marks: 1
      }
    },
    accentMarks: [],
    retiredMarks: [],
    canvasCount: 0,
    circles: [],
    seriesRects: [],
    text: 'Original schematic',
    sourceBindings: [],
    controls: [],
    readouts: [],
    svgMarks: [],
    svgTexts: [],
    declaredBindings: [],
    tables: []
  };
}
describe('falsifiable figure/table clauses', () => {
  it('has exactly the 38 remaining assertion readers', () => {
    expect(Object.keys(ASSERTION_POPULATION_SOURCES)).toHaveLength(38);
    expect(new Set(Object.values(ASSERTION_POPULATION_SOURCES)).size).toBe(38);
  });
  it('finds every physical source and authored mount independently of the registry', () => {
    const actual = independentInteractionCensus(process.cwd()),
      registry = JSON.parse(readFileSync('contract/brand-v2-registries.json', 'utf8'));
    expect(actual.sources.map(s => s.id).sort()).toEqual(registry.interactive.sources.map((s: {
      id: string;
    }) => s.id).sort());
    expect(actual.mounts.map(m => m.id).sort()).toEqual(registry.interactive.mounts.map((m: {
      id: string;
    }) => m.id).sort());
  });
  it('rejects retired/off-role/extra-highlight geometry', () => {
    const f = frame();
    f.retiredMarks.push({
      paint: '#245fff',
      at: 'path'
    });
    f.accentMarks.push({
      seriesId: 'a',
      onRole: false,
      at: 'path:a'
    }, {
      seriesId: 'b',
      onRole: true,
      at: 'path:b'
    });
    expect(frameAccentProblems(f, 'interactive:ActionConditioning')).toHaveLength(3);
  });
  it.each(['unnamed', 'dangling', 'hidden', 'wrong-paint', 'wrong-dash'] as const)('rejects %s legend correspondence', kind => {
    const f = frame();
    if (kind === 'unnamed') f.legend[0].text = 'blue line';
    if (kind === 'dangling') f.legend[0].seriesId = 'absent';
    if (kind === 'hidden') f.labels = [];
    if (kind === 'wrong-paint') f.legend[0].swatch!.stroke = 'rgb(59, 110, 168)';
    if (kind === 'wrong-dash') f.legend[0].swatch!.dash = '2 3';
    expect(frameLegendProblems(f)).not.toEqual([]);
  });
  it('refuses unregistered inapplicability and ambiguous blank values', () => {
    const f = frame();
    f.tables = [{
      headers: ['result'],
      thCount: 1,
      scopedThCount: 1,
      sortable: false,
      ariaSortCount: 0,
      naCells: [{
        column: 'result'
      }],
      notDisclosedColumns: [],
      notDisclosedCount: 0,
      blankCellCount: 1,
      approxCellCount: 1,
      numericColumns: [],
      cells: []
    }];
    expect(frameUnknownProblems(f, 'interactive:ActionConditioning')).toHaveLength(3);
  });
  it('measures numeric alignment and named keyboard scrollability', () => {
    const table: ReleaseInteractionDetails['tables'][number] = {
      id: 'table:0',
      frame: '',
      name: 'Values',
      headers: ['Item', 'Value'],
      unassociated: [],
      sortButtons: 0,
      ariaSort: 0,
      cells: [{
        rowIndex: 0,
        row: 'one',
        column: 'Value',
        text: '23',
        align: 'right'
      }],
      scroll: {
        width: 200,
        scrollWidth: 400,
        tabIndex: 0,
        name: 'Values'
      }
    };
    expect(tableSemanticProblems(table)).toEqual([]);
    table.cells[0].align = 'left';
    table.scroll!.tabIndex = -1;
    expect(tableSemanticProblems(table)).toHaveLength(2);
  });
  it('compares authored GFM cells including repeated row names and exact unknown states', () => {
    const root = mkdtempSync(join(tmpdir(), 'robot-wiki-tables-'));
    try {
      mkdirSync(join(root, 'content', 'example'), {
        recursive: true
      });
      writeFileSync(join(root, 'content/example/data.mdx'), '| Item | Value |\n| --- | --- |\n| same | 0 |\n| same | not disclosed |\n');
      const [source] = authoredArticleTables(root, '/example/data/');
      const table: ReleaseInteractionDetails['tables'][number] = {
        id: 'table:0',
        frame: '',
        name: 'Data',
        headers: ['Item', 'Value'],
        unassociated: [],
        sortButtons: 0,
        ariaSort: 0,
        scroll: null,
        cells: [{
          rowIndex: 0,
          row: 'same',
          column: 'Item',
          text: 'same',
          align: 'left'
        }, {
          rowIndex: 0,
          row: 'same',
          column: 'Value',
          text: '0',
          align: 'right'
        }, {
          rowIndex: 1,
          row: 'same',
          column: 'Item',
          text: 'same',
          align: 'left'
        }, {
          rowIndex: 1,
          row: 'same',
          column: 'Value',
          text: 'not disclosed',
          align: 'right'
        }]
      };
      expect(authoredTableProblems(source, table)).toEqual([]);
      table.cells[3].text = '0';
      expect(authoredTableProblems(source, table)).not.toEqual([]);
    } finally {
      rmSync(root, {
        recursive: true,
        force: true
      });
    }
  });
});
describe('canonical market source values and exact populations', () => {
  it('quantifies every company at both widths and every drawn mark on both surfaces', () => {
    expect(mapDataRecordIds()).toHaveLength(COMPANIES.length * 2);
    expect(mapDataViewIds()).toHaveLength(24);
    expect(mapDataLogoIds()).toHaveLength(440);
  });
  it('does not turn undisclosed round values into zero or hide caveats', () => {
    const company = COMPANIES.find(c => c.id === 'physical-intelligence')!;
    const fields = expectedMapCompanyFields(company);
    expect(fields.amount).toBe('$600M');
    expect(fields.valuation).toBe('$5.6B');
    const row: MapDataRecord = {
      id: '1440x900|' + company.id,
      companyId: company.id,
      viewport: '1440x900',
      hash: '#company-' + company.id,
      heading: company.name,
      context: '',
      description: company.description,
      fields: {
        ...fields,
        amount: '0'
      },
      sources: [],
      caveat: '',
      roundSource: '',
      detailWidth: 375,
      overflowPx: 0,
      minimumTextPx: 13
    };
    expect(mapCompanyRecordProblems(row).some(error => error.startsWith('amount:'))).toBe(true);
  });
});
