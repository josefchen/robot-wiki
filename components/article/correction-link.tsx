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
        className="text-accent underline decoration-border-strong underline-offset-2 hover:decoration-accent"
      >
        Report a content correction
      </a>
      .
    </p>
  );
}
