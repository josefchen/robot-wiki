'use client';

import { Copy } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';

type CopyButtonProps = {
  /**
   * The code to copy. Omitted, the button copies the code of the block it
   * sits in, read when it is pressed, so a highlighted fenced sample does
   * not carry a second copy of its source in the page.
   */
  text?: string;
};

const CODE_BLOCK =
  '[data-rehype-pretty-code-figure], [data-brand-frame-interior-registered="code"]';

/**
 * The copy control on a code block. Like the heading permalink it is an
 * icon with its label in aria-label, so it adds no rendered words to the
 * prose the reading-time measurement counts; the confirmation is a status
 * region that stays empty until the code is copied, so the label never
 * has to change and the name always holds whatever the button shows.
 */
export function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    const code =
      text ??
      button.current?.closest(CODE_BLOCK)?.querySelector('pre code')?.textContent ??
      '';
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <span data-pagefind-ignore className="inline-flex items-center gap-2">
      <span role="status" className="font-sans text-[11px] text-text-dim">
        {copied ? 'Copied' : ''}
      </span>
      <button
        ref={button}
        type="button"
        onClick={copy}
        aria-label="Copy code to clipboard"
        data-brand-control-id="control:secondary-action"
        className="inline-flex size-6 cursor-pointer items-center justify-center text-text-dim transition-colors hover:text-ink"
      >
        <Copy size={15} aria-hidden />
      </button>
    </span>
  );
}
