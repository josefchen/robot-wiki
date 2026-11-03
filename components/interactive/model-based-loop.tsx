'use client';

import { useId } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PlotStage } from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import { CHART_STROKE, CHART_STRUCTURE, CHART_TYPE, DirectLabel, PointMarker, roleColour } from '@/components/motion/chart';
import { MODEL_BASED_LOOP, MODEL_BASED_LOOP_DESCRIPTION, MODEL_BASED_LOOP_SOURCES } from '@/lib/world-model-figures';

/** Original online-learning schematic: real transitions close the planning loop. */
export function ModelBasedLoop({ className }: { className?: string }) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const arrowId = `${id}-arrow`;
  const citationFor = useCitationLookup();
  const source = citationFor(MODEL_BASED_LOOP_SOURCES[0]);
  return (
    <InstrumentFigure
      figureId="model-based-loop"
      className={className}
      kicker="Online model learning, schematic"
      heading="Real outcomes teach the model that plans the next action"
      stage={
        <FigureStage>
          <PlotStage className="mx-auto max-w-xl" viewBox="0 0 340 230" aria-label="Six steps of online model-based learning" aria-describedby={descriptionId} data-testid="model-based-loop-stage">
            <defs>
              <marker id={arrowId} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M0 0 L8 4 L0 8" fill="none" stroke={roleColour('reference')} />
              </marker>
            </defs>
            <g fill="none" stroke={roleColour('reference')} strokeWidth={CHART_STROKE.reference} markerEnd={`url(#${arrowId})`}>
              <path d="M62 58 H154" />
              <path d="M180 58 H272" />
              <path d="M298 58 H336 V184 H300" />
              <path d="M278 184 H186" />
              <path d="M160 184 H68" />
              <path d="M42 184 H4 V58 H40" />
            </g>
            {MODEL_BASED_LOOP.map(step => (
              <g key={step.id} data-series={step.id} data-testid={`model-loop-${step.id}`}>
                <DirectLabel x={step.x} y={step.y - 15} anchor="middle" seriesFor={step.id} role={step.id === 'update' ? 'highlight' : undefined}>
                  <tspan fontWeight={600}>{step.label}</tspan>
                </DirectLabel>
                <PointMarker x={step.x} y={step.y} role={step.id === 'update' ? 'highlight' : step.id === 'act' ? 'action' : step.id === 'score' ? 'value' : step.id === 'observe' ? 'measurement' : 'state'} />
                <text x={step.x} y={step.y + 22} textAnchor="middle" fill={CHART_STRUCTURE.labelSecondary} fontSize={CHART_TYPE.labelPx}>
                  {(step.id === 'score' ? ['compare', 'future rewards'] : step.detail).map((line, index) => <tspan key={line} x={step.x} dy={index === 0 ? 0 : '1.25em'}>{line}</tspan>)}
                </text>
              </g>
            ))}
            <text x="170" y="132" textAnchor="middle" fill={roleColour('highlight')} fontSize={CHART_TYPE.labelPx} data-figure-annotation="">
              Real experience closes the loop
            </text>
          </PlotStage>
        </FigureStage>
      }
      caption="The planner compares predicted rewards for possible actions, then learns from real outcomes; rewards are scores for making progress on the task."
      method={
        <>
          <div>
            Original schematic of the online TD-MPC2 pattern. Its encoder represents observations; learned dynamics predict future states;
            reward and terminal-value predictions score candidate trajectories. The planner executes the first action and replans from the next observation.
            Training samples recorded transitions from replay data. The diagram compresses collection and learning into one loop; model updates need not follow every action.
            Offline deployment can hold the model fixed, and imagination-trained policies can move planning work into training.
          </div>
          <ChartDescription open id={descriptionId} form="state" summary="Each step in the loop" description={MODEL_BASED_LOOP_DESCRIPTION} states={MODEL_BASED_LOOP.map(step => ({ label: step.label, value: step.detail.join(' ') }))} />
        </>
      }
      source={source ? <a data-brand-control-id="control:link-focus" href={source.url} target="_blank" rel="noopener">{source.label}, sections 2 and 3</a> : MODEL_BASED_LOOP_SOURCES[0]}
    />
  );
}
