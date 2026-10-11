import { contentCorrectionUrl } from '@/lib/identity';

export function CorrectionLink({ articleTitle }: { articleTitle: string }) {
  return (
    <p
      data-pagefind-ignore
      className="mt-12 font-sans text-xs leading-relaxed text-text-dim"
    >
      Spot a factual error or missing qualification?{' '}
      <a
        data-brand-control-id="control:link-focus"
        href={contentCorrectionUrl(articleTitle)}
        target="_blank"
        rel="noopener"
        className="text-text underline decoration-border-strong underline-offset-2 hover:decoration-text"
      >
        Report a content correction
      </a>
      .
    </p>
  );
}
