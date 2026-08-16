'use client';

import { useState } from 'react';
import { EUREKA_GENERATIONS, EUREKA_TASK, diffLines } from '@/lib/eureka';
import { cx } from '@/lib/utils';

/**
 * EurekaLoop: a scripted replay of Eureka's evolutionary reward-design
 * loop for a quadruped walking task. Each activation of the run control
 * advances one generation: the proposed reward code, a visible line diff
 * against the previous generation, the per-component training statistics
 * the LLM was shown, and the reflection it wrote before mutating. The
 * reflection step is the point of the panel; the final reward is not the
 * lesson.
 *
 * The generations are a scripted illustration of the mechanism, labeled
 * as such, not a recording of a real Eureka run.
 *
 * Interactive contract: deterministic initial render (generation 0),
 * native buttons (keyboard-accessible), visible monospace readouts,
 * reset control, no animation at all (reduced-motion safe by
 * construction), no layout shift beyond advancing generations.
 */

const DIFF_STYLE: Record<'same' | 'add' | 'del', string> = {
  same: 'text-text-dim',
  add: 'bg-ok/10 text-ok',
  del: 'bg-err/10 text-err line-through',
};

const DIFF_PREFIX: Record<'same' | 'add' | 'del', string> = {
  same: '  ',
  add: '+ ',
  del: '- ',
};

const STAT_TONE: Record<'ok' | 'warn' | 'err', string> = {
  ok: 'text-ok',
  warn: 'text-warn',
  err: 'text-err',
};

export function EurekaLoop({ className }: { className?: string }) {
  const [gen, setGen] = useState(0);
  const current = EUREKA_GENERATIONS[gen];
  const isLast = gen === EUREKA_GENERATIONS.length - 1;
  const diff =
    gen > 0 ? diffLines(EUREKA_GENERATIONS[gen - 1].code, current.code) : null;

  const buttonBase =
    'rounded-sm border px-2.5 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px]';
  const buttonIdle =
    'border-border bg-surface-2 text-text-dim hover:border-border-strong hover:text-text';
  const buttonAccent = 'border-accent bg-surface-2 text-accent';

  return (
    <div
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          data-pagefind-ignore
          type="button"
          onClick={() =>
            setGen((g) => Math.min(g + 1, EUREKA_GENERATIONS.length - 1))
          }
          disabled={isLast}
          aria-label="Run next generation"
          className={cx(
            buttonBase,
            isLast
              ? 'cursor-not-allowed border-border bg-surface-2 text-text-dim opacity-50'
              : buttonAccent,
          )}
        >
          Run next generation
        </button>
        <button
          data-pagefind-ignore
          type="button"
          onClick={() => setGen(0)}
          className={cx(buttonBase, buttonIdle)}
        >
          Reset
        </button>
        <span
          data-testid="generation-readout"
          className="font-mono text-xs text-text-dim"
          aria-live="polite"
        >
          Generation <span className="text-accent">{current.index}</span> of{' '}
          {EUREKA_GENERATIONS.length - 1}
        </span>
        <span className="font-mono text-xs text-text-dim">
          Fitness:{' '}
          <span data-testid="fitness-readout" className="text-text">
            {current.fitness.toFixed(2)}
          </span>
        </span>
      </div>

      <p className="mt-2 font-mono text-[11px] text-text-dim">
        Task: {EUREKA_TASK}
      </p>

      <div className="mt-3 grid gap-4 lg:grid-cols-[11fr_7fr]">
        <div>
          <p className="font-mono text-[11px] text-text-dim">
            {gen === 0
              ? 'Proposed reward code'
              : 'Proposed reward code, diff vs previous'}
          </p>
          <pre
            data-testid="eureka-code"
            className="mt-2 overflow-x-auto rounded-sm border border-border bg-bg p-3 font-mono text-xs leading-relaxed text-text"
          >
            {current.code.join('\n')}
          </pre>
          {diff && (
            <div className="mt-3">
              <p className="font-mono text-[11px] text-text-dim">
                Mutation diff, generation {gen - 1} to {gen}
              </p>
              <pre
                data-testid="eureka-diff"
                className="mt-2 overflow-x-auto rounded-sm border border-border bg-bg p-3 font-mono text-xs leading-relaxed"
              >
                {diff.map((line, i) => (
                  <div
                    key={i}
                    data-diff={line.type}
                    className={DIFF_STYLE[line.type]}
                  >
                    {DIFF_PREFIX[line.type]}
                    {line.text}
                  </div>
                ))}
              </pre>
            </div>
          )}
        </div>

        <div>
          <p className="font-mono text-[11px] text-text-dim">
            Reward statistics from training
          </p>
          <dl
            data-testid="eureka-stats"
            className="mt-2 divide-y divide-border rounded-sm border border-border bg-bg"
          >
            {current.stats.map((s) => (
              <div
                key={s.label}
                className="flex items-baseline justify-between gap-3 px-3 py-2"
              >
                <dt className="font-mono text-xs text-text-dim">{s.label}</dt>
                <dd
                  className={cx(
                    'font-mono text-xs',
                    s.tone ? STAT_TONE[s.tone] : 'text-text',
                  )}
                >
                  {s.value}
                </dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-3 px-3 py-2">
              <dt className="font-mono text-xs text-text-dim">Task fitness</dt>
              <dd className="font-mono text-xs text-accent">
                {current.fitness.toFixed(2)}
              </dd>
            </div>
          </dl>

          <p className="mt-3 font-mono text-[11px] text-text-dim">
            LLM reflection on the statistics
          </p>
          <blockquote
            data-testid="eureka-reflection"
            className="mt-2 rounded-sm border border-border border-l-accent border-l-2 bg-bg p-3 font-sans text-xs leading-relaxed text-text"
          >
            {current.reflection}
          </blockquote>
        </div>
      </div>

      <p className="mt-4 font-sans text-xs leading-relaxed text-text-dim">
        Scripted replay of the Eureka loop (propose reward code, train, select
        on fitness, reflect on reward statistics, mutate). The code, statistics,
        and reflections are an illustration of the mechanism, not a recording of
        a real run.
      </p>
    </div>
  );
}
