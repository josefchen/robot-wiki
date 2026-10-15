'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ControlField,
  ControlLabel,
  INSTRUMENT_SLIDER_CLASS,
  InstrumentFigure,
  InstrumentLegend,
  InstrumentReadout,
  InstrumentReset,
  LegendItem,
  PresetGroup,
  SliderEnds,
} from '@/components/ui/instrument';
import { StageNumber } from '@/components/motion/figure-frame';
import { Bar, ConstraintHatch, LegendSwatch, roleColour } from '@/components/motion/chart';
import { AnatomyStage } from '@/components/iso/anatomy-stage';
import { Dots, IsoFigure, Line, Solid } from '@/components/iso/react/draw';
import { asksForStillness } from '@/components/iso/react/live';
import { LiveSolid, writeSolid } from '@/components/iso/live-solid';
import { translateAlong } from '@/components/iso/iso-kit';
import {
  HEIGHT as DRAWING_HEIGHT,
  HOUR_FACE,
  HORIZON_MONTHS,
  P as PROJECTION,
  PARTS,
  SCALE_MONTHS,
  WIDTH as DRAWING_WIDTH,
  balanceOf,
  beamParts,
  discStack,
  loadParts,
  loadShift,
  tiltWhileMoving,
  type Part,
} from '@/components/iso/figures/payback-steelyard';
import { ChartDescription } from '@/components/ui/chart-description';
import {
  AMORTIZATION_MONTHS,
  DEFAULT_INPUTS,
  INPUT_RANGES,
  PAYBACK_TARGET_MONTHS,
  ROBOT_HOURS_PER_MONTH,
  SECONDS_PER_HOUR,
  computeEconomics,
  paysBackWithinTarget,
  type EconomicsInputs,
} from '@/lib/deployment-economics';

/**
 * DeploymentEconomics: the payback calculator for a robotic pick cell, drawn
 * as a payback steelyard (components/iso/figures/payback-steelyard.ts).
 *
 * Two controls stay in view: how often a pick fails (two presets) and the
 * time a person needs to fix each jam. The other five inputs, the raw
 * per-pick success slider and the reset sit in "Adjust more". On the stage
 * the cell's cost hangs from the steelyard's short arm as slotted weights,
 * and a poise standing for one month of the cell's labour value slides along
 * the long arm, graduated in months, to where the beam balances: the payback.
 * Slow jam fixes eat the working hour (the hour plate on the base), the month
 * of value gets lighter, and the poise has to slide further out past the
 * buyer's 24-month collar. Pure arithmetic lives in lib/deployment-economics.ts.
 *
 * Interactive contract: typed props, deterministic render, visible
 * numeric readouts, reset control, keyboard-accessible native sliders, no
 * auto-playing motion (the poise settles to each new balance and stops), no
 * layout shift.
 */

type DeploymentEconomicsProps = {
  className?: string;
};

type ControlKey = keyof EconomicsInputs;

type ControlSpec = {
  key: ControlKey;
  /** The visible label, in plain words. */
  label: string;
  /** The model's name for the input, kept in the accessible name. */
  term: string;
  /** Formats the current value for the label and aria text. */
  format: (v: number) => string;
  /** Plain words for the two slider ends. */
  ends: [string, string];
  /** Sourcing note under the slider; every default is sourced or an
   * explicitly labelled assumption (VAL-DATA-034). */
  note: string;
};

function formatSeconds(v: number): string {
  if (v < 90) return `${Math.round(v)} ${Math.round(v) === 1 ? 'second' : 'seconds'}`;
  const minutes = v / 60;
  const rounded = Number.isInteger(minutes) ? `${minutes}` : minutes.toFixed(1);
  return `${rounded} minutes`;
}

const JAM_CONTROL: ControlSpec = {
  key: 'jamClearSeconds',
  label: 'Time to fix each jam',
  term: 'jam-clearing time',
  format: formatSeconds,
  ends: ['5 seconds', '5 minutes'],
  note: 'Assumption: seconds of human attention per failed pick; this dial is the whole argument.',
};

