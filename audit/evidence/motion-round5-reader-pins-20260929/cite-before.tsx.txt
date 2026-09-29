'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';

type CiteProps = {
  /** Canonical URL of the source (arXiv, official docs, lab blog). */
  href: string;
  /** Short inline label, e.g. "Zhao 2023". */
  label: string;
  /** Full title of the source, shown in the hover/focus tooltip. */
  title: string;
  /** Authors, venue, year. Shown under the title in the tooltip. */
  meta?: string;
  /**
   * Citation registry id, exposed as data-cite-id so chips and References
   * entries can be reconciled. Omitted from the DOM when not given.
   */
  citeId?: string;
  /**
   * In-page anchor (#ref-<id>) of this citation's entry in the article's
   * References section. When set, the chip grows a second affordance that
   * jumps the reader to the full entry.
   */
  referenceHref?: string;
};

/**
 * Inline citation chip. The primary link goes out to the source; a tooltip
 * with the full reference appears on hover and on keyboard focus
 * (aria-describedby). With referenceHref set, a second in-chip affordance
 * jumps to the article's References entry for the same id.
 */
export function Cite({ href, label, title, meta, citeId, referenceHref }: CiteProps) {
  const tooltipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const revealed = (hovered || focused) && !dismissed;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const tip = tooltipRef.current;
    if (!root || !tip) return;
    if (!revealed) {
      tip.style.display = dismissed ? 'none' : '';
      tip.tabIndex = -1;
      return;
    }
    const viewport = window.visualViewport;
    const headers = [...document.querySelectorAll('header')];
    let frame = 0;
    // Like Term, prefer a fitting side, otherwise make the larger side
    // scrollable. The top layer additionally escapes table overflow and
    // transformed ancestors without moving the tooltip out of its DOM/ARIA
    // owner. Browsers without Popover retain fixed positioning and the
    // unhydrated HTML retains the existing CSS-only hover/focus fallback.
    tip.style.display = 'block';
    tip.style.position = 'fixed';
    tip.style.margin = '0';
    tip.style.right = 'auto';
    tip.style.bottom = 'auto';
    // Authored positioning wrappers remain useful for the no-JS fallback.
    // Measured coordinates supersede only their positioning, not byline,
    // typography, punctuation, width or source content.
    tip.style.translate = 'none';
    tip.style.transform = 'none';
    if (typeof tip.showPopover === 'function') {
      tip.setAttribute('popover', 'manual');
      tip.showPopover();
    }
    const place = () => {
      const rect = root.getBoundingClientRect();
      const scrollTop = tip.scrollTop;
      const vx = viewport?.offsetLeft ?? 0;
      const vy = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? (document.documentElement.clientWidth || window.innerWidth);
      const height = viewport?.height ?? window.innerHeight;
      tip.style.maxWidth = `min(calc(100vw - 3rem), ${Math.max(0, width - 24)}px)`;
      tip.style.maxHeight = 'none';
      const natural = tip.getBoundingClientRect();
      if (!natural.width || !natural.height) return;
      const left = Math.max(vx + 12, Math.min(rect.left, vx + width - natural.width - 12));
      let top = vy + 12;
      const bottom = vy + height - 12;
      for (const header of headers) {
        const style = getComputedStyle(header);
        const box = header.getBoundingClientRect();
        if (['sticky', 'fixed'].includes(style.position) &&
            style.visibility !== 'hidden' && box.width && box.height &&
            box.top <= vy + (parseFloat(style.top) || 0) &&
            box.right > left && box.left < left + natural.width) {
          top = Math.max(top, box.bottom + 12);
        }
      }
      const above = Math.max(0, Math.min(bottom, rect.top - 6) - top);
      const below = Math.max(0, bottom - Math.max(top, rect.bottom + 6));
      const useAbove = natural.height <= above || (natural.height > below && above >= below);
      const available = useAbove ? above : below;
      const y = useAbove
        ? Math.max(top, Math.min(bottom, rect.top - 6) - Math.min(natural.height, available))
        : Math.max(top, rect.bottom + 6);
      tip.style.left = `${left}px`;
      tip.style.top = `${y}px`;
      tip.style.maxHeight = `${available}px`;
      tip.style.overflowY = 'auto';
      tip.style.overflowWrap = 'anywhere';
      tip.style.overscrollBehavior = 'contain';
      tip.tabIndex = natural.height > available ? 0 : -1;
      tip.scrollTop = scrollTop;
    };
    const schedule = (event?: Event) => {
      if (event?.target === tip || frame) return;
      frame = requestAnimationFrame(() => { frame = 0; place(); });
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // A scrolling tooltip must not leave focus on a hidden element.
      if (document.activeElement === tip) root.querySelector('a')?.focus({ preventScroll: true });
      setDismissed(true);
    };
    place();
    const observer = new ResizeObserver(() => schedule());
    for (const element of [root, tip, ...tip.children, ...headers]) observer.observe(element);
    window.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    viewport?.addEventListener('resize', schedule);
    document.addEventListener('keydown', escape);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      viewport?.removeEventListener('resize', schedule);
      document.removeEventListener('keydown', escape);
      if (tip.hasAttribute('popover')) {
        tip.hidePopover();
        tip.removeAttribute('popover');
      }
      tip.style.display = '';
      tip.tabIndex = -1;
    };
  }, [revealed, dismissed, title, meta]);

  useLayoutEffect(() => () => clearTimeout(leaveTimer.current), []);

  return (
    <span
      ref={rootRef}
      onMouseEnter={() => {
        clearTimeout(leaveTimer.current);
        setHovered(true);
        setDismissed(false);
      }}
      onMouseLeave={() => {
        // Allow traversal of the 6px gap, including a horizontally clamped
        // popup outside a scrollable table. Focus is independent of pointer.
        leaveTimer.current = setTimeout(() => setHovered(false), 120);
      }}
      onFocus={(event) => {
        setFocused(true);
        if (!event.currentTarget.contains(event.relatedTarget)) setDismissed(false);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      {...(citeId ? { 'data-cite-id': citeId } : {})}
      className="group relative inline-block align-baseline"
    >
      <span
        data-brand-surface-id="surface:flat"
        // max-w-full + whitespace-normal: the chip is wrapped in a
        // whitespace-nowrap span at build time to bind it to its trailing
        // punctuation, and white-space inherits. A long label such as an
        // organization name then cannot break and pushes the document wider
        // than a 375px viewport. The binding is what has to hold, not the
        // label, so the label wraps inside the chip instead.
        className="inline-flex max-w-full items-stretch overflow-hidden rounded-xs border border-border bg-surface-2 font-mono text-[0.72em] leading-5 whitespace-normal transition-colors group-hover:border-accent group-focus-within:border-accent"
      >
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-describedby={tooltipId}
          data-brand-control-id="control:link-focus"
          className="inline-flex items-center px-1.5 text-text-dim no-underline transition-colors hover:bg-surface hover:text-accent"
        >
          {label}
        </a>
        {referenceHref ? (
          // data-pagefind-ignore on THIS anchor only: the ↓ glyph is pure
          // excerpt noise (search snippets read "2024↓."), while the chip
          // label link above must stay indexed. Index-only hint — the
          // anchor, its aria-label, and keyboard behavior are untouched.
          <a
            href={referenceHref}
            aria-label={`Jump to the full reference for ${title}`}
            data-pagefind-ignore
            data-brand-control-id="control:link-focus"
            className="inline-flex items-center border-l border-border px-1 text-text-dim no-underline transition-colors hover:bg-surface hover:text-accent"
          >
            <span aria-hidden="true">↓</span>
          </a>
        ) : null}
      </span>
      <span
        ref={tooltipRef}
        tabIndex={-1}
        role="tooltip"
        id={tooltipId}
        data-brand-surface-id="surface:floating"
        data-brand-frame-depth="1"
        // Hidden copy: excluded from the Pagefind index so search excerpts
        // never fuse the reference title/authors onto the prose. The
        // aria-describedby wiring and complete readable text are untouched.
        // whitespace-normal: the chip is wrapped in a whitespace-nowrap span
        // at build time (lib/rehype-cite-punctuation.mjs) to bind it to its
        // trailing punctuation, and white-space inherits — without the reset
        // the fixed-width tooltip cannot wrap and its text overflows the box.
        data-pagefind-ignore
        className="absolute bottom-full left-0 z-20 mb-1.5 hidden w-64 max-w-[calc(100vw-3rem)] rounded-sm border border-border bg-surface p-2.5 font-sans text-xs leading-relaxed whitespace-normal text-text shadow-floating group-hover:block group-focus-within:block"
      >
        <span className="block font-medium">{title}</span>
        {meta ? (
          <span className="mt-0.5 block text-text-dim">{meta}</span>
        ) : null}
      </span>
    </span>
  );
}
