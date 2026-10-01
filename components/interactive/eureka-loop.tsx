'use client';

import { useId, useState } from 'react';
import { FigureStage } from '@/components/motion/figure-frame';
import { roleColour } from '@/components/motion/chart';
import {
  INSTRUMENT_SECONDARY_CONTROL_CLASS,
  InstrumentFigure,
  InstrumentReadout,
  InstrumentReset,
} from '@/components/ui/instrument';
import {
  EUREKA_GENERATIONS,
  EUREKA_TASK,
  diffLines,
} from '@/lib/eureka';
import { scrollRegionAttributes } from '@/lib/scroll-region.mjs';
import { cx } from '@/lib/utils';

/**
 * EurekaLoop: a scripted replay of Eureka's evolutionary reward-design
 * loop for a quadruped walking task. Each activation of the run control
 * advances one generation: the per-component training statistics the LLM
 * was shown and the reflection it wrote before mutating sit on the figure
 * stage, and the proposed reward code with its line diff against the
 * previous generation follows the figure as two code blocks. The
 * reflection step is the point of the panel; the final reward is not the
 * lesson.
 *
 * The generations are a scripted illustration of the mechanism, labeled
 * as such, not a recording of a real Eureka run.
 *
 * Interactive contract: deterministic initial render (generation 0),
 * native buttons (keyboard-accessible), visible readouts, reset control,
 * no animation at all (reduced-motion safe by construction), no layout
 * shift beyond advancing generations.
 */

/**
 * A change bar in the gutter carries the same statement the tint does, in
 * the register a diff reader already knows, so the added and removed lines
 * stay separable from the unchanged ones without relying on the hue.
 */
const DIFF_STYLE: Record<'same' | 'add' | 'del', string> = {
  same: 'border-l-2 border-transparent pl-2 text-text-dim',
  add: 'border-l-2 border-ok bg-ok/10 pl-2 text-ok',
  del: 'border-l-2 border-err bg-err/10 pl-2 text-err line-through',
};

const DIFF_PREFIX: Record<'same' | 'add' | 'del', string> = {
  same: '  ',
  add: '+ ',
  del: '- ',
};

/**
 * The status hues fall below contrast on the graphite stage, so a
 * statistic's tone is a word in the stage text colour and the chip's
 * border repeats it: dashed for fine, solid for worth watching, heavy for
 * failing.
 */
const TONE_WORD: Record<'ok' | 'warn' | 'err', string> = {
  ok: 'ok',
  warn: 'watch',
  err: 'fail',
};

const TONE_LINE: Record<'ok' | 'warn' | 'err', string> = {
  ok: 'border border-dashed border-text-dim',
  warn: 'border border-solid border-text',
  err: 'border border-solid border-text font-semibold',
};

const TONE_CHIP_CLASS =
  'inline-flex w-12 items-center justify-center rounded-xs py-0.5 text-xs leading-none';

const CODE_BLOCK_CLASS =
  'm-0! overflow-x-auto rounded-md border border-border bg-surface px-4 py-3.5 font-mono text-[13px] leading-relaxed text-text';

/** The statistics the LLM was shown for one generation, and its reflection. */
function GenerationReview({ gen }: { gen: number }) {
  const current = EUREKA_GENERATIONS[gen];
  const fitnessColour = roleColour('value');
  return (
    <div className="grid basis-full gap-x-6 gap-y-4 pb-2 font-sans text-[13px] leading-snug text-text sm:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]">
      <div>
        <div className="text-text-dim">Scripted reward statistics</div>
        <dl
          data-testid="eureka-stats"
          className="mt-1.5 divide-y divide-border-strong border-y border-border-strong"
        >
          {current.stats.map((s) => (
            <div key={s.label} className="flex items-baseline gap-3 py-1.5">
              <dt className="min-w-0 flex-1 text-text-dim">{s.label}</dt>
              <dd className="flex items-baseline gap-2 tabular-nums">
                <span>{s.value}</span>
                {s.tone ? (
                  <span data-tone={s.tone} data-brand-surface-id="surface:flat" className={cx(TONE_CHIP_CLASS, TONE_LINE[s.tone])}>
                    {TONE_WORD[s.tone]}
                  </span>
                ) : (
                  <span aria-hidden="true" className="w-12" />
                )}
              </dd>
            </div>
          ))}
          <div className="flex items-baseline gap-3 py-1.5">
            <dt className="min-w-0 flex-1 text-text-dim">Task fitness</dt>
            <dd className="flex items-baseline gap-2 tabular-nums">
              <span style={{ color: fitnessColour }}>{current.fitness.toFixed(2)}</span>
              <span aria-hidden="true" className="w-12" />
            </dd>
          </div>
        </dl>
      </div>
      <div>
        <div className="text-text-dim">Scripted reflection on the statistics</div>
        <div
          data-testid="eureka-reflection"
          className="mt-1.5 border-l-2 pl-3 leading-relaxed"
          style={{ borderColor: roleColour('highlight') }}
        >
          {current.reflection}
        </div>
      </div>
    </div>
  );
}

