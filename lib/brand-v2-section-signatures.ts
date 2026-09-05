import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

/**
 * The approval registry behind the structural half of `VAL-B2-SHELL-006`
 * and `VAL-B2-COMP-016`: exactly which module signatures a surface may
 * declare, and what each one is for.
 *
 * The reading this replaces asked only whether a section declared a
 * non-empty `data-brand-module-signature`. That treats a string the markup
 * invents about itself as though it were a registered purpose: a section
 * could mint `plain/module-heading/whatever-i-am` and satisfy the check by
 * typing, and four sections built from one template could each type a
 * different string. The measured half of that hole is already closed — the
 * repetition bound of `VAL-B2-COMP-016` runs over surface, heading and
 * action form as rendered — but the declaration itself was still self-issued.
 *
 * So the signature is decided by an entry nobody can write from inside the
 * markup, exactly as `contract/brand-v2-asset-seal.json` decides which
 * artwork may ship. Every signature a surface may declare has a checked-in
 * entry naming the route it belongs to, an owner who answers for it, and the
 * purpose it exists to serve. Reconciliation runs in both directions:
 *
 * - a section declaring a signature nobody registered fails, so a new string
 *   is an unapproved signature rather than a new purpose;
 * - a section declaring nothing fails, since an unsignalled surface is not
 *   evidence of a considered structure;
 * - a registered signature no section renders fails, so the registry cannot
 *   accumulate approvals for structures the reader never meets.
 *
 * The registry says which purposes exist. It deliberately does not say what
 * a section measures as: `derivedSurfaceHeadingAction` is the measurement,
 * and the two are cross-checked (sections that measure alike must declare
 * one signature) precisely because neither is allowed to stand in for the
 * other.
 */
export const SECTION_SIGNATURE_REGISTRY_PATH =
  'contract/brand-v2-section-signature-registry.json';

const sectionSignatureSchema = z.object({
  /** The route whose surfaces may declare this signature. */
  route: z.string().regex(/^\/[\w/-]*$/),
  /** The exact `data-brand-module-signature` value. */
  signature: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*){2}$/),
  /** Who answers for this structure existing. */
  owner: z.string().min(1),
  /** What this structure is for, in the product's own terms. */
  purpose: z.string().min(24),
});

export const sectionSignatureRegistrySchema = z.object({
  schemaVersion: z.literal(1),
  signatures: z.array(sectionSignatureSchema).min(1),
});

export type SectionSignature = z.infer<typeof sectionSignatureSchema>;

export function readSectionSignatureRegistry(root: string): SectionSignature[] {
  const registry = sectionSignatureRegistrySchema.parse(
    JSON.parse(readFileSync(join(root, SECTION_SIGNATURE_REGISTRY_PATH), 'utf8')),
  );
  const keys = registry.signatures.map(
    ({ route, signature }) => `${route} ${signature}`,
  );
  const duplicated = [
    ...new Set(keys.filter((key, index) => keys.indexOf(key) !== index)),
  ].sort();
  if (duplicated.length > 0) {
    throw new Error(
      `${SECTION_SIGNATURE_REGISTRY_PATH} registers ${duplicated.join(', ')} more than once, so one signature carries two purposes`,
    );
  }
  return [...registry.signatures].sort((left, right) =>
    `${left.route} ${left.signature}`.localeCompare(
      `${right.route} ${right.signature}`,
    ),
  );
}

export type MeasuredSectionSignature = {
  label: string;
  signature: string | null;
};

/**
 * Reconciles the ordered signatures a route's sections declared against the
 * signatures registered for that route, in both directions. Returns one
 * failure string per discrepancy so a caller can attach them to the anchor
 * that owns the claim.
 */
export function reconcileSectionSignatures(input: {
  route: string;
  registry: readonly SectionSignature[];
  measured: readonly MeasuredSectionSignature[];
}): string[] {
  const failures: string[] = [];
  if (input.measured.length === 0) {
    return [
      `no section was measured on ${input.route}, so its signatures reconcile against nothing`,
    ];
  }
  const registered = input.registry.filter(
    ({ route }) => route === input.route,
  );
  if (registered.length === 0) {
    return [
      `${SECTION_SIGNATURE_REGISTRY_PATH} registers no section signature for ${input.route}, so every signature the page declares is unapproved`,
    ];
  }
  const approved = new Map(
    registered.map((entry) => [entry.signature, entry] as const),
  );
  const declared = new Set<string>();
  for (const section of input.measured) {
    const signature = section.signature?.trim() ?? '';
    if (signature.length === 0) {
      failures.push(
        `the "${section.label}" section on ${input.route} declares no module signature, so its structure is unregistered`,
      );
      continue;
    }
    declared.add(signature);
    if (!approved.has(signature)) {
      failures.push(
        `the "${section.label}" section declares the signature "${signature}", which ${SECTION_SIGNATURE_REGISTRY_PATH} does not register for ${input.route}: a section cannot mint a purpose by typing a new string`,
      );
    }
  }
  for (const entry of registered) {
    if (declared.has(entry.signature)) continue;
    failures.push(
      `${SECTION_SIGNATURE_REGISTRY_PATH} registers "${entry.signature}" for ${input.route} (${entry.purpose}), which no section on that route declares`,
    );
  }
  return failures;
}
