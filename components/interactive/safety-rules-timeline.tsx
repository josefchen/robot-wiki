'use client';

import { useId } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PlotStage } from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import {
  CHART_STROKE,
  CHART_STRUCTURE,
  CHART_TYPE,
  CHART_VIEW_WIDTH,
  DirectLabel,
  PointMarker,
  linearScale,
  roleColour,
} from '@/components/motion/chart';
import {
  AI_ACT_ID,
  HUMANOID_DRAFT_ID,
  MACHINERY_RULE_ID,
  SAFETY_RULES,
  SAFETY_RULE_SOURCES,
  fractionalYear,
  ruleOf,
} from '@/lib/safety-rules-timeline';

/**
 * SafetyRulesTimeline: five robot safety rules on one time axis, from the
 * 2025 industrial standards to the EU laws that apply in 2027 and 2028.
 * Each row names a rule and places one dot at its date. The EU Machinery
 * Regulation, which covers machine-learning safety parts, takes the
 * accent; the humanoid draft's dot trails a dashed line because
 * its next stage has no date. Only the two EU dates are printed on the
 * stage; the table dates every row. The chart is static: no controls, no
 * state, no motion.
 */

const WIDTH = CHART_VIEW_WIDTH;
const PLOT = { left: 10, right: 330 } as const;
const YEARS = [2025, 2026, 2027, 2028, 2029] as const;
const TOP = 4;
const ROW_PITCH = 40;
const NAME_BASELINE = 14;
const TRACK = 28;
const AXIS_Y = TOP + SAFETY_RULES.length * ROW_PITCH + 2;
const HEIGHT = AXIS_Y + 24;
const sx = linearScale([YEARS[0], YEARS[YEARS.length - 1]], [PLOT.left, PLOT.right]);
const f = (v: number) => Number(v.toFixed(2));
const xOf = (isoDate: string) => f(sx(fractionalYear(isoDate)));

/** The EU dates printed beside their dots, and the side each sits on. */
const DATE_READOUTS: Record<string, 'start' | 'end'> = {
  [MACHINERY_RULE_ID]: 'start',
  [AI_ACT_ID]: 'end',
};

const ISO = ruleOf('iso-10218');
const US = ruleOf('r15-06');
const DRAFT = ruleOf(HUMANOID_DRAFT_ID);
const MACHINERY = ruleOf(MACHINERY_RULE_ID);
const AI_ACT = ruleOf(AI_ACT_ID);

const CAPTION =
  'Standards are dated by publication, the humanoid draft by the close of comments, and the two EU laws by the day they apply.';
const DESCRIPTION = `Five robot safety rules by date: ISO 10218 parts 1 and 2 were published on ${ISO.dateText}; the US adoption, ANSI/A3 R15.06-2025, was published with all three parts on ${US.dateText}; the humanoid committee draft ISO/CD 25785-1 closed its comment period on ${DRAFT.dateText}, with no date yet for its next stage; the EU Machinery Regulation, which lists machine-learning safety components, applies from ${MACHINERY.dateText}; and the AI Act's rules for high-risk AI in regulated products apply from ${AI_ACT.dateText}.`;

