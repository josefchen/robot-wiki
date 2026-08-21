'use client';

import { useId, useState, type ReactNode } from 'react';
import { cx } from '@/lib/utils';

/**
 * CommitToReveal is the shared internal primitive behind every
 * commit-before-reveal affordance in article prose (the self-check today,
 * the prediction step next). It is NOT registered in mdx-components.tsx:
 * MDX authors use its named exports (SelfCheck now, PredictThenReveal
 * later), never the primitive itself.
 *
 * Mechanics, and why each one is the only acceptable choice:
 *
 * - The gate is a native <details>. Its closed content is present in the
 *   served HTML (so the no-JS reader, and the reader who declines to
 *   answer, still get the reasoning by opening the summary), excluded
 *   from the accessibility tree, excluded from Chromium innerText, and
 *   excluded from the reading-time measurement. No CSS blur (meaningless
 *   to a screen reader), no visibility/opacity tricks, no JS-only
 *   mounting. The SSR DOM and the hydrated DOM are byte-identical: the
 *   server renders the disclosure closed and script's only job is to set
 *   open in response to a committed choice.
 *
 * - Platform semantics: a native <fieldset> whose <legend> is the prompt,
 *   and native radio inputs sharing one useId()-derived name, so arrow-key
 *   group navigation and the group's accessible name come free. Every DOM
 *   id is useId-derived: two mounts on one page must never cross-bind.
 *
 * - Selecting commits immediately. No submit button (a submit button is a
 *   test), nothing locks, re-selecting re-reveals with the new option.
 *
 * - Zero persistence: no storage, no cookies, no URL state. A returning
 *   reader answers again, which is the retrieval practice working as
 *   designed.
 *
 * - The reveal region is aria-live="polite" (the site convention) and
 *   focus is never moved programmatically.
 *
 * Stable data hooks are part of this component's API: data-self-check on
 * the self-check region, data-predict on the prediction-step region,
 * data-reveal on the disclosure, data-reveal-hint on the hint,
 * data-takeaway on the takeaway, data-reason (value = the option it
 * explains) on each reasoning element.
 */

/** One labelled choice with the reasoning a commit reveals. */
export interface CommitOption {
  /** Stable machine id; doubles as the radio value and the data-reason key. */
  value: string;
  /** The choice the reader reads. Complete without the widget. */
  label: string;
  /**
   * What this option gets right, or what it gets wrong and which belief
   * it encodes. Never a verdict word: the reasoning is where the learning
   * is. Must read complete with JavaScript disabled.
   */
  why: ReactNode;
  /**
   * Optional citation registry id. MDX cannot embed a <Cite> chip inside
   * an attribute expression (they are ES expressions, not JSX), so the
   * component renders the chip itself: a small mono link to this
   * article's References entry (#ref-<id>), which exists on every
   * article that lists the id in its frontmatter citations. This is how
   * a correct answer stays traceable to its source (VAL-EDU-018).
   */
  cite?: string;
  /**
   * Optional in-page anchor rendered at the end of this option's
   * reasoning, for answers whose evidence is the article's own section
   * or interactive rather than an external source. Two flat string
   * props rather than an object: MDX attribute expressions are parsed
   * by acorn without JSX, and a nested object literal trips it.
   */
  anchorHref?: string;
  anchorLabel?: string;
}

/** Props shared by every commit-to-reveal surface. */
export interface CommitToRevealProps {
  /** Kicker above the prompt, sentence case, names the affordance. */
  kicker: string;
  /** The question. Rendered as the fieldset legend. */
  prompt: string;
  /** Exactly three labelled options. */
  options: CommitOption[];
  /** The value of the correct option. */
  answer: string;
  /** The author's one-sentence settlement, revealed with the reasoning. */
  takeaway: ReactNode;
  /**
   * Control over the revealed payload. SelfCheck renders its own
   * reasoning list; a prediction step passes a figure as children and
   * a hint naming its mounted configuration.
   */
  children?: ReactNode;
  /** Optional element naming the wrapped figure's configuration. */
  revealHint?: ReactNode;
  className?: string;
}

/**
 * Which author-facing surface this mount is. Selects the stable region
 * hook MDX validators select on. Internal: the named exports set it, MDX
 * authors never pass it.
 */
type CommitRegion = 'self-check' | 'predict';

/** Internal props: the public surface plus the region selector. */
type CommitToRevealInternalProps = CommitToRevealProps & {
  region?: CommitRegion;
};

