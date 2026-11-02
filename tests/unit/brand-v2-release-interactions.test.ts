import { describe, expect, it } from 'vitest';
import { releaseFrameArtifactSchema, validateReleaseFrameData, type ReleaseFrameArtifact } from '../../lib/brand-v2-release-frame-data';
import { releaseInteractionDetailsSchema, persistentInputLabelProblems, segmentedControlProblems, targetSizeProblems, currentStateDescriptionProblems, type ReleaseInteractionDetails } from '../../lib/brand-v2-release-interaction-details';
import { expectedCountText, expectedSearchParams, marketMapStatePlan } from '../../lib/brand-v2-market-map-states';
import { releaseMapKeyboardCaseIds, validateReleaseMapKeyboard, mapKeyboardRecordFailures, type ReleaseMapKeyboardArtifact } from '../../lib/brand-v2-release-map-keyboard';
const source = 'a'.repeat(64),
  exported = 'b'.repeat(64);
const mounts = [{
  id: 'mount:example',
  sourceId: 'interactive:Example',
  route: '/example/'
}];
function frames(): ReleaseFrameArtifact {
  return {
    version: 1,
    sourceFingerprint: source,
    exportFingerprint: exported,
    mountIds: mounts.map(m => m.id),
    frames: ['1440x900', '375x812'].map(viewport => ({
      mountId: mounts[0].id,
      sourceId: mounts[0].sourceId,
      route: mounts[0].route,
      routeText: 'Example',
      viewport: viewport as '1440x900' | '375x812',
      labels: [],
      legend: [],
      series: {},
      accentMarks: [],
      retiredMarks: [],
      canvasCount: 0,
      circles: [],
      seriesRects: [],
      text: 'Observed model',
      sourceBindings: [],
      controls: [],
      readouts: [],
      svgMarks: [],
      svgTexts: [],
      declaredBindings: [],
      tables: []
    }))
  };
}
describe('strict retained figure frames', () => {
  it('accepts exactly two genuinely bound width readings per independent mount', () => expect(validateReleaseFrameData(frames(), {
    source,
    exported,
    mounts
  }).frames).toHaveLength(2));
  it.each(['missing', 'duplicate', 'extra', 'wrong-source', 'wrong-route', 'stale-source', 'stale-export'] as const)('refuses %s frames', kind => {
    const data = frames();
    if (kind === 'missing') data.frames.pop();
    if (kind === 'duplicate') data.frames[1] = {
      ...data.frames[0]
    };
    if (kind === 'extra') data.frames.push({
      ...data.frames[0],
      mountId: 'unplanned'
    });
    if (kind === 'wrong-source') data.frames[0].sourceId = 'interactive:Other';
    if (kind === 'wrong-route') data.frames[0].route = '/other/';
    if (kind === 'stale-source') data.sourceFingerprint = 'c'.repeat(64);
    if (kind === 'stale-export') data.exportFingerprint = 'c'.repeat(64);
    expect(() => validateReleaseFrameData(data, {
      source,
      exported,
      mounts
    })).toThrow();
  });
  it('refuses pass bits and a vacuous independent population', () => {
    expect(() => releaseFrameArtifactSchema.parse({
      ...frames(),
      passed: true
    })).toThrow();
    expect(() => validateReleaseFrameData(frames(), {
      source,
      exported,
      mounts: []
    })).toThrow(/empty/);
  });
});
function detail(): ReleaseInteractionDetails {
  return {
    forcedColors: false,
    systemText: '#000000',
    systemCanvas: '#ffffff',
    tables: [],
    inputs: [{
      id: 'input:angle',
      kind: 'range',
      name: 'Elbow',
      labels: ['Elbow'],
      value: '20',
      disabled: false
    }],
    segmented: [{
      id: 'tabs',
      name: 'Method',
      borders: [0, 0, 0, 0],
      nestedFrames: 0,
      controls: [{
        id: 'button:a',
        text: 'A',
        semantic: 'aria-pressed',
        selected: true,
        disabled: false,
        paint: {
          foreground: 'rgb(28, 28, 26)',
          background: 'rgba(0, 0, 0, 0)',
          weight: 600,
          underline: true,
          borders: [0, 0, 0, 0],
          radius: 0
        }
      }]
    }],
    targets: {
      count: 1,
      large: {
        count: 1,
        minWidth: 40,
        minHeight: 24
      },
      small: []
    },
    instruments: [{
      id: 'frame',
      component: 'Example',
      name: 'Example',
      controls: 1,
      descriptions: [{
        text: '20 degrees',
        binding: 'figure-readout',
        role: 'status',
        live: 'polite'
      }]
    }]
  };
}
const registry = [{
  id: 'control:link-focus',
  targetSize: {
    minimumPx: 24,
    exceptions: [{
      kind: 'inline',
      criterion: 'WCAG 2.2 SC 2.5.8 inline exception',
      reason: 'Citation in a sentence.'
    }, {
      kind: 'spacing',
      criterion: 'WCAG 2.2 SC 2.5.8 spacing exception',
      reason: 'Separate reference rows.'
    }]
  },
  pointerAlternative: 'native pointer activation'
}];
describe('measured control details', () => {
  it('requires persistent visible labels even with an aria-label or placeholder', () => {
    const d = detail();
    d.inputs[0].labels = [];
    expect(persistentInputLabelProblems(d)).toHaveLength(1);
  });
  it.each(['filled', 'rounded', 'semantic', 'cue', 'nested'] as const)('rejects %s segmented control drift', kind => {
    const d = detail();
    const c = d.segmented[0].controls[0];
    if (kind === 'filled') c.paint.background = 'rgb(59,110,168)';
    if (kind === 'rounded') c.paint.radius = 8;
    if (kind === 'semantic') c.semantic = null;
    if (kind === 'cue') c.paint.underline = false;
    if (kind === 'nested') d.segmented[0].nestedFrames = 1;
    expect(segmentedControlProblems(d).length).toBeGreaterThan(0);
  });
  it('uses actually resolved system colours under forced colours, retaining the cue requirement', () => {
    const d = detail();
    d.forcedColors = true;
    d.segmented[0].controls[0].paint.foreground = 'rgb(0, 0, 0)';
    d.segmented[0].controls[0].paint.background = 'rgb(255, 255, 255)';
    expect(segmentedControlProblems(d)).toEqual([]);
    d.segmented[0].controls[0].paint.underline = false;
    expect(segmentedControlProblems(d)).not.toEqual([]);
  });
  it('requires the measured target population and both 24px minima', () => {
    const d = detail();
    expect(targetSizeProblems(d, registry)).toEqual([]);
    d.targets.large.minHeight = 23.9;
    expect(targetSizeProblems(d, registry)).not.toEqual([]);
    d.targets.large.minHeight = 24;
    d.targets.count = 2;
    expect(targetSizeProblems(d, registry)).not.toEqual([]);
  });
  it('accepts only measured, registered inline/spacing exceptions with a native pointer action', () => {
    const d = detail();
    d.targets = {
      count: 1,
      large: {
        count: 0,
        minWidth: null,
        minHeight: null
      },
      small: [{
        id: 'cite',
        registeredId: 'control:link-focus',
        tag: 'a',
        role: null,
        width: 14,
        height: 20,
        inlineText: 'The source supports this.',
        parentWidth: 600,
        nearestTargetClearance: 3,
        nearestSmallCentre: 12,
        nativePointer: true
      }]
    };
    expect(targetSizeProblems(d, registry)).toEqual([]);
    d.targets.small[0].inlineText = '';
    expect(targetSizeProblems(d, registry)).not.toEqual([]);
    d.targets.small[0].nearestTargetClearance = 12;
    d.targets.small[0].nearestSmallCentre = 24;
    expect(targetSizeProblems(d, registry)).toEqual([]);
    d.targets.small[0].nativePointer = false;
    expect(targetSizeProblems(d, registry)).not.toEqual([]);
  });
  it('does not accept a stateful frame with only a title', () => {
    const d = detail();
    d.instruments[0].descriptions = [];
    expect(currentStateDescriptionProblems(d)).toHaveLength(1);
  });
  it('rejects unmeasured/pass-bit fields', () => expect(() => releaseInteractionDetailsSchema.parse({
    ...detail(),
    passed: true
  })).toThrow());
});
const plan = marketMapStatePlan();
function keyboard(): ReleaseMapKeyboardArtifact {
  const target = plan.cases.find(c => c.id === 'view:bubble')!;
  const params = expectedSearchParams(target.filters ?? {}, target.view ?? 'grid');
  return {
    version: 1,
    sourceFingerprint: source,
    exportFingerprint: exported,
    caseIds: [target.id],
    records: [{
      caseId: target.id,
      region: {
        role: 'status',
        ariaLive: 'polite',
        ariaAtomic: null,
        sameNodeThroughout: true
      },
      startFocus: 'button:Bubble',
      steps: [{
        step: 'view:bubble',
        keys: ['Enter'],
        focusAfter: 'button:Bubble',
        expectedText: expectedCountText({}),
        text: expectedCountText({}),
        mutations: 0,
        latencyMs: null,
        inKeyTask: null,
        params,
        state: {
          view: 'bubble'
        }
      }],
      announcements: []
    }]
  };
}
describe('complete map keyboard state proofs', () => {
  it('includes actual empty-state witnesses as well as option/filter cases', () => {
    const ids = releaseMapKeyboardCaseIds(plan);
    const states = plan.cases.filter(c => c.group === 'states' && c.kind !== 'exception');
    expect(states.length).toBeGreaterThan(0);
    expect(states.every(c => ids.includes(c.id))).toBe(true);
  });
  it('accepts implicit atomic status semantics without inventing an attribute', () => {
    const data = keyboard();
    expect(mapKeyboardRecordFailures(data.records[0], plan)).toEqual([]);
    expect(data.records[0].region.ariaAtomic).toBeNull();
  });
  it.each(['atomic-false', 'live-off', 'missing-keys', 'lost-focus', 'wrong-count', 'wrong-url', 'late', 'out-of-task'] as const)('rejects %s map proof', kind => {
    const data = keyboard(),
      row = data.records[0],
      step = row.steps[0];
    if (kind === 'atomic-false') row.region.ariaAtomic = 'false';
    if (kind === 'live-off') row.region.ariaLive = 'off';
    if (kind === 'missing-keys') step.keys = [];
    if (kind === 'lost-focus') step.focusAfter = '';
    if (kind === 'wrong-count') step.text = '100 of 111 companies';
    if (kind === 'wrong-url') step.params = {
      view: 'timeline'
    };
    if (kind === 'late') step.latencyMs = 10001;
    if (kind === 'out-of-task') {
      step.mutations = 1;
      step.inKeyTask = false;
    }
    expect(mapKeyboardRecordFailures(row, plan).length).toBeGreaterThan(0);
  });
  it('rejects missing, duplicate and stale stamped case records', () => {
    const data = keyboard(),
      caseIds = data.caseIds;
    expect(validateReleaseMapKeyboard(data, {
      source,
      exported,
      caseIds
    }).records).toHaveLength(1);
    data.records.push(data.records[0]);
    expect(() => validateReleaseMapKeyboard(data, {
      source,
      exported,
      caseIds
    })).toThrow();
    data.records.pop();
    data.exportFingerprint = 'c'.repeat(64);
    expect(() => validateReleaseMapKeyboard(data, {
      source,
      exported,
      caseIds
    })).toThrow(/stale/);
  });
});
