/**
 * Destination anchors for structured-search click-through.
 * Search results land on `#company-<id>`, `#method-<id>`, or `#dataset-<id>`.
 */

export const ENTITY_ANCHOR_KINDS = ['company', 'method', 'dataset'] as const;

export type EntityAnchorKind = (typeof ENTITY_ANCHOR_KINDS)[number];

export type EntityAnchor = {
  kind: EntityAnchorKind;
  id: string;
};

/** Parse `#company-figure-ai` / `#method-act` / `#dataset-droid`. */
export function parseEntityAnchor(hash: string): EntityAnchor | null {
  const value = hash.startsWith('#') ? hash.slice(1) : hash;
  for (const kind of ENTITY_ANCHOR_KINDS) {
    const prefix = `${kind}-`;
    if (value.startsWith(prefix) && value.length > prefix.length) {
      return { kind, id: value.slice(prefix.length) };
    }
  }
  return null;
}

export function entityAnchorId(kind: EntityAnchorKind, id: string): string {
  return `${kind}-${id}`;
}
