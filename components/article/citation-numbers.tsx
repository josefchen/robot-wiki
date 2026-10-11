'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * The article's citation numbering: each registry id mapped to its position
 * in the article's References list (1-based). The template provides it
 * around the body, so a citation's superscript and its sidenote carry the
 * same number as its bibliography entry. Outside an article there is no
 * numbering, and a citation renders as its author-year label.
 */
const CitationNumbers = createContext<Readonly<Record<string, number>> | null>(null);

export function CitationNumbersProvider({
  numbers,
  children,
}: {
  numbers: Readonly<Record<string, number>>;
  children: ReactNode;
}) {
  return <CitationNumbers.Provider value={numbers}>{children}</CitationNumbers.Provider>;
}

export function useCitationNumber(id: string | undefined): number | undefined {
  const numbers = useContext(CitationNumbers);
  return id ? numbers?.[id] : undefined;
}
