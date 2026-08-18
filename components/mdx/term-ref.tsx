import type { ReactNode } from 'react';
import { Term } from '@/components/ui/term';
import { getTerm } from '@/data/glossary';

/**
 * Registry-backed glossary resolver for MDX. Content authors write
 * <Term id="covariate-shift">covariate shift</Term>; this component maps
 * the id to the glossary registry and renders the presentational Term
 * primitive with the registry's definition, so the inline tooltip and the
 * /glossary entry can never diverge. The children are the
 * inline display text; the definition always comes from the registry.
 */
export function TermRef({ id, children }: { id: string; children?: ReactNode }) {
  const entry = getTerm(id);
  if (!entry) {
    // Unreachable in shipped content: scripts/validate-content.ts fails the
    // prebuild gate on unknown term ids. Defensive fallback only.
    return (
      <span className="inline-flex items-center rounded-xs border border-err px-1.5 font-mono text-[0.72em] leading-5 text-err">
        unknown term: {id}
      </span>
    );
  }
  return (
    <Term termId={id} term={entry.term} definition={entry.definition}>
      {children}
    </Term>
  );
}