export function SafetyRulesTimeline({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const citationFor = useCitationLookup();

  return (
    <InstrumentFigure
      figureId="safety-rules-timeline"
      className={className}
      kicker="Robot safety rules by date"
      heading="Industrial standards landed in 2025; EU law applies from 2027"
      stage={
        <FigureStage>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label="Timeline of robot safety standards and EU rules, 2025 to 2028"
            aria-describedby={descriptionId}
            data-testid="safety-rules-timeline-stage"
          >
            <g stroke={CHART_STRUCTURE.grid} strokeWidth={CHART_STROKE.structure}>
              {YEARS.map((year) => (
                <line key={year} x1={f(sx(year))} x2={f(sx(year))} y1={TOP} y2={AXIS_Y} />
              ))}
            </g>
            <g data-chart-axes="" stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure}>
              <line x1={PLOT.left} x2={PLOT.right} y1={AXIS_Y} y2={AXIS_Y} />
            </g>
            {SAFETY_RULES.map((rule, i) => {
              const top = TOP + i * ROW_PITCH;
              const track = top + TRACK;
              const x = xOf(rule.date);
              const lead = rule.id === MACHINERY_RULE_ID;
              const readout = DATE_READOUTS[rule.id];
              return (
                <g key={rule.id} data-testid={`safety-rule-${rule.id}`} data-series={rule.id} data-date={rule.date}>
                  <DirectLabel x={PLOT.left} y={top + NAME_BASELINE} seriesFor={rule.id}>
                    <tspan fontWeight={lead ? 700 : 600}>{rule.label}</tspan>
                  </DirectLabel>
                  {rule.id === HUMANOID_DRAFT_ID ? (
                    <g data-testid="safety-rule-undated-next-stage">
                      <line
                        data-chart-role="reference"
                        x1={f(x + 7)}
                        x2={f(x + 52)}
                        y1={track}
                        y2={track}
                        stroke={roleColour('reference')}
                        strokeWidth={CHART_STROKE.reference}
                        strokeDasharray={CHART_STROKE.dash}
                      />
                      <text
                        x={f(x + 57)}
                        y={track + 4}
                        fontSize={CHART_TYPE.labelPx}
                        fill={CHART_STRUCTURE.labelSecondary}
                      >
                        next stage not dated
                      </text>
                    </g>
                  ) : null}
                  <PointMarker x={x} y={track} role={lead ? 'highlight' : 'measurement'} />
                  {readout ? (
                    <text
                      data-scene-readout=""
                      x={f(readout === 'start' ? x + 8 : x - 8)}
                      y={track + 4}
                      textAnchor={readout}
                      fontSize={CHART_TYPE.readoutPx}
                      fontWeight={lead ? 700 : 400}
                      fill={CHART_STRUCTURE.label}
                    >
                      {rule.dateText}
                    </text>
                  ) : null}
                </g>
              );
            })}
            {YEARS.map((year, i) => (
              <text
                key={year}
                data-scene-tick=""
                x={f(sx(year))}
                y={AXIS_Y + 16}
                textAnchor={i === 0 ? 'start' : i === YEARS.length - 1 ? 'end' : 'middle'}
                fontSize={CHART_TYPE.tickPx}
                fill={CHART_STRUCTURE.labelSecondary}
              >
                {year}
              </text>
            ))}
          </PlotStage>
        </FigureStage>
      }
      caption={CAPTION}
      method={
        <>
          <div>
            Each date is from the rule&apos;s own record: ISO&apos;s catalogue for the standards and the humanoid
            draft, the A3 store for the US adoption, the corrected Official Journal text for the Machinery
            Regulation and the European Commission&apos;s AI Act page. The Machinery Regulation lists safety
            components that use machine learning in Annex I Part A, and its recitals say a third party should
            assess them. The humanoid draft&apos;s later stages carry no dates in ISO&apos;s catalogue.
          </div>
          <ChartDescription
            id={descriptionId}
            form="table"
            summary="Every rule and its date"
            description={DESCRIPTION}
            rowHeader="rule"
            columns={[{ header: 'what happened' }, { header: 'date' }]}
            rows={SAFETY_RULES.map((rule) => ({ label: rule.row, values: [rule.event, rule.dateText] }))}
          />
        </>
      }
      source={
        <span data-testid="safety-rules-timeline-source">
          {SAFETY_RULE_SOURCES.map((id, i) => {
            const record = citationFor(id);
            return (
              <span key={id}>
                {i > 0 ? ', ' : null}
                {record ? (
                  <a data-brand-control-id="control:link-focus" href={record.url} target="_blank" rel="noopener" className="underline-offset-2">
                    {record.label}
                  </a>
                ) : (
                  id
                )}
              </span>
            );
          })}
          .
        </span>
      }
    />
  );
}
