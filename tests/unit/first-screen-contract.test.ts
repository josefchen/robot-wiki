import { describe, expect, it } from 'vitest';
import { derivedExclusions, findCue, populationFailures, type FirstScreenMeasurement, type FirstScreenMount } from '../helpers/first-screen-contract';

const route = '/example/';
const mount: FirstScreenMount = { id: 'mount:/example/:Lab:1', identity: 'Lab', route, source: 'fixture', operable: true };
const measurement: FirstScreenMeasurement = {
  route,
  mounts: [{ id: mount.id, identity: mount.identity, selector: '[data-figure-frame="lab"]', operable: true, visibleControl: true }],
  unboundControls: [],
  first: { mountId: mount.id, regionSelector: '[data-figure-frame="lab"]', precedingWords: 20, precedingH2: 0, precedingH2Texts: [], topEdge: 300, adjacentParagraphs: [], controlLabels: ['Run the lab'] },
};

describe('first-screen population contract', () => {
  it('requires exact non-empty route and mount identity equality', () => {
    expect(populationFailures([route], [mount], [measurement])).toEqual([]);
    expect(populationFailures([], [], [])).not.toEqual([]);
    expect(populationFailures([route], [], [measurement])).not.toEqual([]);
    expect(populationFailures([route], [mount], [])).not.toEqual([]);
    expect(populationFailures([route], [mount], [{ ...measurement, mounts: [], first: null }])).not.toEqual([]);
    expect(populationFailures([route, '/missing/'], [mount], [measurement])).not.toEqual([]);
    expect(populationFailures([route], [mount, { ...mount, id: 'foreign', route: '/foreign/' }], [measurement])).not.toEqual([]);
  });

  it('rejects duplicate identities, missing controls and controls outside registered mounts', () => {
    expect(populationFailures([route], [mount, mount], [measurement])).not.toEqual([]);
    expect(populationFailures([route], [mount], [{ ...measurement, mounts: [...measurement.mounts, ...measurement.mounts] }])).not.toEqual([]);
    expect(populationFailures([route], [mount], [{ ...measurement, mounts: [{ ...measurement.mounts[0], operable: false }] }])).not.toEqual([]);
    expect(populationFailures([route], [mount], [{ ...measurement, unboundControls: ['Unregistered slider'] }])).not.toEqual([]);
  });

  it('derives exclusions from current production controls instead of a historical route list', () => {
    const routes = [route, '/new-static-article/', '/new-control-article/'];
    const current = [mount, { ...mount, id: 'static', route: routes[1], operable: false }, { ...mount, id: 'new-control', route: routes[2] }];
    expect(derivedExclusions(routes, current)).toEqual([{ route: routes[1], reason: expect.stringContaining('no operable') }]);
  });

  it('keeps both the instruction pattern and a rendered control name necessary', () => {
    expect(findCue(['Try Run the model.'], ['Run the model'])?.control).toBe('Run the model');
    expect(findCue(['Run the model displays a result.'], ['Run the model'])).toBeNull();
    expect(findCue(['Try the next module.'], ['Run the model'])).toBeNull();
  });
});