const SUCCESS_CONTROL: ControlSpec = {
  key: 'successRatePercent',
  label: 'Picks that succeed',
  term: 'per-pick success',
  format: (v) => `${v.toFixed(1)}%`,
  ends: ['90%', '99.9%'],
  note: 'Assumption: the policy headline number; the demonstration teaching step drops this to 99.',
};

/** Every control past the two in view, in the order the model lists them. */
const FOLD_CONTROLS: ControlSpec[] = [
  {
    key: 'robotCost',
    label: 'Robot price',
    term: 'robot cost',
    format: (v) => `$${(v / 1000).toFixed(0)}k`,
    ends: ['$20k', '$250k'],
    note: 'Assumption: $80k is a chosen example, not a sourced arm-price quote. EVST gives complete-cell budgets, not fixed list prices.',
  },
  {
    key: 'integrationMultiple',
    label: 'Whole cell cost, in robot prices',
    term: 'integration multiple',
    format: (v) => `${v.toFixed(1)}x`,
    ends: ['1 robot price', '5 robot prices'],
    note: 'Assumption: 2.5x is chosen within EVST’s 2-3x complete-cell guidance, not a measured cell.',
  },
  {
    key: 'cycleTimeSeconds',
    label: 'Seconds per pick',
    term: 'cycle time',
    format: (v) => `${v.toFixed(1)} s`,
    ends: ['2 seconds', '20 seconds'],
    note: 'Assumption: a paced piece-picking cycle; drag it to match any quoted cell.',
  },
  {
    key: 'uptimePercent',
    label: 'Share of time the cell runs',
    term: 'uptime',
    format: (v) => `${v.toFixed(1)}%`,
    ends: ['80%', '100%'],
    note: 'Assumption: availability net of maintenance and faults; 95% is a working figure, not a vendor claim.',
  },
  SUCCESS_CONTROL,
  {
    key: 'wageUsdPerHour',
    label: 'Hourly wage of the picker it replaces',
    term: 'displaced wage',
    format: (v) => `$${v.toFixed(0)}/h`,
    ends: ['$10', '$80'],
    note: 'Assumption: fully loaded picker wage; set it to your own facility number.',
  },
];

