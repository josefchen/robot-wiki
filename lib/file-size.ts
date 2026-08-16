/**
 * File-size budgets for everything committed to the repo.
 *
 * Oversized files are the quiet failure mode of this repo: a 2000-line
 * interactive stops being reviewable, a hand-grown registry stops being
 * diffable, and a full-resolution photograph or mesh dropped into public/
 * inflates every clone and every static export forever. Git keeps such a
 * blob in history even after a later commit deletes it, so the cheap place
 * to catch it is before the commit.
 *
 * The budgets below are deliberately per-category, because "large" means
 * different things for a React component, a citation registry, and a JPEG.
 * Each rule carries the reason it exists; raising a limit is a reviewable
 * change to this file rather than an inline escape hatch.
 *
 * Pure decision logic lives here for unit testing (tests/unit/file-size.test.ts
 * also runs it over the real repo); the CLI wrapper carries the enumeration
 * and reporting (scripts/check-file-size.ts), wired into prebuild, the
 * pre-commit hook (.githooks/pre-commit), and CI
 * (.github/workflows/file-size.yml). ESLint's max-lines rule enforces the
 * source-code half of the same policy inside the editor.
 */
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const KIB = 1024;
export const MIB = 1024 * KIB;

/** One measured file, relative to the repo root, with forward slashes. */
export interface FileMeasurement {
  path: string;
  bytes: number;
  /** Line count, or null for a binary file, where lines are meaningless. */
  lines: number | null;
}

export interface SizeBudget {
  /** Category name, used in the failure message. */
  label: string;
  /** Why this category gets this budget. */
  reason: string;
  /** Repo-relative path prefixes (or exact paths) the rule covers. */
  paths?: string[];
  /** Lowercase extensions, with the dot, the rule covers. */
  extensions?: string[];
  /** Restricts the rule to text or to binary files. */
  kind?: 'text' | 'binary';
  /** Omitted where a line count carries no signal (binary, lockfile). */
  maxLines?: number;
  maxBytes: number;
}

export interface SizeViolation {
  path: string;
  budget: string;
  measure: 'lines' | 'bytes';
  actual: number;
  limit: number;
  /** One-line, human-readable report of the overage. */
  message: string;
}

/**
 * Ordered budgets; the first rule matching a path wins, so the
 * path-specific rules precede the extension and catch-all rules.
 */
export const SIZE_BUDGETS: SizeBudget[] = [
  {
    label: 'lockfile',
    reason:
      'npm generates it; its length tracks the dependency tree, not anything a reviewer edits',
    paths: ['package-lock.json'],
    maxBytes: 4 * MIB,
  },
  {
    label: 'vendored runtime asset',
    reason:
      'third-party build output shipped as published (the Draco decoder for GLTFLoader); it is not ours to shrink',
    paths: ['public/draco/'],
    maxBytes: MIB,
  },
  {
    label: 'data registry',
    reason:
      'append-only registries (citations, companies, glossary) grow with the number of sources; the cap catches a runaway generator, not normal growth',
    paths: ['data/'],
    maxLines: 6000,
    maxBytes: 256 * KIB,
  },
  {
    label: 'research dataset',
    reason:
      'structured source-of-truth data (research/04-market-map-companies.json feeds data/companies.ts); its length tracks the number of rows',
    paths: ['research/'],
    extensions: ['.json'],
    maxLines: 6000,
    maxBytes: 256 * KIB,
  },
  {
    label: 'research report',
    reason:
      'verbatim deep-research reports behind the content, kept as a read-only transparency trail',
    paths: ['research/'],
    maxLines: 1200,
    maxBytes: 192 * KIB,
  },
  {
    label: 'content article',
    reason:
      'an article longer than this should be split into two linked modules; readers and the search index both do better with focused pages',
    paths: ['content/'],
    maxLines: 500,
    maxBytes: 64 * KIB,
  },
  {
    label: 'test spec',
    reason:
      'specs run long because they set up fixtures, but a spec past this size is covering several features and should be split by feature',
    paths: ['tests/'],
    maxLines: 800,
    maxBytes: 128 * KIB,
  },
  {
    label: 'raster image',
    reason:
      'every image ships in the static export; past this size it needs downscaling or re-encoding to WebP/AVIF before it lands',
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.ico'],
    maxBytes: MIB,
  },
  {
    label: '3D asset',
    reason:
      'meshes are downloaded by the playground at runtime; Draco-compressed GLB stays well under this, so an overage means the compression step was skipped',
    extensions: ['.glb', '.gltf', '.bin', '.stl', '.dae', '.fbx', '.obj'],
    maxBytes: 512 * KIB,
  },
  {
    label: 'source file',
    reason:
      'a module past this length has stopped being one unit of work; ESLint max-lines enforces the same policy on code lines',
    extensions: ['.ts', '.tsx', '.mts', '.js', '.jsx', '.mjs', '.cjs', '.css'],
    maxLines: 700,
    maxBytes: 128 * KIB,
  },
  {
    label: 'binary file',
    reason: 'catch-all: a binary this large belongs in external storage, not in git history',
    kind: 'binary',
    maxBytes: MIB,
  },
  {
    label: 'text file',
    reason: 'catch-all for docs, fixtures, and configuration',
    kind: 'text',
    maxLines: 1200,
    maxBytes: 256 * KIB,
  },
];

