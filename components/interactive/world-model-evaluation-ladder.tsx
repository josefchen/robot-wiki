'use client';

import { useId } from 'react';
import { useCitationLookup } from '@/components/article/citation-records';
import { ChartDescription } from '@/components/ui/chart-description';
import { InstrumentFigure, PlotStage } from '@/components/ui/instrument';
import { FigureStage } from '@/components/motion/figure-frame';
import { CHART_STROKE, CHART_STRUCTURE, CHART_TYPE, DirectLabel, PointMarker, roleColour } from '@/components/motion/chart';
import { EVALUATION_LADDER_DESCRIPTION, EVALUATION_LADDER_SOURCES, EVALUATION_RUNGS, SIMFOUNDRY_EVALUATION } from '@/lib/world-model-figures';

/** A five-question evaluation ladder with a published policy-ranking example. */
export function WorldModelEvaluationLadder({ className }: { className?: string }) {
  const descriptionId = `${useId()}-description`;
  const citationFor = useCitationLookup();
  return (
    <InstrumentFigure
      figureId="world-model-evaluation-ladder"
      className={className}
      kicker="Five separate evaluation questions"
      heading="Five tests that realistic video alone cannot pass"
      stage={
        <FigureStage>
          <p className="font-sans text-sm leading-snug text-text">
            A world model is good enough to choose between policies only if it ranks them the way real trials do. Good-looking video is no evidence of that.
          </p>
          <PlotStage className="mx-auto max-w-xl" viewBox="0 0 340 282" aria-label="Five-rung world-model evaluation ladder" aria-describedby={descriptionId} data-testid="world-model-evaluation-ladder-stage">
            <line x1="12" x2="12" y1="24" y2="252" stroke={roleColour('reference')} strokeWidth={CHART_STROKE.reference} />
            {EVALUATION_RUNGS.map((rung, i) => (
              <g key={rung.id} data-series={rung.id} data-testid={`evaluation-rung-${i + 1}`}>
                <PointMarker x={12} y={rung.y} role={i === 3 ? 'highlight' : 'measurement'} />
                <line x1="15" x2="27" y1={rung.y} y2={rung.y} stroke={roleColour(i === 3 ? 'highlight' : 'reference')} strokeWidth={CHART_STROKE.structure} />
                <DirectLabel x={36} y={rung.y + 4} seriesFor={rung.id} role={i === 3 ? 'highlight' : undefined}>
                  <tspan fontWeight={600}>{i + 1}. {rung.label}</tspan>
                </DirectLabel>
                <text x="36" y={rung.y + 22} fontSize={CHART_TYPE.labelPx} fill={CHART_STRUCTURE.labelSecondary}>{rung.question}</text>
              </g>
            ))}
            <g data-figure-annotation="" fill={roleColour('highlight')} fontSize={CHART_TYPE.readoutPx}>
              <text x="36" y="208" data-scene-readout="">SimFoundry study: {SIMFOUNDRY_EVALUATION.pearson} correlation</text>
              <text x="36" y="226" data-scene-readout="">{SIMFOUNDRY_EVALUATION.tasks} tasks, {SIMFOUNDRY_EVALUATION.architectures} policy types</text>
            </g>
          </PlotStage>
          <p className="font-sans text-sm leading-snug text-text-dim">A policy is the program that chooses a robot&apos;s actions. SimFoundry rebuilds real scenes in a physics simulator. A correlation near 1 means simulated and real success rates rise together; 0 means no straight-line link.</p>

        </FigureStage>
      }
      caption="Each use needs its own test: a model that makes realistic video can still ignore the action or rank policies wrongly."
      method={
        <>
          <div>
            Original guide to the five questions this article asks, assembled from separate studies.
            WorldEval tests action-following predictions, WorldModelBench checks physical violations, and WorldGym uses a separate vision-language reward scorer.
            SimFoundry supplies a physics-simulation reference for the fourth rung: its zero-shot evaluations across seven tasks and five policy architectures
            report mean Pearson correlation {SIMFOUNDRY_EVALUATION.pearson} and mean maximum rank violation {SIMFOUNDRY_EVALUATION.mmrv}.
            Pearson measures linear agreement in success rates; rank violation measures how much the ordering disagrees, with zero ideal.
            Neither number is a success percentage or proof of safety. V-JEPA 2 tests real reaching, grasping and pick-and-place with its model in the loop for the final question.
          </div>
          <ChartDescription open id={descriptionId} form="state" summary="The question at each rung" description={EVALUATION_LADDER_DESCRIPTION} states={EVALUATION_RUNGS.map((rung, i) => ({ label: `${i + 1}. ${rung.label}`, value: rung.question }))} />
        </>
      }
      source={<span>{EVALUATION_LADDER_SOURCES.map((id, i) => {
        const source = citationFor(id);
        return <span key={id}>{i ? '; ' : null}{source ? <a data-brand-control-id="control:link-focus" href={source.url} target="_blank" rel="noopener">{source.label}</a> : id}</span>;
      })}.</span>}
    />
  );
}
