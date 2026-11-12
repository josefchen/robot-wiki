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
} from '@/components/motion/chart';
import {
  AUTONOMY_LEVELS,
  HIGHEST_CLAIMED_LEVEL,
  HIGHEST_AUTHORIZED_LEVEL,
  LADDER_SOURCES,
  LEAD_EVIDENCE,
  entryAtLevel,
} from '@/lib/surgical-autonomy-ladder';

/**
 * SurgicalAutonomyLadder: Yang and colleagues' six levels of autonomy as
 * a ladder, level 0 at the foot, with the article's FDA-authorized platforms and
 * research demonstrations on their rungs. The two kinds of evidence are
 * the two series: FDA-authorized products are accent dots, research
 * demonstrations grey crosses, so they read apart with the colour
 * removed. The chart is static: no controls, no state, no motion.
 */

const WIDTH = CHART_VIEW_WIDTH;
const PLOT = { left: 10, right: 330 } as const;
const TOP = 4;
// Stage text keeps its CSS size while the viewBox shrinks on phones; 20
// units between the level line and the entry line keep them apart at 375 px.
const ROW_PITCH = 44;
const LEVEL_BASELINE = 14;
const ENTRY_BASELINE = 34;
const MARK_X = 16;
const ENTRY_X = 28;
const RUNGS = [...AUTONOMY_LEVELS].reverse();
const HEIGHT = TOP + RUNGS.length * ROW_PITCH + 2;
// Plain display equivalents; the canonical terminology and attribution remain in the method table.
const LEVEL_WORDS: Record<number, string> = {
  0: 'surgeon controls motion',
  1: 'robot assists surgeon',
  2: 'supervised task',
  3: 'human chooses robot plan',
  4: 'surgery under supervision',
  5: 'whole procedure alone',
};
const RESEARCH_WORDS: Record<string, string> = {
  'star-2016': 'STAR, 2016, stitching in live pigs',
  'saeidi-2022': 'Bowel joining, 2022, live pigs',
  'srt-h-2025': 'SRT-H, 2025, removed gallbladders',
};

const CAPTION =
  'Every FDA-authorized surgical robot sits at level 0 or 1; everything higher is research on animals or on tissue removed from the body.';
const DESCRIPTION = `Yang and colleagues' six levels of surgical autonomy, with the systems this article covers placed on them. The teleoperated platforms the FDA has authorized, from Intuitive, CMR, Medtronic and J&J, sit at level 0, and Moon Surgical's Maestro with ScoPilot at level 1. Research demonstrations sit higher: STAR suturing live pigs in 2016 at level 2, Yang's own example; Saeidi and colleagues' 2022 laparoscopic anastomosis in live pigs at level 3, because the operator picks among plans the robot generates; and SRT-H's 2025 clipping-and-cutting experiments on excised gallbladders at level 4, as its authors place it. No system in this comparison is at level 5.`;

