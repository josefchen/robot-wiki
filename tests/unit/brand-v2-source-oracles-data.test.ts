import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { DATA_SOURCE_ORACLES } from '../../lib/brand-v2-source-oracles-data';
import { SourceOracleContext, normalized } from '../../lib/brand-v2-source-oracle-core';
import { frameDataSchema, type RawFrameData } from '../../lib/brand-v2-release-frame-data';
import { getCitation } from '../../data/citations';

type Reading = RawFrameData & { route: string; mountId: string; sourceId: string; width: number; state?: string };
const fixture = JSON.parse(gunzipSync(readFileSync('tests/fixtures/source-data-oracles/figure-readings.json.gz')).toString('utf8')) as { readings: Reading[] };
const readings = fixture.readings;
const sample = (component: string, state?: string) => structuredClone(readings.find(row => row.sourceId === `interactive:${component}` && row.width === 1440 && row.state === state)!);
function check(frame: Reading): string[] {
  const oracle = DATA_SOURCE_ORACLES[frame.sourceId];
  const c = new SourceOracleContext(frame, oracle, frame.state ?? `default:${frame.width}`);
  for (const basis of oracle.basis.filter(basis => basis.kind === 'citation')) {
    const citation = getCitation(basis.id);
    const linked = frame.sourceBindings.some(binding => binding.citationId === basis.id || binding.href === citation?.url || binding.href === `#ref-${basis.id}`);
    const credit = oracle.citationText?.[basis.id];
    const printed = credit !== undefined && normalized(frame.text).includes(normalized(credit));
    c.compare(`source binding ${basis.id}`, citation?.url, linked ? 'linked' : printed ? credit : 'missing', Boolean(citation) && (linked || printed));
  }
  try { oracle.check(c); } catch (error) { c.failures.push(String(error)); }
  c.finish();
  return c.failures;
}

