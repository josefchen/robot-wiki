'use client';

import { useId } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PlotStage } from '@/components/ui/instrument';
import { FigureStage, StageStatus } from '@/components/motion/figure-frame';
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
  'Industrial standards renewed in 2025; the humanoid draft has no next date; EU law covers safety components learning from data in January 2027.';
const DESCRIPTION = `Five robot safety rules by date: ISO 10218 parts 1 and 2 were published on ${ISO.dateText}; the US adoption, ANSI/A3 R15.06-2025, was published with all three parts on ${US.dateText}; the humanoid committee draft ISO/CD 25785-1 closed its comment period on ${DRAFT.dateText}, with no date yet for its next stage; the EU Machinery Regulation, which lists machine-learning safety components, applies from ${MACHINERY.dateText}; and the AI Act's rules for high-risk AI in regulated products apply from ${AI_ACT.dateText}.`;

export function SafetyRulesTimeline({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const citationFor = useCitationLookup();

  return (
    <InstrumentFigure
      figureId="safety-rules-timeline"
      className={className}
      kicker="Robot safety rules by date"
      heading="2025 standards; undated humanoid draft; learned-safety law in January 2027"
      stage={
        <FigureStage footer={<StageStatus>ISO is the international standards organization. ANSI: American National Standards Institute. A3: Association for Advancing Automation. CD: committee draft.</StageStatus>}>
          <p data-testid="safety-main-comparison" className="grid gap-2 pb-3 font-sans text-lg font-medium leading-snug text-text">
            <span data-testid="safety-summary-industrial">Industrial robot safety standards were renewed in <strong className="font-medium">2025</strong></span>
            <span data-testid="safety-summary-humanoid">The humanoid standard is still a draft, with <strong className="font-medium">no next date</strong>.</span>
            <span data-testid="safety-summary-learning">EU law reaches safety components that learn from data in <strong className="font-medium">January 2027</strong>.
              <span className="mt-2 block text-sm font-normal">These are software or hardware designed to protect people, with behavior that can evolve.</span>
            </span>
          </p>
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
                    <tspan fontWeight={lead ? 700 : 600}>{lead ? 'EU law: safety systems that learn from data' : rule.id === AI_ACT_ID ? 'EU AI Act: AI subject to product safety checks' : rule.label}</tspan>
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
          <p className="font-sans text-sm leading-snug text-text-dim">
            Separate 2028 AI Act rule: AI safety components or AI products requiring independent health or safety assessment under product laws.{' '}
            Regulated products include machinery, medical devices and other product categories covered by EU safety laws.
          </p>
        </FigureStage>
      }
      caption={CAPTION}
      method={
        <>
          <div>
            Each date is from the rule&apos;s own record: ISO&apos;s catalogue for the standards and the humanoid
            draft, the A3 store for the US adoption, the corrected Official Journal text for the Machinery
            Regulation and the European Commission&apos;s AI Act page. The Machinery Regulation lists safety
            components with fully or partly self-evolving behavior using machine learning to perform safety
            functions in Annex I Part A, and its recitals say a third party should assess them. A safety component
            can be hardware or software sold independently to perform a safety function; failure can endanger
            people. Annex I also covers such systems embedded in machinery, only in respect of those systems.
            The humanoid draft&apos;s later stages carry no dates in ISO&apos;s catalogue.
            For the AI Act&apos;s product route to high-risk status, the AI must be a safety component or itself
            a product under the laws listed in Annex I, and the product must require a third-party assessment
            concerning health or safety. AI used only for non-safety assistance, efficiency or convenience is
            excluded from that safety-component category.
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
