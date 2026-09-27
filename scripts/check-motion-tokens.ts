/**
 * Motion token check: interactive and scene files must take colours,
 * durations and easings from the motion tokens, never hard-code them.
 *
 * The binding rule (docs/design/motion-language.md): hard-coded hex values
 * in components/interactive/** and components/motion/** fail this check.
 * The only allowed colour literals live in the generated token artifacts:
 * motion-tokens.json itself, components/motion/motion-tokens.css,
 * lib/motion-tokens.ts and scripts/motion/motion_theme.py. Scenes use
 * var(--role-*) custom properties; UI micro-transitions keep the brand's
 * short timings, which is why brand transition utilities without explicit
 * duration or easing literals stay allowed.
 *
 *   npm run check:motion-tokens
 *
 * Exit code 1 lists every violation with file, line and rule.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');

const SCANNED_DIRECTORIES = [
  join(ROOT, 'components', 'interactive'),
  join(ROOT, 'components', 'motion'),
];

/** The one file allowed to carry colour literals under components/. */
const GENERATED_TOKEN_STYLESHEET = join(
  ROOT,
  'components',
  'motion',
  'motion-tokens.css',
);

export interface TokenViolation {
  file: string;
  line: number;
  rule: 'hex-colour' | 'colour-function' | 'easing' | 'duration';
  snippet: string;
}

interface Rule {
  id: TokenViolation['rule'];
  pattern: RegExp;
  /** Further excludes context the rule must not flag (id references). */
  except?: (line: string, match: string) => boolean;
}

const RULES: Rule[] = [
  {
    id: 'hex-colour',
    // 3-8 hex digits not followed by an identifier character, so clip-path
    // and use references (#write-clip) stay outside the rule.
    pattern: /#(?:[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?|[0-9a-fA-F]{3,4})(?![\w-])/g,
    except: (line, match) =>
      // url(#gradient) / href="#id" / aria-labelledby="#id" are references.
      new RegExp(`(?:url\\(|href\\s*=\\s*["']|url\\s*=\\s*["'])[^"')]*${
        match.replace('#', '\\#')
      }`).test(line) ||
      new RegExp(`["']${match.replace('#', '\\#')}$`).test(line.trim()),
  },
  {
    id: 'colour-function',
    pattern: /\b(?:rgba?|hsla?)\(/g,
  },
  {
    id: 'easing',
    pattern:
      /\bease-(?:in-out|in|out|linear)\b|cubic-bezier\s*\(|transition-timing-function|animation-timing-function/g,
  },
  {
    id: 'duration',
    pattern:
      /\btransition-duration\b|\banimation-duration\b|\bduration-\d|\bdelay-\d|\b\d+(?:\.\d+)?ms\b|\b\d+\.\d+s\b/g,
  },
];

/** Scans file contents for hard-coded colours, durations and easings. */
export function scanMotionSourcesForViolations(
  paths: string[],
  options: { exemptPaths: Set<string> },
): TokenViolation[] {
  const violations: TokenViolation[] = [];
  for (const path of paths) {
    if (options.exemptPaths.has(path)) continue;
    const text = readFileSync(path, 'utf8');
    const lines = text.split('\n');
    for (const rule of RULES) {
      for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
        const line = lines[lineNumber];
        rule.pattern.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = rule.pattern.exec(line)) !== null) {
          if (rule.except?.(line, match[0])) continue;
          violations.push({
            file: path,
            line: lineNumber + 1,
            rule: rule.id,
            snippet: line.trim().slice(0, 120),
          });
        }
      }
    }
  }
  return violations.sort(
    (a, b) => a.file.localeCompare(b.file) || a.line - b.line,
  );
}

function filesUnder(directory: string): string[] {
  let entries;
  try {
    entries = readdirSync(directory).sort();
  } catch {
    return [];
  }
  const output: string[] = [];
  for (const name of entries) {
    const path = join(directory, name);
    const stat = statSync(path);
    if (stat.isDirectory()) output.push(...filesUnder(path));
    else if (/\.(ts|tsx|css)$/.test(name)) output.push(path);
  }
  return output;
}

function main(): void {
  const paths = SCANNED_DIRECTORIES.flatMap((directory) => filesUnder(directory));
  if (paths.length === 0) {
    console.error('motion token check: no source files found to scan');
    process.exitCode = 1;
    return;
  }
  const violations = scanMotionSourcesForViolations(paths, {
    exemptPaths: new Set([GENERATED_TOKEN_STYLESHEET]),
  });
  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(
        `motion token check: ${violation.rule} at ${relative(
          ROOT,
          violation.file,
        )}:${violation.line}: ${violation.snippet}`,
      );
    }
    console.error(
      `motion token check: ${violations.length} violation(s); use the motion tokens (var(--role-*), var(--motion-*)) instead`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `motion token check: ${paths.length} files clean (tokens are the single source of truth)`,
  );
}

const isDirectRun =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) main();
