import { CopyButton } from '@/components/ui/copy-button';
import { scrollRegionAttributes } from '@/lib/scroll-region.mjs';

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
      className="my-8 overflow-hidden rounded-[7px] bg-surface-2"
    >
      <figcaption
        data-brand-surface-id="surface:flat"
        className="flex items-center justify-between px-6 pt-3"
      >
        <span className="font-mono text-xs text-text-dim">
          {title ?? language ?? 'code'}
        </span>
        <CopyButton text={code} />
      </figcaption>
      <pre
        {...scrollRegionAttributes({
          label: title ?? language ?? 'Code sample',
        })}
        className="overflow-x-auto px-6 pt-3 pb-5 font-mono text-[14px] leading-[23.1px] text-text"
      >
        <code>{code}</code>
      </pre>
    </figure>
  );
}
