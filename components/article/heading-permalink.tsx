'use client';

import { LinkSimple } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

/**
 * The copy-link control that rides on every article h2 and h3.
 *
 * The icon carries the affordance and the label lives in aria-label, so the
 * control contributes no rendered words to the prose region the build-time
 * reading-time measurement counts (scripts/measure-reading-times.ts). The
 * "Copied" confirmation is only mounted while it is showing, for the same
 * reason: at rest it is absent from the prerendered markup.
 *
 * The glyph is painted at rest rather than revealed on hover. It is the
 * non-colour half of the pair that says a heading addresses a section: the
 * other half is the signal-blue rule under the heading, and a reader who
 * cannot separate that blue from the text colour has nothing left if the
 * shape only appears under a pointer they may not have.
 */
export function HeadingPermalink({
  headingId,
  headingText,
}: {
  headingId: string;
  headingText: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    // The origin the page reports, so a pasted link resolves for whoever
    // receives it rather than pointing at the reader's own host.
    const href = `${window.location.origin}${window.location.pathname}#${headingId}`;
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <span className="relative inline-flex whitespace-nowrap align-middle">
      <button
        data-heading-permalink={headingId}
        data-pagefind-ignore
        type="button"
        onClick={copy}
        aria-label={`Copy link to this section, ${headingText}`}
        data-brand-control-id="control:secondary-action"
        // Painted at full strength rather than dimmed: a non-text graphic
        // has to clear 3:1 against the page in every state, and signal blue
        // held at 70% opacity over paper measures 2.2:1.
        className="ml-2 cursor-pointer text-accent transition-colors hover:text-ink"
      >
        <LinkSimple size={15} aria-hidden />
      </button>
      {copied ? (
        <span
          data-pagefind-ignore
          role="status"
          className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 font-mono text-[11px] font-normal tracking-normal text-accent"
        >
          Copied
        </span>
      ) : null}
    </span>
  );
}
