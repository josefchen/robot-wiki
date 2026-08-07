'use client';

import { useEffect, useRef, useState } from 'react';

type CopyButtonProps = {
  text: string;
};

export function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy code to clipboard"
      className="cursor-pointer rounded-xs border border-border bg-surface px-2 py-0.5 font-mono text-[11px] text-text-dim transition-colors hover:border-border-strong hover:text-text active:translate-y-[1px]"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