describe('independent canonical-data figure oracles', () => {
  it('has actual desktop/phone readings for all 27 owners and 74 operated states', () => {
    expect(Object.keys(DATA_SOURCE_ORACLES)).toHaveLength(27);
    expect(readings.filter(row => row.state === undefined)).toHaveLength(54);
    expect(readings.filter(row => row.state !== undefined)).toHaveLength(74);
    expect(new Set(readings.map(row => row.sourceId))).toEqual(new Set(Object.keys(DATA_SOURCE_ORACLES)));
    for (const reading of readings) {
      const raw = Object.fromEntries(Object.entries(reading).filter(([key]) => !['route', 'mountId', 'sourceId', 'width', 'state'].includes(key)));
      expect(frameDataSchema.safeParse(raw).success, reading.sourceId).toBe(true);
    }
  });

  it.each(readings)('matches actual $sourceId at $width in $state', reading => {
    expect(check(reading)).toEqual([]);
  });

  it.each(Object.keys(DATA_SOURCE_ORACLES))('rejects a changed value for %s', sourceId => {
    const frame = structuredClone(readings.find(row => row.sourceId === sourceId && row.width === 1440 && row.state === undefined)!);
    if (frame.tables[0]?.cells[0]) frame.tables[0].cells[0].text += ' unsupported replacement';
    else if (frame.readouts[0]) frame.readouts[0].text = '987654321';
    else if (frame.circles[0]) frame.circles[0].cx += 20;
    else throw new Error(`Missing mutation dimension for ${sourceId}`);
    expect(check(frame).length).toBeGreaterThan(0);
  });

  it('rejects wrong tick labels even while source tables and marks remain correct', () => {
    const frame = sample('HardwarePriceLadder');
    frame.svgTexts.find(text => text.seriesId === null && text.text === '$1,000')!.text = '$9,999';
    expect(check(frame).some(failure => failure.includes('SVG label'))).toBe(true);
  });
  it('rejects a changed surgical display meaning without accepting an unchanged source table', () => {
    const frame = sample('SurgicalAutonomyLadder');
    frame.svgTexts.find(text => text.text === 'Level 3, human chooses robot plan')!.text = 'Level 3, robot acts without supervision';
    expect(check(frame).some(failure => failure.includes('SVG label'))).toBe(true);
  });
  it('rejects a Helix display gloss that invents a downloadable movement controller', () => {
    const frame = sample('GeneralistReleaseTimeline');
    frame.text = frame.text.replace('does not establish a download or licence for Helix’s trained movement controller', 'provides a download and licence for Helix’s trained movement controller');
    expect(check(frame).some(failure => failure.includes('source label'))).toBe(true);
  });
  it('cannot substitute another valid output-style gloss on a method card', () => {
    const frame = sample('ComparisonMatrix');
    const card = frame.methodCards!.find(card => card.id === 'rt-1')!;
    card.text = card.text.replace('numbered words', 'refined move guesses');
    expect(check(frame).some(failure => failure.includes('semantic alternative rt-1'))).toBe(true);
  });

  it('keeps the translated processor comparison bound to its exact ratio', () => {
    const frame = sample('RobotsPerGpu', 'thirty-two tiles');
    frame.readouts[0].text = '4,096 robots: 31 times the older processor count';
    expect(check(frame).some(failure => failure.includes('readout 0'))).toBe(true);
  });

  it('rejects an inflated real-trial count while the cube source table is intact', () => {
    const frame = sample('CubeTrials');
    frame.text = frame.text.replace('After simulation: 2 of 10 real trials solved', 'After simulation: 3 of 10 real trials solved');
    expect(check(frame).some(failure => failure.includes('source label'))).toBe(true);
  });

  it('rejects a changed plotted percentage with an unchanged table', () => {
    const frame = sample('HumanoidPickHeight');
    frame.seriesRects.find(rect => rect.seriesId === 'floor')!.width += 10;
    expect(check(frame).some(failure => failure.includes('rectangle floor'))).toBe(true);
  });

  it('rejects a wrong rounded pick rate in the caption while the plot and source table stay correct', () => {
    const frame = sample('HumanoidPickHeight');
    expect(check(frame)).toEqual([]);
    const before = frame.text;
    frame.text = frame.text.replace(/success falls from \d+% shelf/, 'success falls from 99% shelf');
    expect(frame.text).not.toBe(before);
    expect(check(frame).some(failure => failure.includes('source label'))).toBe(true);
  });

  it('rejects an invented price range in the heading even with unchanged marks and tables', () => {
    const frame = sample('HardwarePriceLadder');
    expect(check(frame)).toEqual([]);
    const before = frame.text;
    frame.text = frame.text.replace('Arms $295–$70,000', 'Arms $0–$70,000');
    expect(frame.text).not.toBe(before);
    expect(check(frame).some(failure => failure.includes('source label'))).toBe(true);
  });

  it.each(['missing product', 'wrong price'])('rejects a full hardware-key %s while plotted prices and tables stay correct', mutation => {
    const frame = sample('HardwarePriceLadder');
    expect(check(frame)).toEqual([]);
    const before = frame.text;
    frame.text = frame.text.replace('WidowX AI ($4,545); ', mutation === 'missing product' ? '' : 'WidowX AI ($4,500); ');
    expect(frame.text).not.toBe(before);
    expect(check(frame).some(failure => failure.includes('source label'))).toBe(true);
  });

  it('rejects a wrong row price range independently of the correct headline and source table', () => {
    const frame = sample('HardwarePriceLadder');
    frame.svgTexts.find(label => label.seriesId === 'arm' && label.y === 30)!.text = 'Arms: $295–$7,000';
    expect(check(frame).some(failure => failure.includes('SVG label'))).toBe(true);
  });

  it('requires the deciding gate collision without changing the canonical contest table', () => {
    const frame = sample('DroneChampionsTimeline');
    frame.readouts[2].text = 'lost decider at 4 to 4';
    expect(check(frame).some(failure => failure.includes('readout 2'))).toBe(true);
  });

  it('keeps prediction duration distinct from execution while timing and hardware cells stay correct', () => {
    const frame = sample('WorldModelOutputTimes');
    const label = frame.svgTexts.find(label => label.seriesId === '1xwm' && label.y === 132)!;
    label.text = label.text.replace('predicts five seconds of actions', 'executes five seconds of actions');
    expect(check(frame).some(failure => failure.includes('SVG label'))).toBe(true);
  });

  it('rejects exact-score prediction as a gloss for correlation one without changing either correlation', () => {
    const frame = sample('ScannedTwinCheck', 'tuned');
    expect(check(frame)).toEqual([]);
    const before = frame.text;
    frame.text = frame.text.replace('which may still have different scales or offsets', 'which predicts real scores exactly');
    expect(frame.text).not.toBe(before);
    expect(check(frame).some(failure => failure.includes('source label'))).toBe(true);
  });

  it('checks the corridor metric projection independently of its text answers', () => {
    const frame = sample('PerceptionLatency');
    const mark = frame.svgMarks.find(mark => mark.seriesId === 'perception-latency' && mark.attrs.class === 'iso-top')!;
    mark.attrs.d = mark.attrs.d.replace(/M([\d.]+)/, (_, x) => `M${Number(x) + 10}`);
    expect(check(frame).some(failure => failure.includes('SVG path perception-latency'))).toBe(true);
  });

  it('counts actual visible tally overlays, not only their attribute or text', () => {
    for (const component of ['RobotsPerGpu', 'CubeTrials']) {
      const frame = sample(component);
      const mark = frame.svgMarks.find(mark => component === 'RobotsPerGpu' ? mark.attrs['data-lit-tile'] === '' && mark.attrs.opacity === '1' : mark.attrs['data-chart-role'] === 'highlight')!;
      mark.effectiveOpacity = 0;
      expect(check(frame), component).not.toEqual([]);
    }
  });

  it('keeps unknown hardware costs distinct from invented zero prices', () => {
    const frame = sample('HardwareGuide');
    frame.tables[0].cells.find(cell => cell.column === 'Price (USD)' && cell.text === 'not disclosed')!.text = '$0';
    expect(check(frame)).not.toEqual([]);
  });

  it('rejects a wrong source link while the displayed values stay the same', () => {
    const frame = sample('DatasetTable');
    frame.sourceBindings = [];
    expect(check(frame).some(failure => failure.includes('source link'))).toBe(true);
  });

  it('cannot trade a missing source-state witness for a matching answer', () => {
    const frame = sample('ActionConditioning');
    frame.declaredBindings = [];
    expect(check(frame).some(failure => failure.includes('data-source-frame'))).toBe(true);
  });

  it('requires actual accessible card facts and paint for the hidden duplicate matrix', () => {
    for (const mutation of ['missing', 'wrong', 'hidden', 'clipped', 'wrong-label', 'faint-selected']) {
      const frame = sample('ComparisonMatrix');
      if (mutation === 'missing') frame.methodCards!.pop();
      if (mutation === 'wrong') frame.methodCards![0].text += ' false rate';
      if (mutation === 'hidden') frame.methodCards![0].visible = false;
      if (mutation === 'clipped') { const label = frame.svgTexts.find(label => label.seriesId === 'codes')!; label.painted = false; label.paintFailures = ['text clipped away']; }
      if (mutation === 'wrong-label') frame.svgTexts.find(label => label.seriesId === 'codes')!.text = 'unrelated encoding';
      if (mutation === 'faint-selected') frame.svgMarks.find(mark => mark.attrs['data-method-dot'])!.effectiveOpacity = 0.2;
      expect(check(frame), mutation).not.toEqual([]);
    }
  });

  it('retains excluded methods as exactly faint context and validates empty filters', () => {
    const frame = sample('ComparisonMatrix', 'empty intersection');
    expect(frame.methodCards).toEqual([]);
    expect(check(frame)).toEqual([]);
    frame.svgMarks.find(mark => mark.attrs['data-method-dot'])!.effectiveOpacity = 1;
    expect(check(frame)).not.toEqual([]);
  });

  it('checks provenance key shapes as well as its labels and source membership', () => {
    const frame = sample('GeneralistReleaseTimeline', 'source glyphs');
    const key = frame.legend.find(key => key.text === 'lab blog, vendor-reported')!;
    key.swatch!.points = '0,0 1,0 1,1 0,1';
    expect(check(frame).some(failure => failure.includes('legend encoding key'))).toBe(true);
  });
});
