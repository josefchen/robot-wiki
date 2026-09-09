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

const VIEWPORT_MARGIN_PX = 12;
const TRIGGER_GAP_PX = 6;

/**
 * Inline glossary term. The term itself is a link to its /glossary entry
 * (natural focusability and a click target), and a tooltip with the
 * definition appears on hover AND on keyboard focus via the CSS-only
 * group-hover / group-focus-within pattern proven in components/ui/cite.tsx
 * (aria-describedby wiring, hidden at rest so it never expands scroll
 * width, absolutely positioned so it shifts no layout).
 *
 * Placement is measured on reveal and kept current while either hover or
 * focus remains. A fitting side is preferred; when neither side fits, the
 * larger side becomes a scrollable, keyboard-reachable definition rather
 * than clipping text or covering the glossary link. The usable viewport
 * excludes visible sticky headers. Visibility and the unhydrated fallback
 * remain CSS-driven; measuring never changes article layout.
 */
export function Term({ termId, term, definition, children }: TermProps) {
  const tooltipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const revealed = hovered || focused;

  useLayoutEffect(() => {
    if (!revealed) return;
    const root = rootRef.current;
    const tip = tooltipRef.current;
    if (!root || !tip) return;
    const headers = [...document.querySelectorAll('header')];
    const viewport = window.visualViewport;
    let frame = 0;

    const place = () => {
      const rect = root.getBoundingClientRect();
      const scrollTop = tip.scrollTop;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportTop = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? (document.documentElement.clientWidth || window.innerWidth);
      const height = viewport?.height ?? window.innerHeight;
      // Measure the natural height afresh: a previous constrained placement
      // must not become the next "full definition" height after a resize.
      tip.style.maxWidth = `min(calc(100vw - 3rem), ${width - 2 * VIEWPORT_MARGIN_PX}px)`;
      tip.style.maxHeight = 'none';
      const tipRect = tip.getBoundingClientRect();
      if (!tipRect.width || !tipRect.height) return;
      const left = Math.max(viewportLeft + VIEWPORT_MARGIN_PX,
        Math.min(rect.left, viewportLeft + width - tipRect.width - VIEWPORT_MARGIN_PX));
      let top = viewportTop + VIEWPORT_MARGIN_PX;
      const bottom = viewportTop + height - VIEWPORT_MARGIN_PX;
      for (const header of headers) {
        const style = getComputedStyle(header);
        const box = header.getBoundingClientRect();
        if (['sticky', 'fixed'].includes(style.position) &&
            style.visibility !== 'hidden' && box.width && box.height &&
            box.top <= viewportTop + (parseFloat(style.top) || 0) &&
            box.right > left && box.left < left + tipRect.width) {
          top = Math.max(top, box.bottom + VIEWPORT_MARGIN_PX);
        }
      }
      const above = Math.max(0, Math.min(bottom, rect.top - TRIGGER_GAP_PX) - top);
      const below = Math.max(0, bottom - Math.max(top, rect.bottom + TRIGGER_GAP_PX));
      const useAbove = tipRect.height <= above ||
        (tipRect.height > below && above >= below);
      const available = useAbove ? above : below;
      const renderedHeight = Math.min(tipRect.height, available);
      const y = useAbove
        ? Math.max(top, Math.min(bottom, rect.top - TRIGGER_GAP_PX) - renderedHeight)
        : Math.max(top, rect.bottom + TRIGGER_GAP_PX);
      // Only the revealed leaf's geometry changes, not React state on every
      // scroll frame. Inline geometry overrides the CSS-only default above.
      tip.style.marginLeft = `${left - rect.left}px`;
      tip.style.top = `${y - rect.top}px`;
      tip.style.bottom = 'auto';
      tip.style.marginTop = '0';
      tip.style.marginBottom = '0';
      tip.style.maxHeight = `${available}px`;
      tip.style.overflowY = 'auto';
      tip.style.overscrollBehavior = 'contain';
      tip.tabIndex = tipRect.height > available ? 0 : -1;
      tip.scrollTop = scrollTop;
    };
    const schedule = (event?: Event) => {
      // Scrolling the definition itself must not reset its reading position.
      if (event?.target === tip || frame) return;
      frame = requestAnimationFrame(() => { frame = 0; place(); });
    };
    place();
    const observer = new ResizeObserver(() => schedule());
    for (const element of [root, tip, ...tip.children, ...headers]) observer.observe(element);
    window.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    viewport?.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      viewport?.removeEventListener('resize', schedule);
    };
  }, [revealed, definition, term]);

  return (
    <span
      ref={rootRef}
      data-term-id={termId}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      // Transparent 6px bridges preserve hover while crossing the existing
      // visual gap into a scrollable tooltip, without covering the link.
      className="group relative inline-block align-baseline before:absolute before:inset-x-0 before:bottom-full before:h-1.5 after:absolute after:inset-x-0 after:top-full after:h-1.5"
    >
      <Link
        href={`/glossary#${termId}`}
        aria-describedby={tooltipId}
        data-brand-control-id="control:link-focus"
        className="term-link"
      >
        {children ?? term}
      </Link>
      <span
        role="tooltip"
        id={tooltipId}
        ref={tooltipRef}
        data-brand-surface-id="surface:floating"
        // Hidden copy: excluded from the Pagefind index so search excerpts
        // never fuse the definition onto the surrounding prose.
        data-pagefind-ignore
        className="absolute bottom-full left-0 z-20 mb-1.5 hidden w-64 max-w-[calc(100vw-3rem)] rounded-sm border border-border bg-surface p-2.5 font-sans text-xs leading-relaxed text-text shadow-floating group-hover:block group-focus-within:block"
      >
        <span className="block font-medium">{term}</span>
        <span className="mt-0.5 block">{definition}</span>
      </span>
    </span>
  );
}
