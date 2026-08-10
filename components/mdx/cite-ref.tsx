import { Cite } from '@/components/ui/cite';
import { citationLabel, citationMeta, getCitation } from '@/data/citations';

/**
 * Registry-backed citation resolver for MDX. Content authors write
 * <Cite id="act-aloha-2023" />; this component maps the id to the citation
 * registry and renders the presentational Cite primitive with explicit props.
 * The primitive itself stays untouched.
 */
export function CiteRef({ id }: { id: string }) {
  const citation = getCitation(id);
  if (!citation) {
    // Unreachable in shipped content: scripts/validate-content.ts fails the
    // prebuild gate on unknown citation ids. Defensive fallback only.
    return (
      <span className="inline-flex items-center rounded-xs border border-err px-1.5 font-mono text-[0.72em] leading-5 text-err">
        missing citation: {id}
      </span>
    );
  }
  return (
    <Cite
      citeId={id}
      href={citation.url}
      label={citationLabel(citation)}
      title={citation.title}
      meta={citationMeta(citation)}
      referenceHref={`#ref-${id}`}
    />
  );
}
