import { CopyButton } from '@/components/ui/copy-button';

type CodeBlockProps = {
  code: string;
  language?: string;
  /** Optional filename or label shown in the header bar. */
  title?: string;
};

/**
 * Fenced code block with a header bar (language/filename + copy control).
 * For MDX content, fenced blocks are syntax-highlighted by rehype-pretty-code
 * and styled via globals.css; this component is for hand-placed blocks.
 */
export function CodeBlock({ code, language, title }: CodeBlockProps) {
  return (
    <figure
      data-language={language}
      data-brand-surface-id="surface:flat"
      data-brand-frame-depth="1"
      data-brand-frame-interior-registered="code"
      className="my-6 overflow-hidden rounded-sm border border-border bg-surface"
    >
      <figcaption className="flex items-center justify-between border-b border-border bg-surface-2 px-3 py-1.5">
        <span className="font-mono text-xs text-text-dim">
          {title ?? language ?? 'code'}
        </span>
        <CopyButton text={code} />
      </figcaption>
      <pre className="overflow-x-auto p-3 font-mono text-[13px] leading-relaxed text-text">
        <code>{code}</code>
      </pre>
    </figure>
  );
}
