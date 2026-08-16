'use client';

import { useEffect, useState } from 'react';
import { parseEntityAnchor, type EntityAnchorKind } from '@/lib/entity-anchor';

/**
 * The entity id encoded in the current location hash, if it matches `kind`.
 * Hash is a browser event, so it is read after mount to keep SSR HTML stable.
 */
export function useEntityAnchor(kind: EntityAnchorKind): string | null {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    function read() {
      const parsed = parseEntityAnchor(window.location.hash);
      setId(parsed?.kind === kind ? parsed.id : null);
    }
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, [kind]);

  return id;
}
