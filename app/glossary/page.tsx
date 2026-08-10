import type { Metadata } from 'next';
import { citationLabel, getCitation } from '@/data/citations';
import { glossaryTermsAlphabetical } from '@/data/glossary';

export const metadata: Metadata = {
  title: 'Glossary',
  description:
    'Cited definitions of the robotics and machine-learning terms used across robot-wiki.',
};

/**
 * The glossary index: every registered term, alphabetically, with its
 * definition and a link to each cited primary source. The same registry
 * records feed the inline <Term> tooltips, so this page and the inline
 * definitions are one source of truth (VAL-GLOSS-009). Each entry is
 * anchored at #<id>, which is where inline terms link.
 */
export default function GlossaryPage() {
  const terms = glossaryTermsAlphabetical();

  return (
    <div className="mx-auto w-full max-w-[65ch] px-6 py-12">
      <header>
        <h1 className="font-sans text-3xl font-semibold tracking-tight text-text">
          Glossary
        </h1>
        <p className="mt-2 font-mono text-xs text-text-dim">
          {terms.length} terms, every definition written from a cited primary
          source
        </p>
        <p className="mt-5 font-serif text-[1.0625rem] leading-relaxed text-text">
          Reference definitions for the jargon of modern robotics, each one
          written from a cited primary source. The articles mark these terms
          up inline; hovering or keyboard-focusing a marked term shows the
          same definition listed here.
        </p>
      </header>

      <ol className="mt-10 list-none border-t border-border">
        {terms.map((term) => {
          const sources = term.citations
            .map((id) => getCitation(id))
            .filter((c) => c !== undefined);
          return (
            <li
              key={term.id}
              id={term.id}
              data-glossary-term={term.id}
              className="scroll-mt-16 border-b border-border py-6 lg:scroll-mt-4"
            >
              <h2 className="font-sans text-lg font-semibold tracking-tight text-text">
                {term.term}
              </h2>
              <p className="mt-2 font-serif text-[1.0625rem] leading-relaxed text-text">
                {term.definition}
              </p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {sources.map((source) => (
                  <li key={source.id} className="flex flex-wrap items-baseline gap-x-2">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-words font-sans text-[13px] font-medium leading-snug text-text underline decoration-border-strong underline-offset-[3px] transition-colors hover:text-accent hover:decoration-accent"
                    >
                      {source.title}
                    </a>
                    <span className="shrink-0 font-mono text-[11px] text-text-dim">
                      {citationLabel(source)}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