export function CommitToReveal({
  kicker,
  prompt,
  options,
  answer,
  takeaway,
  children,
  revealHint,
  className,
  region = 'self-check',
}: CommitToRevealInternalProps) {
  // useId seeds every id and the radio group name: stable across server
  // and client, unique per mount.
  const uid = useId();
  const groupName = `${uid}-choice`;
  const [chosen, setChosen] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const commit = (value: string) => {
    setChosen(value);
    setOpen(true);
  };

  return (
    <section
      data-self-check={region === 'self-check' ? '' : undefined}
      data-predict={region === 'predict' ? '' : undefined}
      aria-labelledby={`${uid}-prompt`}
      className={cx(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className,
      )}
    >
      <p className="font-mono text-xs text-text-dim">{kicker}</p>
      <fieldset className="mt-2">
        <legend id={`${uid}-prompt`} className="font-medium">
          {prompt}
        </legend>
        <div className="mt-3 grid gap-2">
          {options.map((option) => (
            <label
              key={option.value}
              data-chosen={chosen === option.value ? 'true' : undefined}
              className="flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-surface-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
            >
              <input
                type="radio"
                name={groupName}
                value={option.value}
                checked={chosen === option.value}
                onChange={() => commit(option.value)}
                className="mt-0.5 accent-accent"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <details
        data-reveal=""
        open={open}
        onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}
        className="mt-3 bg-surface-2 p-3 text-sm"
      >
        <summary className="cursor-pointer text-text-dim">
          {chosen === null ? 'Read the reasoning' : 'Reasoning'}
        </summary>
        <div aria-live="polite">
          {revealHint ? <div data-reveal-hint="">{revealHint}</div> : null}
          {children}
          <ul className="mt-2 grid gap-2">
            {options.map((option) => (
              <li
                key={option.value}
                data-reason={option.value}
                data-correct={option.value === answer ? 'true' : undefined}
                data-selected={
                  chosen === option.value ? 'true' : undefined
                }
                // Both markings are CSS driven off the data attributes,
                // never applied by an effect: the correct row must be
                // marked for the reader who opens the summary without
                // answering, including with no script at all
                // (VAL-EDU-044). The correct row carries the ok token
                // AND a weight step, so the mark survives forced
                // colours (WCAG 1.4.1); the reader's own pick carries a
                // neutral text marker instead, because in this
                // component the reasoning is what delivers the
                // judgement, not a colour on the row you chose.
                className={cx(
                  'group/reason grid gap-0.5 text-text-dim',
                  'data-[correct=true]:text-text',
                )}
              >
                <span className="font-medium group-data-[correct=true]/reason:font-bold group-data-[correct=true]/reason:text-ok">
                  {option.label}
                  {chosen === option.value ? (
                    <span
                      data-pick-marker=""
                      className="ml-2 align-baseline font-mono text-[0.72em] font-normal text-text-dim"
                    >
                      your pick
                    </span>
                  ) : null}
                </span>
                <span>
                  {option.why}
                  {option.cite ? (
                    // House cite-chip idiom (components/ui/cite.tsx): the
                    // border and chip surface live on a non-interactive
                    // wrapping span, and the anchor itself carries no
                    // border. A bordered anchor inside the fully bordered
                    // reveal shell is a doubly boxed control (VAL-EDU-031).
                    <span className="ml-1 inline-block rounded-xs border border-border bg-surface-2 align-baseline transition-colors hover:border-accent">
                      <a
                        href={`#ref-${option.cite}`}
                        className="px-1 font-mono text-[0.72em] leading-5 text-text-dim no-underline transition-colors hover:text-accent"
                      >
                        {option.cite}
                      </a>
                    </span>
                  ) : null}
                  {option.anchorHref && option.anchorLabel ? (
                    <a
                      href={option.anchorHref}
                      className="ml-1 text-[0.72em] text-text-dim underline decoration-border transition-colors hover:text-accent"
                    >
                      {option.anchorLabel}
                    </a>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
          <p data-takeaway="" className="mt-3 border-t border-border pt-3">
            {takeaway}
          </p>
        </div>
      </details>
    </section>
  );
}

/**
 * The self-check: one judgement question about the article's argument.
 * Authored in MDX as the last block of the article prose. No score, no
 * counter, no streak, no celebration: one commit, one reveal.
 */
export function SelfCheck(props: Omit<CommitToRevealProps, 'kicker'>) {
  return <CommitToReveal kicker="Self-check" {...props} />;
}

/**
 * The prediction step: commit to a guess about a figure before the
 * figure answers. The interactive itself is passed as children, mounted
 * at the configuration that answers the prompt, with a required
 * revealHint naming that configuration and a required takeaway the
 * figure settles; a component with no thesis is unconstructible.
 *
 * The reveal's own summary is the mandatory escape path: a reader who
 * declines to guess opens the answer without committing. It is natively
 * focusable and Enter- or Space-activatable, and it sits after the
 * fieldset in DOM order so a keyboard reader meets the question first.
 * Activating it marks no option as chosen.
 */
export function PredictThenReveal(
  props: Omit<
    CommitToRevealProps,
    'kicker' | 'children' | 'revealHint'
  > & {
    /** The figure, mounted at the configuration that answers the prompt. */
    children: ReactNode;
    /** One line naming the mounted configuration, rendered above the figure. */
    revealHint: ReactNode;
  },
) {
  return <CommitToReveal kicker="Prediction" region="predict" {...props} />;
}
