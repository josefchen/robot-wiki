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
  OMNIBUS_ID,
  SERVICE_ROBOT_ID,
  STANDALONE_AI_ID,
  SAFETY_RULES,
  SAFETY_RULE_SOURCES,
  fractionalYear,
  ruleOf,
} from '@/lib/safety-rules-timeline';

/**
 * SafetyRulesTimeline: robot safety rules on one time axis, from the
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
const OMNIBUS = ruleOf(OMNIBUS_ID);
const SERVICE = ruleOf(SERVICE_ROBOT_ID);
const STANDALONE = ruleOf(STANDALONE_AI_ID);

const CAPTION =
  'Industrial standards renewed in 2025; the humanoid draft has no next date; EU rules for learned safety parts start in 2027.';
const DESCRIPTION = `Eight robot safety rules by date: ISO 10218 parts 1 and 2 were published on ${ISO.dateText}; the US adoption, ANSI/A3 R15.06-2025, was published with all three parts on ${US.dateText}; the humanoid committee draft ISO/CD 25785-1 closed its comment period on ${DRAFT.dateText}, with no date yet for its next stage; the EU's Digital Omnibus on AI entered into force on ${OMNIBUS.dateText}; the second edition of ISO 13482, for service robots, passed its final-draft ballot on ${SERVICE.dateText}; the EU Machinery Regulation, which lists machine-learning safety components, applies from ${MACHINERY.dateText}; the AI Act's rules for stand-alone high-risk AI apply from ${STANDALONE.dateText}; and its rules for high-risk AI in regulated products apply from ${AI_ACT.dateText}, the date by which the machinery delegated acts must apply.`;

export function SafetyRulesTimeline({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const citationFor = useCitationLookup();

  return (
    <InstrumentFigure
      figureId="safety-rules-timeline"
      className={className}
      kicker="Robot safety rules by date"
      heading="Learned safety parts come under EU law in January 2027"
      stage={
        <FigureStage footer={<StageStatus>ISO is the international standards organization. ANSI: American National Standards Institute. A3: Association for Advancing Automation. CD: committee draft.</StageStatus>}>
          <dl data-testid="safety-main-comparison" className="grid gap-4 pb-3 font-sans leading-snug text-text">
            <div data-testid="safety-summary-industrial" className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-x-4">
              <dt className="font-mono text-2xl font-medium">2025</dt>
              <dd className="text-lg">Industrial robot safety standards renewed</dd>
            </div>
            <div data-testid="safety-summary-humanoid" className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-x-4">
              <dt className="text-2xl font-medium">No next date</dt>
              <dd className="text-lg">Humanoid safety standard remains a draft</dd>
            </div>
            <div data-testid="safety-summary-learning" className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-x-4">
              <dt className="font-mono text-2xl font-medium">January 2027</dt>
              <dd className="text-lg">
                EU law covers safety components that learn from data
                <p className="mt-2 text-sm">These are software or hardware designed to protect people, with behavior that can evolve.</p>
              </dd>
            </div>
          </dl>
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
            Separate 2028 AI Act rule: AI in products that need independent safety checks.
          </p>
        </FigureStage>
      }
      caption={CAPTION}
      method={
        <>
          <div>
            Each date comes from the rule&apos;s own record: ISO&apos;s catalog, the A3 store, the Official
            Journal and the Commission&apos;s AI Act page. For the AI Act&apos;s product route, the AI must be a
            safety component or a product under Annex I, and the product must require a third-party assessment
            concerning health or safety.
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
