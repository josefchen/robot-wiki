'use client';

import { useSearchParams } from 'next/navigation';

/** Echoes the query carried in from the shell search box. */
export function SearchQuery() {
  const params = useSearchParams();
  const q = params.get('q');
  if (!q) return null;
  return (
    <p className="mt-4 font-mono text-sm text-text-dim">
      Query received: <span className="text-accent">{q}</span>
    </p>
  );
}