export function EurekaLoop({ className }: { className?: string }) {
  // Both code blocks scroll horizontally, so each one is a region that has
  // to say what it holds; the labels above them already say it, so the
  // regions borrow those rather than repeating them.
  const codeLabelId = `${useId()}-code`;
  const diffLabelId = `${useId()}-diff`;
  const [gen, setGen] = useState(0);
  const current = EUREKA_GENERATIONS[gen];
  const isLast = gen === EUREKA_GENERATIONS.length - 1;
  const diff =
    gen > 0
      ? diffLines(EUREKA_GENERATIONS[gen - 1].code, current.code)
      : null;

  return (
    <div className={className}>
      <InstrumentFigure
        figureId="eureka-loop"
        heading="Eureka loop, scripted replay"
        controls={
          <>
            <button
              data-brand-control-id="control:secondary-action"
              data-pagefind-ignore
              type="button"
              onClick={() =>
                setGen((g) => Math.min(g + 1, EUREKA_GENERATIONS.length - 1))
              }
              disabled={isLast}
              aria-label="Run next generation"
              className={INSTRUMENT_SECONDARY_CONTROL_CLASS}
            >
              Run next generation
            </button>
            <InstrumentReset onClick={() => setGen(0)} />
          </>
        }
        stage={
          <FigureStage
            footer={
              <>
                <GenerationReview gen={gen} />
                <InstrumentReadout className="flex flex-wrap gap-x-4 gap-y-1">
                  <span data-testid="generation-readout">
                    Generation {current.index} of {EUREKA_GENERATIONS.length - 1}
                  </span>
                  <span>
                    Fitness:{' '}
                    <span data-testid="fitness-readout" style={{ color: roleColour('value') }}>
                      {current.fitness.toFixed(2)}
                    </span>
                  </span>
                </InstrumentReadout>
              </>
            }
          >
            <div className="px-3 pt-3 pb-3 font-sans text-[13px] leading-snug text-text">
              Task: {EUREKA_TASK}
            </div>
          </FigureStage>
        }
        caption="Each generation pairs the training statistics with the reflection written before the reward code mutates."
        source="Scripted replay of the Eureka loop (propose reward code, train, select on fitness, reflect, mutate) with authored teaching data."
      />
      <div className="grid gap-5">
        <div className="grid gap-1.5">
          <div id={codeLabelId} className="font-sans text-sm text-text-dim">
            Proposed reward code, generation {current.index}
          </div>
          <pre
            data-testid="eureka-code"
            data-brand-surface-id="surface:flat"
            {...scrollRegionAttributes({ labelledBy: codeLabelId })}
            className={CODE_BLOCK_CLASS}
          >
            <code>{current.code.join('\n')}</code>
          </pre>
        </div>
        {diff ? (
          <div className="grid gap-1.5">
            <div id={diffLabelId} className="font-sans text-sm text-text-dim">
              Mutation diff, generation {gen - 1} to {gen}
            </div>
            <pre
              data-testid="eureka-diff"
              data-brand-surface-id="surface:flat"
              {...scrollRegionAttributes({ labelledBy: diffLabelId })}
              className={CODE_BLOCK_CLASS}
            >
              <code>
                {diff.map((line, i) => (
                  <span key={i} data-diff={line.type} className={cx('block', DIFF_STYLE[line.type])}>
                    {DIFF_PREFIX[line.type]}
                    {line.text}
                  </span>
                ))}
              </code>
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
