'use client';

import { useEffect, useId, useRef, useSyncExternalStore } from 'react';
import type { Company } from '@/data/schemas/company.ts';
import { CompanyDetail } from './company-card';

/** The one element every map tile, chart mark and timeline row controls. */
export const SHEET_ID = 'market-map-company';

/**
 * Phones and tablets get a modal bottom sheet; from 1024 px a side sheet
 * sits beside the map, which still has room to be read next to it.
 */
const PHONE_QUERY = '(max-width: 1023px)';

const TAB_STOPS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function subscribePhone(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(PHONE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function isPhone() {
  return typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches;
}

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

type CompanySheetProps = {
  company: Company;
  /** Bumped by every selection a reader makes; each bump moves focus in. */
  focusRequest: number;
  onClose: () => void;
};

/**
 * The detail view for the selected company.
 *
 * From 1024 px wide it is a side sheet: fixed to the right edge
 * under the site bar, paper with one hairline edge, and non-modal, so the
 * map, the chart and the timeline stay usable beside it and choosing
 * another company swaps its contents. Narrower, it is a bottom sheet over
 * an ink scrim, modal: focus stays inside it and the page behind does not
 * scroll. Both are role="dialog", named by the company heading.
 *
 * A selection made by the reader moves focus to that heading, so a screen
 * reader announces the company; a selection that arrives with the page
 * (a #company-<id> link) leaves focus where the page put it. Escape, the
 * Close button and the browser's Back button all close it (MarketMap owns
 * that, and returns focus to whatever opened it).
 */
export function CompanySheet({ company, focusRequest, onClose }: CompanySheetProps) {
  const headingId = `${useId()}-company`;
  const panelRef = useRef<HTMLDivElement>(null);
  const phone = useSyncExternalStore(subscribePhone, isPhone, () => false);

  // Move focus to the heading whenever the reader selects a company.
  useEffect(() => {
    if (focusRequest === 0) return;
    document.getElementById(headingId)?.focus({ preventScroll: true });
    panelRef.current?.scrollTo?.({ top: 0 });
  }, [focusRequest, headingId, company.id]);

  // A short settle on arrival: slide in from the edge the sheet lives on.
  // Transform and opacity only, and nothing at all under reduced motion.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || typeof panel.animate !== 'function' || prefersReducedMotion()) return;
    panel.animate(
      [
        { transform: phone ? 'translateY(24px)' : 'translateX(16px)', opacity: 0 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 200, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' },
    );
  }, [phone]);

  // Phones: hold focus inside the sheet and keep the page still behind it.
  useEffect(() => {
    if (!phone) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const stops = [...panel.querySelectorAll<HTMLElement>(TAB_STOPS)];
      if (stops.length === 0) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      const active = document.activeElement;
      const leaving = event.shiftKey ? active === first : active === last;
      if (leaving || !panel.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [phone]);

  const detail = <CompanyDetail company={company} headingId={headingId} onClose={onClose} />;

  if (phone) {
    return (
      <div
        id={SHEET_ID}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        data-company-sheet="bottom"
        data-pagefind-ignore
        className="fixed inset-0 z-50"
      >
        <div aria-hidden onClick={onClose} className="absolute inset-0 bg-ink/60" />
        <div
          ref={panelRef}
          className="absolute inset-x-0 bottom-0 max-h-[86dvh] overflow-y-auto overscroll-contain border-t border-border-strong bg-bg px-5 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))]"
        >
          {detail}
        </div>
      </div>
    );
  }

  return (
    <div
      id={SHEET_ID}
      role="dialog"
      aria-modal="false"
      aria-labelledby={headingId}
      data-company-sheet="side"
      data-pagefind-ignore
      className="fixed top-[var(--topbar-height)] right-0 bottom-0 z-30 w-[min(440px,100vw)]"
    >
      <div
        ref={panelRef}
        className="h-full overflow-y-auto overscroll-contain border-l border-border-strong bg-bg px-8 pt-7 pb-12"
      >
        {detail}
      </div>
    </div>
  );
}