function formatMoney(v: number): string {
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

type FailurePreset = 'rare' | 'common';
const PRESET_SUCCESS: Record<FailurePreset, number> = { rare: 99.9, common: 99 };

const JAM_RANGE = INPUT_RANGES.jamClearSeconds;
const JAM_SAMPLES = Array.from(
  { length: (JAM_RANGE.max - JAM_RANGE.min) / JAM_RANGE.step + 1 },
  (_, i) => JAM_RANGE.min + i * JAM_RANGE.step,
);

/** The three shares of the hour bar, in drawing order. */
const SEGMENTS = [
  { key: 'productive', title: 'Productive cycles', series: 'economics-productive' },
  { key: 'jamClearing', title: 'Jam clearing', series: 'economics-jam-clearing' },
  { key: 'downtime', title: 'Downtime', series: 'economics-downtime' },
] as const;

/** One static part of the steelyard, as the kit draws it. */
function PartView({ part }: { part: Exclude<Part, { kind: 'slot' }> }) {
  if (part.kind === 'solid') {
    return (
      <Solid
        paths={part.paths}
        tone={part.tone}
        lit={part.lit}
        crease={part.crease}
        inner={part.inner ? <g dangerouslySetInnerHTML={{ __html: part.inner }} /> : undefined}
      />
    );
  }
  if (part.kind === 'line') return <Line d={part.d} tone={part.tone} free={part.free} />;
  return <Dots points={part.points} size={part.size} tone={part.tone} />;
}

export function DeploymentEconomics({ className }: DeploymentEconomicsProps) {
  const uid = useId();
  const hatchId = `economics-jam-hatch-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const captionId = `${uid}-economics-caption`;
  const descriptionId = `${uid}-economics-description`;
  const [inputs, setInputs] = useState<EconomicsInputs>(DEFAULT_INPUTS);
  const out = computeEconomics(inputs);

  function set(key: ControlKey, value: number) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setInputs(DEFAULT_INPUTS);
  }

  const preset: FailurePreset | null =
    inputs.successRatePercent === PRESET_SUCCESS.rare
      ? 'rare'
      : inputs.successRatePercent === PRESET_SUCCESS.common
        ? 'common'
        : null;

  const verdictPass = paysBackWithinTarget(out.paybackMonths);
  const paybackText =
    out.paybackMonths === null
      ? 'never'
      : `${out.paybackMonths.toFixed(1)} months`;

  const breakdown = out.timeBreakdown;
  const breakdownTotal = breakdown.productive + breakdown.jamClearing + breakdown.downtime;
  const pct = (v: number) =>
    breakdownTotal > 0 ? `${((v / breakdownTotal) * 100).toFixed(1)}%` : '0%';
  const seconds = (key: (typeof SEGMENTS)[number]['key']) =>
    breakdownTotal > 0 ? (breakdown[key] / breakdownTotal) * SECONDS_PER_HOUR : 0;
  // The hour plate on the steelyard's base, in its own face plane: sixty
  // minutes over the plate's length.
  const scaleHour = (secondsIn: number) => (secondsIn / SECONDS_PER_HOUR) * HOUR_FACE.length;
  const segments = SEGMENTS.map((segment, index) => {
    const start = SEGMENTS.slice(0, index).reduce((sum, prior) => sum + seconds(prior.key), 0);
    const x = scaleHour(start);
    const width = scaleHour(start + seconds(segment.key)) - x;
    return { ...segment, x, width, share: pct(breakdown[segment.key]) };
  });

  // The two failure presets at the slowest fix, for the description.
  const atSlowest = (successRatePercent: number) =>
    [JAM_RANGE.max, computeEconomics({ ...inputs, successRatePercent, jamClearSeconds: JAM_RANGE.max }).paybackMonths ?? Number.POSITIVE_INFINITY] as const;
  const commonEnd = atSlowest(PRESET_SUCCESS.common);
  const commonQuick = computeEconomics({ ...inputs, successRatePercent: PRESET_SUCCESS.common, jamClearSeconds: DEFAULT_INPUTS.jamClearSeconds }).paybackMonths;
  const rareEnd = atSlowest(PRESET_SUCCESS.rare);

  // The steelyard: the cost on the short arm, the poise at the payback.
  const balance = balanceOf(out.paybackMonths);
  const discs = useMemo(() => discStack(inputs.robotCost, inputs.integrationMultiple), [inputs.robotCost, inputs.integrationMultiple]);
  const load = useMemo(() => loadParts(discs), [discs]);
  // The drawing renders the first balance once; afterwards only the live
  // code writes the beam and the load, so a re-render never jumps them.
  const [first] = useState(() => ({
    beam: beamParts(balance.tilt, balance.poise),
    shift: translateAlong(PROJECTION, loadShift(balance.tilt)),
  }));
  const restBeam = first.beam;

  // The live poise and beam: they settle (critically damped) to each new balance and stop.
  const beamRef = useRef<SVGGElement>(null);
  const loadRef = useRef<SVGGElement>(null);
  const motion = useRef({ poise: balance.poise, rate: 0, tilt: balance.tilt });
  useEffect(() => {
    const target = balanceOf(out.paybackMonths);
    const state = motion.current;
    const draw = () => {
      const tilt = tiltWhileMoving(state.poise, target.poise, target.tilt);
      state.tilt = tilt;
      const built = beamParts(tilt, state.poise);
      const group = beamRef.current;
      if (group) {
        group.querySelectorAll<SVGGElement>('[data-beam-solid]').forEach((node, index) => writeSolid(node, built.solids[index]!.paths));
        const set = (name: string, d: string) => group.querySelector(`[data-beam-line="${name}"]`)?.setAttribute('d', d);
        set('minor', built.minor);
        set('major', built.major);
        set('index', built.index);
        set('seam', built.seam);
      }
      loadRef.current?.setAttribute('transform', translateAlong(PROJECTION, loadShift(tilt)));
    };
    if (asksForStillness()) {
      state.poise = target.poise;
      state.rate = 0;
      draw();
      return;
    }
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? Math.min(now - last, 64) / 1000 : 1 / 60;
      last = now;
      // Critically damped: no overshoot past the balance point.
      const w = 1 / 0.3;
      for (let step = 0; step < 4; step++) {
        const h = dt / 4;
        state.rate += (w * w * (target.poise - state.poise) - 2 * w * state.rate) * h;
        state.poise += state.rate * h;
      }
      const settled = Math.abs(target.poise - state.poise) < 1e-3 && Math.abs(state.rate) < 1e-3;
      if (settled) {
        state.poise = target.poise;
        state.rate = 0;
      }
      draw();
      if (!settled) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [out.paybackMonths]);

  // The table and the fold line print months to the readout's one decimal,
  // so a reader who sets a sampled fix time finds the same numbers in both.
  const presetMonths = (jam: number) =>
    (['rare', 'common'] as const).map((id) => {
      const months = computeEconomics({ ...inputs, successRatePercent: PRESET_SUCCESS[id], jamClearSeconds: jam }).paybackMonths;
      return months === null ? 'never' : months.toFixed(1);
    });
  const sampleRows = JAM_SAMPLES.filter((jam) => jam === 5 || jam % 60 === 0 || jam === 15).map((jam) => ({
    label: `${jam}`,
    values: presetMonths(jam),
  }));
  const [rareNow, commonNow] = presetMonths(inputs.jamClearSeconds);
  const withUnit = (months: string) => (months === 'never' ? 'never' : `${months} months`);

  function sliderField(spec: ControlSpec, visible: boolean) {
    const id = `${uid}-${spec.key}`;
    const range = INPUT_RANGES[spec.key];
    const current = inputs[spec.key];
    return (
      <ControlField key={spec.key} className="content-start">
        <ControlLabel htmlFor={id} value={spec.format(current)}>
          {spec.label}
        </ControlLabel>
        <input
          id={id}
          type="range"
          data-brand-control-id="control:input"
          min={range.min}
          max={range.max}
          step={range.step}
          value={current}
          onChange={(e) => set(spec.key, Number(e.target.value))}
          aria-label={`${spec.label} (${spec.term}), currently ${spec.format(current)}`}
          className={INSTRUMENT_SLIDER_CLASS}
        />
        <SliderEnds low={spec.ends[0]} high={spec.ends[1]} />
        {/* In view, the note is for assistive technology only; it is
            repeated, with the others, in "How this was made". */}
        <div data-control-note="" className={visible ? 'sr-only' : 'font-sans text-sm leading-snug text-text-dim'}>
          {spec.note}
        </div>
      </ControlField>
    );
  }

  return (
    <InstrumentFigure
      figureId="deployment-economics"
      className={className}
      kicker="Cell economics calculator"
      heading="Slow jam fixes delay when a picking robot pays off"
      controls={
        <>
          <PresetGroup<FailurePreset>
            label="How often a pick fails"
            presets={[
              { id: 'rare', label: '1 in 1,000' },
              { id: 'common', label: '1 in 100' },
            ]}
            value={preset}
            onChange={(id) => set('successRatePercent', PRESET_SUCCESS[id])}
            testId="economics-failure-preset"
          />
          {sliderField(JAM_CONTROL, true)}
        </>
      }
      adjust={
        <>
          <div className="grid w-full basis-full gap-x-6 gap-y-3 sm:grid-cols-2">
            {FOLD_CONTROLS.map((spec) => sliderField(spec, false))}
          </div>
          <InstrumentReset onClick={reset} />
        </>
      }
      stage={
        <AnatomyStage
          viewWidth={DRAWING_WIDTH}
          hint="The poise rests where the beam balances: the months to pay back"
          readout={
            <>
              Pays for itself in{' '}
              <StageNumber data-testid="payback-months" style={{ color: roleColour('value') }}>
                {paybackText}
              </StageNumber>
            </>
          }
          status="Illustrative: chosen inputs, not a measured cell."
          data-testid="payback-steelyard-stage"
        >
          <IsoFigure
            width={DRAWING_WIDTH}
            height={DRAWING_HEIGHT}
            label={`A steelyard: the cell's cost, ${formatMoney(out.totalCellCost)}, hangs from the short arm as ${discs.length} slotted weights, and a poise for one month of labour value rests ${out.paybackMonths === null || out.paybackMonths > SCALE_MONTHS ? `on the end stop at ${SCALE_MONTHS} months, short of balance` : `${paybackText} out along the arm`}, against a collar at ${HORIZON_MONTHS} months.`}
            describedBy={`${captionId} ${descriptionId}`}
          >
            {PARTS.map((part, index) => {
              if (part.kind !== 'slot') return <PartView key={index} part={part} />;
              if (part.slot === 'hour') {
                return (
                  <g key="hour" transform={HOUR_FACE.matrix}>
                    <path className="iso-fill" d={HOUR_FACE.plate} />
                    <path className="iso-shade" data-shade={3} d={HOUR_FACE.plate} />
                    <Line d={HOUR_FACE.plate} tone="lo" />
                    <g
                      data-testid="time-breakdown"
                      role="img"
                      aria-label={`Time breakdown per elapsed hour: ${pct(
                        breakdown.productive,
                      )} productive cycles, ${pct(
                        breakdown.jamClearing,
                      )} jam clearing, ${pct(breakdown.downtime)} downtime`}
                    >
                      {segments.map((segment) => (
                        <g
                          key={segment.key}
                          data-series={segment.series}
                          data-breakdown-segment={segment.title}
                          data-share={segment.share}
                        >
                          {segment.key === 'jamClearing' ? (
                            <ConstraintHatch id={hatchId} x={segment.x} y={HOUR_FACE.bandY} width={segment.width} height={HOUR_FACE.bandHeight} />
                          ) : (
                            <Bar
                              x={segment.x}
                              y={HOUR_FACE.bandY}
                              width={segment.width}
                              height={HOUR_FACE.bandHeight}
                              role={segment.key === 'productive' ? 'value' : 'reference'}
                            />
                          )}
                        </g>
                      ))}
                    </g>
                    <Line d={HOUR_FACE.frame} tone="lo" />
                    <Line d={HOUR_FACE.minor} tone="lo" />
                    <Line d={HOUR_FACE.major} tone="mid" />
                    <Dots points={HOUR_FACE.screws} size={0.45} tone="mid" />
                  </g>
                );
              }
              if (part.slot === 'load') {
                return (
                  <g key="load" ref={loadRef} data-testid="cost-load" data-discs={discs.length} transform={first.shift}>
                    {load.map((piece, at) => (piece.kind === 'slot' ? null : <PartView key={at} part={piece} />))}
                  </g>
                );
              }
              return (
                <g key="beam" ref={beamRef} data-testid="steelyard-beam">
                  {restBeam.solids.map((piece, at) => (
                    <g key={at} data-beam-solid="">
                      <LiveSolid paths={piece.paths} tone={piece.tone} lit={piece.lit} />
                    </g>
                  ))}
                  <path className="iso-line" data-tone="faint" data-beam-line="seam" d={restBeam.seam} />
                  <path className="iso-line" data-tone="lo" data-beam-line="minor" d={restBeam.minor} />
                  <path className="iso-line" data-tone="mid" data-beam-line="major" d={restBeam.major} />
                  <path className="iso-line" data-tone="lit" data-beam-line="index" d={restBeam.index} />
                </g>
              );
            })}
          </IsoFigure>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pt-2">
            <InstrumentLegend>
              <LegendItem series="economics-productive" swatch={<LegendSwatch role="value" mark="bar" />}>
                <span data-testid="hour-legend-productive" style={{ color: roleColour('value') }}>robot picking</span>
              </LegendItem>
              <LegendItem series="economics-jam-clearing" swatch={<LegendSwatch role="constraint" mark="hatch" />}>
                <span data-testid="hour-legend-jams">a person fixing jams</span>
              </LegendItem>
              <LegendItem series="economics-downtime" swatch={<LegendSwatch role="reference" mark="bar" />}>
                <span data-testid="hour-legend-downtime">stopped for upkeep</span>
              </LegendItem>
            </InstrumentLegend>
            <InstrumentReadout data-testid="payback-verdict" className="text-text-dim">
              {verdictPass
                ? `Pays back inside ${PAYBACK_TARGET_MONTHS} months`
                : `Outside a ${PAYBACK_TARGET_MONTHS}-month horizon`}
            </InstrumentReadout>
          </div>
        </AnatomyStage>
      }
      caption="Every failed pick pulls a person over, and how long that takes decides when the robot earns back its price."
      captionProps={{ id: captionId }}
      method={
        <>
          <p>
            The calculator values a robotic pick cell by the picker wages its output replaces. Cell
            cost is robot price times the integration multiple ({formatMoney(out.totalCellCost)} now).
            Each failed pick is a jam a person clears, so every good pick carries the jam rate times
            the clearing time on top of its cycle. Payback divides cell cost by the monthly labour
            value of the modeled picks; the verdict compares it with a chosen{' '}
            {PAYBACK_TARGET_MONTHS}-month horizon.
          </p>
          <p>
            Current case: payback <span>{paybackText}</span>; capital cost per pick{' '}
            <span data-testid="cost-per-pick">{out.costPerPickUsd.toFixed(3)}</span> USD over{' '}
            {AMORTIZATION_MONTHS / 12} yr. Cell cost {formatMoney(out.totalCellCost)};{' '}
            {out.netPicksPerHour.toFixed(0)} modeled picks per elapsed hour and{' '}
            {out.monthlyPicks.toLocaleString('en-US', { maximumFractionDigits: 0 })} per{' '}
            {ROBOT_HOURS_PER_MONTH}-hour month; jam rate {out.jamRatePercent.toFixed(2)}%.
          </p>
          <p data-testid="payback-both-rates">
            With {formatSeconds(inputs.jamClearSeconds)} to fix each jam, it pays back in{' '}
            {withUnit(rareNow)} when 1 pick in 1,000 fails and {withUnit(commonNow)} when 1 in 100 fails.
          </p>
          <p>
            Where the elapsed hour goes:{' '}
            <span data-testid="breakdown-productive">productive {breakdown.productive.toFixed(0)} s</span>,{' '}
            <span data-testid="breakdown-jams">jam clearing {breakdown.jamClearing.toFixed(0)} s</span>,{' '}
            <span data-testid="breakdown-downtime">downtime {breakdown.downtime.toFixed(0)} s</span>{' '}
            of {SECONDS_PER_HOUR} s.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {[JAM_CONTROL, ...FOLD_CONTROLS].map((spec) => (
              <li key={spec.key}>
                {spec.label} ({spec.term}, default {spec.format(DEFAULT_INPUTS[spec.key])}): {spec.note}
              </li>
            ))}
          </ul>
          <p>
            All seven defaults and slider ranges are authored assumptions; EVST’s guide supplies
            context, not exact inputs; none is a measured deployment result. The chart&rsquo;s lines
            hold every other input at its current value and vary only the clearing time, at 99.9%
            (1 failed pick in 1,000) and 99% (1 in 100) per-pick success. The hour bar spends 3,600
            elapsed seconds on productive cycles, jam clearing and downtime.
          </p>
          <ChartDescription
            id={descriptionId}
            form="table"
            open
            summary="Months to pay back by jam-clearing time"
            rowHeader="jam-clearing seconds"
            columns={[
              { header: 'payback at 99.9% success', numeric: true },
              { header: 'payback at 99% success', numeric: true },
            ]}
            rows={sampleRows}
            description={`Months to pay back rise with jam-clearing time. At 99% per-pick success they go from ${commonQuick === null ? 'never' : commonQuick.toFixed(1)} months with ${DEFAULT_INPUTS.jamClearSeconds}-second clearing to ${commonEnd[1].toFixed(1)} months with 300-second clearing; at 99.9% they reach ${rareEnd[1].toFixed(1)} months at 300 seconds. The current case pays back in ${paybackText}.`}
          />
        </>
      }
    />
  );
}