export function SurgicalAutonomyLadder({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const citationFor = useCitationLookup();

  return (
    <InstrumentFigure
      figureId="surgical-autonomy-ladder"
      className={className}
      kicker="Six levels of surgical autonomy"
      heading={`Authorized surgical robots reach level ${HIGHEST_AUTHORIZED_LEVEL}; research claims level ${HIGHEST_CLAIMED_LEVEL}`}
      stage={
        <FigureStage>
          <p className="font-sans text-sm leading-snug text-text">
            Six levels, numbered 0 to 5. <strong className="font-medium">Authorized platforms here reach level 1; SRT-H&apos;s authors claim level 4</strong> for research on tissue outside a body.
          </p>
          <p className="font-sans text-sm leading-snug text-text">
            Dots: platforms authorized by the US Food and Drug Administration (FDA). Crosses: research demonstrations.
          </p>
          <PlotStage
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label="Surgical systems and studies placed on six levels of autonomy"
            aria-describedby={descriptionId}
            data-testid="surgical-autonomy-ladder-stage"
          >
            <g data-chart-axes="" stroke={CHART_STRUCTURE.axes} strokeWidth={CHART_STROKE.structure}>
              <line x1={MARK_X} x2={MARK_X} y1={TOP + 4} y2={HEIGHT - 2} />
            </g>
            {RUNGS.map((rung, i) => {
              const top = TOP + i * ROW_PITCH;
              const entry = entryAtLevel(rung.level);
              const lead = entry?.evidence === LEAD_EVIDENCE;
              return (
                <g key={rung.level} data-testid={`surgical-autonomy-level-${rung.level}`} data-level={rung.level}>
                  {i > 0 ? (
                    <line
                      x1={PLOT.left}
                      x2={PLOT.right}
                      y1={top}
                      y2={top}
                      stroke={CHART_STRUCTURE.grid}
                      strokeWidth={CHART_STROKE.structure}
                    />
                  ) : null}
                  <text
                    data-ladder-level=""
                    x={ENTRY_X}
                    y={top + LEVEL_BASELINE}
                    fontSize={CHART_TYPE.labelPx}
                    fontWeight={600}
                    fill={CHART_STRUCTURE.labelSecondary}
                  >
                    {`Level ${rung.level}, ${LEVEL_WORDS[rung.level]}`}
                  </text>
                  {entry ? (
                    <g
                      data-testid={`surgical-autonomy-${entry.id}`}
                      data-series={entry.evidence}
                      data-entry={entry.id}
                      data-level={entry.level}
                    >
                      <PointMarker
                        x={MARK_X}
                        y={top + ENTRY_BASELINE - 4}
                        role={lead ? 'highlight' : 'measurement'}
                        shape={entry.evidence === 'authorized' ? 'dot' : 'cross'}
                      />
                      <DirectLabel x={ENTRY_X} y={top + ENTRY_BASELINE} seriesFor={entry.evidence}>
                        <tspan fontWeight={lead ? 700 : 400}>{RESEARCH_WORDS[entry.id] ?? entry.label}</tspan>
                      </DirectLabel>
                    </g>
                  ) : (
                    <text
                      data-testid={`surgical-autonomy-empty-${rung.level}`}
                      x={ENTRY_X}
                      y={top + ENTRY_BASELINE}
                      fontSize={CHART_TYPE.labelPx}
                      fill={CHART_STRUCTURE.labelSecondary}
                    >
                      {rung.level === 5 ? 'no system in this comparison' : 'none'}
                    </text>
                  )}
                </g>
              );
            })}
          </PlotStage>
          <p className="font-sans text-sm leading-snug text-text-dim">STAR: Smart Tissue Autonomous Robot. SRT-H: a learned system that plans each step in language and guides the arm. CMR: CMR Surgical, maker of Versius.</p>

        </FigureStage>
      }
      caption={CAPTION}
      method={
        <>
          <div>
            Yang and colleagues proposed the six levels in a 2017 Science Robotics editorial. The table names who
            placed each system within that framework. In 2017, Yang described full autonomy as science fiction. Saeidi and colleagues name no level for
            their 2022 system: the operator selecting among plans the robot generates is Yang&apos;s definition of
            level 3, so that placement is this article&apos;s. SRT-H&apos;s authors also put CyberKnife radiosurgery
            and Veebot blood sampling at level 4, both in rigid, structured settings.
          </div>
          <ChartDescription
            open
            id={descriptionId}
            form="table"
            summary="Each level and what sits on it"
            description={DESCRIPTION}
            rowHeader="level"
            columns={[{ header: 'system or study' }, { header: 'evidence' }, { header: 'placed by' }]}
            rows={RUNGS.slice()
              .reverse()
              .map((rung) => {
                const entry = entryAtLevel(rung.level);
                return {
                  label: `Level ${rung.level}, ${rung.name.toLowerCase()}`,
                  values: entry ? [entry.systems, entry.evidenceText, entry.placedBy] : ['none', 'n/a', 'n/a'],
                };
              })}
          />
        </>
      }
      source={
        <span data-testid="surgical-autonomy-ladder-source">
          {LADDER_SOURCES.map((id, i) => {
            const record = citationFor(id);
            return (
              <span key={id}>
                {i > 0 ? '; ' : null}
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
