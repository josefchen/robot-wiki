'use client';

import Link from 'next/link';
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

type TermProps = {
  /** Glossary registry id, exposed as data-term-id for reconciliation. */
  termId: string;
  /** Canonical display name from the glossary registry. */
  term: string;
  /**
   * Definition from the glossary registry. Rendered identically on
   * /glossary, so the inline tooltip and the glossary entry are one source
   * of truth.
   */
  definition: string;
  /** MDX children override the display text (plurals, capitalization). */
  children?: ReactNode;
};

type Placement = {
  /**
   * Horizontal shift in px applied to the tooltip so it stays inside the
   * viewport: 0 when the term's left edge works, negative when the term
   * sits close enough to the right edge that left-anchoring would overflow.
   */
  dx: number;
  /** Above the term by default; below when there is more room underneath. */
  vertical: 'above' | 'below';
};

const VIEWPORT_MARGIN_PX = 12;

/**
 * Inline glossary term. The term itself is a link to its /glossary entry
 * (natural focusability and a click target), and a tooltip with the
 * definition appears on hover AND on keyboard focus via the CSS-only
 * group-hover / group-focus-within pattern proven in components/ui/cite.tsx
 * (aria-describedby wiring, hidden at rest so it never expands scroll
 * width, absolutely positioned so it shifts no layout).
 *
 * One addition over the cite pattern: when a reveal happens, a layout
 * effect measures the displayed tooltip (getBoundingClientRect forces the
 * pending hover/focus style recalc, so the box is real) and clamps its
 * position into the viewport. Definitions stay fully readable for terms
 * near the right edge, the left edge, or the top of the viewport.
 * This is a clamp, not a positioning library; visibility
 * stays CSS-driven, which is what keeps it working in the static export.
 */
export function Term({ termId, term, definition, children }: TermProps) {
  const tooltipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [placement, setPlacement] = useState<Placement>({ dx: 0, vertical: 'above' });

  useLayoutEffect(() => {
    if (!revealed) return;
    const root = rootRef.current;
    const tip = tooltipRef.current;
    if (!root || !tip) return;
    const rect = root.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    // Zero box: the CSS reveal did not actually happen (stale event).
    if (tipRect.width === 0 || tipRect.height === 0) return;

    const dx =
      Math.max(
        VIEWPORT_MARGIN_PX,
        Math.min(rect.left, window.innerWidth - tipRect.width - VIEWPORT_MARGIN_PX),
      ) - rect.left;
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const vertical =
      spaceAbove >= tipRect.height + VIEWPORT_MARGIN_PX || spaceAbove >= spaceBelow
        ? 'above'
        : 'below';
    setPlacement((prev) =>
      prev.dx === dx && prev.vertical === vertical ? prev : { dx, vertical },
    );
  }, [revealed]);

  return (
    <span
      ref={rootRef}
      data-term-id={termId}
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => setRevealed(false)}
      onFocus={() => setRevealed(true)}
      onBlur={() => setRevealed(false)}
      className="group relative inline-block align-baseline"
    >
      <Link
        href={`/glossary#${termId}`}
        aria-describedby={tooltipId}
        className="term-link"
      >
        {children ?? term}
      </Link>
      <span
        role="tooltip"
        id={tooltipId}
        ref={tooltipRef}
        // Hidden copy: excluded from the Pagefind index so search excerpts
        // never fuse the definition onto the surrounding prose. Inert for
        // assistive technology; the aria-describedby wiring is untouched.
        data-pagefind-ignore
        style={{ marginLeft: placement.dx }}
        className={[
          'absolute left-0 z-20 hidden w-64 max-w-[calc(100vw-3rem)] rounded-md border border-border bg-surface-2 p-2.5 font-sans text-xs leading-relaxed text-text group-hover:block group-focus-within:block',
          placement.vertical === 'above' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
        ].join(' ')}
      >
        <span className="block font-medium">{term}</span>
        <span className="mt-0.5 block">{definition}</span>
      </span>
    </span>
  );
}
