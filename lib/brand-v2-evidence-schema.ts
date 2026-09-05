import { z } from 'zod';

/**
 * The shape gate every persisted browser artifact passes through before any
 * verdict is computed from it.
 *
 * A persisted sweep arrives as `unknown`: it is JSON read off disk, and the
 * process that reads it is not the process that wrote it. The readers used
 * to cross that boundary with a cast (`input.artifact as Partial<T>`), which
 * is a claim about the bytes rather than a check of them, and the verdicts
 * downstream read booleans by truthiness. The string `"false"` is a true
 * value, so an artifact carrying `"inert": "false"` on every background
 * region satisfied a clause that requires every region to be inert, and the
 * only thing standing between that artifact and a green row was the
 * fingerprint.
 *
 * So the complete nested shape, down to the primitive type of every leaf, is
 * settled here first. The declared return type of each reader is the second
 * half of the check: a schema that omits a field, or types one loosely,
 * produces an inferred type that no longer satisfies the reader's return
 * type, so the omission is a typecheck failure rather than a hole that opens
 * at run time on an artifact nobody has written yet.
 *
 * `z.any()` is deliberately absent from these schemas. It infers `any`,
 * which satisfies every declared type, so it would pass the compile-time
 * half while checking nothing at run time.
 */
export function parseEvidenceArtifact<Schema extends z.ZodTypeAny>(
  schema: Schema,
  artifact: unknown,
  label: string,
): z.infer<Schema> {
  const result = schema.safeParse(artifact);
  if (result.success) return result.data;
  const issues = result.error.issues
    .slice(0, 6)
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`);
  throw new Error(
    `${label} does not have the shape its reader requires (${result.error.issues.length} issue(s)): ${issues.join('; ')}`,
  );
}

/** A JSON object whose values are all strings, keyed by an arbitrary name. */
export const stringRecordSchema = z.record(z.string(), z.string());

/** A JSON object whose values are all numbers, keyed by an arbitrary name. */
export const numberRecordSchema = z.record(z.string(), z.number());
