'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/**
 * The fold in a rounds table: a control row after the rows shown, then the
 * rest of the rows in their own body, hidden until opened. Every row is in
 * the server HTML. The control sits before the folded rows, so the next Tab
 * after opening lands in the first of them. A link or hash to a folded row
 * opens the fold and scrolls the row into view.
 */
export function RoundsFold({
  id,
  shown,
  total,
  columns,
  children,
}: {
  /** The folded body's id, which the control names in aria-controls. */
  id: string;
  shown: number;
  total: number;
  /** The table's column count; the control cell spans them all. */
  columns: number;
  /** The folded rows. */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const body = useRef<HTMLTableSectionElement>(null);

  const reveal = useCallback((hash: string) => {
    const target = decodeURIComponent(hash.replace(/^#/, ''));
    if (!target) return false;
    const row = document.getElementById(target);
    if (!row || !body.current?.hidden || !body.current.contains(row)) return false;
    setOpen(true);
    setPending(target);
    return true;
  }, []);

  useEffect(() => {
    // A hash present on load can name a folded row.
    reveal(window.location.hash);
    const onHash = () => reveal(window.location.hash);
    // A second click on the same link after the fold was closed fires no hashchange.
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href^="#"]');
      if (link) reveal(link.getAttribute('href')!);
    };
    window.addEventListener('hashchange', onHash);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('hashchange', onHash);
      document.removeEventListener('click', onClick);
    };
  }, [reveal]);

  useLayoutEffect(() => {
    if (!open || !pending) return;
    document.getElementById(pending)?.scrollIntoView();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the scroll ran once the row was shown
    setPending(null);
  }, [open, pending]);

  return (
    <>
      <tbody data-rounds-fold-control="">
        <tr>
          <td colSpan={columns}>
            {/* Pinned at the cell's own inset, so a frame scrolled sideways does not clip the focus ring. */}
            <span className="sticky left-1 inline-block">
              <button
                data-brand-control-id="control:secondary-action"
                type="button"
                aria-expanded={open}
                aria-controls={id}
                onClick={() => setOpen((value) => !value)}
                className="inline-flex min-h-6 cursor-pointer items-center font-sans text-[13px] text-text-dim underline decoration-dotted decoration-border-strong underline-offset-[3px] hover:text-text hover:decoration-text-dim"
              >
                {open ? `Show the ${shown} newest` : `Show all ${total} rounds`}
              </button>
            </span>
          </td>
        </tr>
      </tbody>
      <tbody ref={body} id={id} data-rounds-folded="" hidden={!open}>
        {children}
      </tbody>
    </>
  );
}