/** Extension of a repo-relative path, lowercased, or '' when there is none. */
export function extensionOf(path: string): string {
  const name = path.slice(path.lastIndexOf('/') + 1);
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot).toLowerCase() : '';
}

/** The budget governing one file. Every path matches a rule (the catch-alls). */
export function budgetFor(path: string, kind: 'text' | 'binary' = 'text'): SizeBudget {
  const extension = extensionOf(path);
  const budget = SIZE_BUDGETS.find(
    (rule) =>
      (rule.kind === undefined || rule.kind === kind) &&
      (rule.paths === undefined ||
        rule.paths.some((prefix) => path === prefix || path.startsWith(prefix))) &&
      (rule.extensions === undefined || rule.extensions.includes(extension)),
  );
  // The two catch-alls make this unreachable; the throw keeps the return
  // type honest instead of leaking undefined into the caller.
  if (!budget) throw new Error(`no size budget covers ${path}`);
  return budget;
}

/** Lines in a text file, counting a final unterminated line. */
export function countLines(text: string): number {
  if (text.length === 0) return 0;
  const newlines = text.split('\n').length - 1;
  return text.endsWith('\n') ? newlines : newlines + 1;
}

/** True for a file git would treat as binary: a NUL byte early in the content. */
export function looksBinary(head: Buffer): boolean {
  return head.subarray(0, 8 * KIB).includes(0);
}

const humanBytes = (bytes: number): string =>
  bytes >= MIB
    ? `${(bytes / MIB).toFixed(2)} MiB`
    : bytes >= KIB
      ? `${Math.round(bytes / KIB)} KiB`
      : `${bytes} B`;

/** Every budget overage for one measured file (lines and bytes are independent). */
export function checkMeasurement(file: FileMeasurement): SizeViolation[] {
  const budget = budgetFor(file.path, file.lines === null ? 'binary' : 'text');
  const violations: SizeViolation[] = [];

  if (budget.maxLines !== undefined && file.lines !== null && file.lines > budget.maxLines) {
    violations.push({
      path: file.path,
      budget: budget.label,
      measure: 'lines',
      actual: file.lines,
      limit: budget.maxLines,
      message:
        `${file.path}: ${file.lines} lines exceeds the ${budget.maxLines}-line ` +
        `${budget.label} budget (${budget.reason})`,
    });
  }
  if (file.bytes > budget.maxBytes) {
    violations.push({
      path: file.path,
      budget: budget.label,
      measure: 'bytes',
      actual: file.bytes,
      limit: budget.maxBytes,
      message:
        `${file.path}: ${humanBytes(file.bytes)} exceeds the ${humanBytes(budget.maxBytes)} ` +
        `${budget.label} budget (${budget.reason})`,
    });
  }
  return violations;
}

/** Every violation across a set of measurements, in the order given. */
export function findSizeViolations(files: FileMeasurement[]): SizeViolation[] {
  return files.flatMap(checkMeasurement);
}

/** Measure one file from its bytes, whether they come from disk or the git index. */
export function measureContent(relativePath: string, content: Buffer): FileMeasurement {
  return {
    path: relativePath,
    bytes: content.byteLength,
    lines: looksBinary(content) ? null : countLines(content.toString('utf8')),
  };
}

/**
 * Measure one file on disk. Returns null when the path does not exist or is
 * not a regular file, so a deleted path or a submodule is skipped rather
 * than crashing the check.
 */
export function measureFile(root: string, relativePath: string): FileMeasurement | null {
  const absolute = join(root, relativePath);
  const stats = statSync(absolute, { throwIfNoEntry: false });
  if (!stats?.isFile()) return null;
  return measureContent(relativePath, readFileSync(absolute));
}
