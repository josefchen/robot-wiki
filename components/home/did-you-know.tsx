import Link from 'next/link';
import { Cite } from '@/components/ui/cite';
import { citationLabel, citationMeta, getCitation } from '@/data/citations';
import { DID_YOU_KNOW } from '@/data/did-you-know';

export const HOME_PROSE_LINK_CLASS =
  'text-accent underline decoration-border-strong underline-offset-2 hover:decoration-accent';

/**
 * The three facts, each linked to the article that states it and cited to
 * the same source that article cites. There is no References list on home,
 * so the chip links straight out to the source.
 */
export function DidYouKnow() {
  return (
    <ul className="mt-3 max-w-[65ch] space-y-2 leading-relaxed text-text">
      {DID_YOU_KNOW.map((fact) => {
        const citation = getCitation(fact.citationId);
        if (!citation) {
          throw new Error(`${fact.id} cites ${fact.citationId}, which data/citations.ts does not hold`);
        }
        // The fact's last plain word joins the chip and its full stop in
        // one unbreakable run, so no line holds the chip alone.
        const cut = fact.after.lastIndexOf(' ');
        const lastWord = fact.after.slice(cut + 1);
        return (
          <li key={fact.id} data-did-you-know={fact.id}>
            {fact.before}
            <Link
              data-brand-control-id="control:link-focus"
              href={`/${fact.domain}/${fact.slug}/`}
              className={HOME_PROSE_LINK_CLASS}
            >
              {fact.linked}
            </Link>
            {fact.after.slice(0, cut + 1)}
            {lastWord ? null : ' '}
            <span className="whitespace-nowrap">
              {lastWord ? `${lastWord} ` : null}
              <Cite
                citeId={fact.citationId}
                href={citation.url}
                label={citationLabel(citation)}
                title={citation.title}
                meta={citationMeta(citation)}
              />
              .
            </span>
          </li>
        );
      })}
    </ul>
  );
}
