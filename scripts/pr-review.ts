/**
 * CLI wrapper for the automated pull-request review (lib/pr-review.ts).
 *
 * Reads the diff between a base ref and a head ref, runs the diff-scoped
 * review rules from CONTRIBUTING.md over it, and either prints the review or
 * posts it on the pull request.
 *
 * Usage:
 *   npm run review:pr                     # HEAD against origin/main, print only
 *   npm run review:pr -- --base main      # explicit base
 *   npm run review:pr -- --json           # findings as JSON, for tooling
 *   npm run review:pr -- --strict         # exit 1 when a blocker is found
 *   node scripts/pr-review.ts --post      # post on the PR (CI; needs a token)
 *
 * Posting behaviour, so re-running on every push does not spam the thread:
 *   - one sticky summary comment, found by the marker in its body and
 *     updated in place;
 *   - inline review comments only for findings that are not already
 *     commented on the same file, line, and rule.
 *
 * Nothing here fails the workflow. A heuristic over a diff is wrong often
 * enough that a red check would train reviewers to ignore it, and the real
 * gates (typecheck, lint, test, validate:content, build) already fail loudly.
 * Zero dependencies beyond node builtins, so the CI job needs no install.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  formatReviewMarkdown,
  inlineFindings,
  parseUnifiedDiff,
  reviewChanges,
  countBySeverity,
  MAX_FINDINGS,
  REVIEW_MARKER,
  type ChangedFile,
  type ReviewFinding,
} from '../lib/pr-review.ts';

const root = join(import.meta.dirname, '..');

// --- Arguments and refs -----------------------------------------------------

interface Options {
  base: string;
  head: string;
  post: boolean;
  json: boolean;
  strict: boolean;
  pr: number | null;
}

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function gitOrNull(args: string[]): string | null {
  try {
    return git(args);
  } catch {
    return null;
  }
}

/** First ref that resolves, so the tool works in CI and in a local clone. */
function resolveBase(candidates: string[]): string {
  for (const candidate of candidates) {
    if (candidate && gitOrNull(['rev-parse', '--verify', '--quiet', candidate]) !== null) {
      return candidate;
    }
  }
  return 'HEAD~1';
}

function parseOptions(argv: string[]): Options {
  const value = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const baseRef = process.env.GITHUB_BASE_REF;
  const base =
    value('--base') ??
    resolveBase([
      baseRef ? `origin/${baseRef}` : '',
      baseRef ?? '',
      'origin/main',
      'main',
    ]);
  const prArg = value('--pr') ?? readEventPrNumber();
  return {
    base,
    head: value('--head') ?? 'HEAD',
    post: argv.includes('--post'),
    json: argv.includes('--json'),
    strict: argv.includes('--strict'),
    pr: prArg ? Number(prArg) : null,
  };
}

/** Pull request number from the Actions event payload, when running in CI. */
function readEventPrNumber(): string | undefined {
  const path = process.env.GITHUB_EVENT_PATH;
  if (!path || !existsSync(path)) return undefined;
  try {
    const event: unknown = JSON.parse(readFileSync(path, 'utf8'));
    const number = (event as { pull_request?: { number?: number } }).pull_request?.number;
    return number ? String(number) : undefined;
  } catch {
    return undefined;
  }
}

// --- Gathering the diff -----------------------------------------------------

/** Head-revision body of a changed file, from the ref or the working tree. */
function readBody(path: string, head: string): string {
  const fromRef = gitOrNull(['show', `${head}:${path}`]);
  if (fromRef !== null) return fromRef;
  const onDisk = join(root, path);
  return existsSync(onDisk) ? readFileSync(onDisk, 'utf8') : '';
}

function collectBodies(files: readonly ChangedFile[], head: string): Record<string, string> {
  const bodies: Record<string, string> = {};
  for (const file of files) {
    if (file.status === 'deleted') continue;
    bodies[file.path] = readBody(file.path, head);
  }
  return bodies;
}

// --- GitHub API -------------------------------------------------------------

interface GitHubComment {
  id: number;
  body?: string;
  path?: string;
  line?: number;
}

interface ApiResult<T> {
  status: number;
  data: T | null;
  error?: string;
}

/** Minimal REST client over fetch: five calls, no dependency. */
function githubApi(repo: string, token: string) {
  async function request<T>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
    const response = await fetch(`https://api.github.com${path}`, {
      method,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'x-github-api-version': '2022-11-28',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    if (!response.ok) {
      return { status: response.status, data: null, error: text.slice(0, 400) };
    }
    return { status: response.status, data: text ? (JSON.parse(text) as T) : null };
  }

  return {
    listReviewComments: (pr: number) =>
      request<GitHubComment[]>('GET', `/repos/${repo}/pulls/${pr}/comments?per_page=100`),
    listIssueComments: (pr: number) =>
      request<GitHubComment[]>('GET', `/repos/${repo}/issues/${pr}/comments?per_page=100`),
    createIssueComment: (pr: number, body: string) =>
      request('POST', `/repos/${repo}/issues/${pr}/comments`, { body }),
    updateIssueComment: (id: number, body: string) =>
      request('PATCH', `/repos/${repo}/issues/comments/${id}`, { body }),
    createReview: (pr: number, body: string, comments: unknown[]) =>
      request('POST', `/repos/${repo}/pulls/${pr}/reviews`, { event: 'COMMENT', body, comments }),
  };
}

/** Hidden marker on an inline comment, so a re-run recognises its own work. */
const inlineMarker = (rule: string) => `<!-- pr-review-rule:${rule} -->`;

const inlineKey = (path: string, line: number, rule: string) => `${path}:${line}:${rule}`;

/** Keys of inline findings already commented on this PR by an earlier run. */
function existingInlineKeys(comments: readonly GitHubComment[]): Set<string> {
  const keys = new Set<string>();
  for (const comment of comments) {
    const rule = /<!-- pr-review-rule:([a-z-]+) -->/.exec(comment.body ?? '')?.[1];
    if (rule && comment.path && comment.line) {
      keys.add(inlineKey(comment.path, comment.line, rule));
    }
  }
  return keys;
}

async function postReview(
  options: Options,
  findings: readonly ReviewFinding[],
  summary: string,
  files: readonly ChangedFile[],
): Promise<void> {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!repo || !token || !options.pr) {
    console.error(
      'pr-review: --post needs GITHUB_REPOSITORY, a token in GITHUB_TOKEN, and a PR number; printing only.',
    );
    return;
  }
  const api = githubApi(repo, token);

  // 1. Sticky summary comment: update in place when this pass already ran.
  const issueComments = await api.listIssueComments(options.pr);
  if (issueComments.error) {
    console.error(`pr-review: cannot read PR comments (${issueComments.status}); printing only.`);
    return;
  }
  const previous = (issueComments.data ?? []).find((comment) =>
    (comment.body ?? '').includes(REVIEW_MARKER),
  );
  const written = previous
    ? await api.updateIssueComment(previous.id, summary)
    : await api.createIssueComment(options.pr, summary);
  if (written.error) {
    console.error(`pr-review: cannot write the summary comment (${written.status}): ${written.error}`);
    return;
  }
  console.log(`pr-review: summary ${previous ? 'updated' : 'posted'} on #${options.pr}`);

  // 2. Inline comments for findings anchored to a line that is in the diff,
  //    skipping anything an earlier run already said in the same place.
  const addedLinesByPath = Object.fromEntries(
    files.map((file) => [file.path, file.addedLines.map((added) => added.line)]),
  );
  const reviewComments = await api.listReviewComments(options.pr);
  if (reviewComments.error) {
    console.error(
      `pr-review: cannot read review comments (${reviewComments.status}); skipping inline comments.`,
    );
    return;
  }
  const alreadySaid = existingInlineKeys(reviewComments.data ?? []);
  const pending = inlineFindings(findings, addedLinesByPath).filter(
    (finding) => !alreadySaid.has(inlineKey(finding.path, finding.line ?? 0, finding.rule)),
  );
  if (pending.length === 0) {
    console.log('pr-review: no new inline findings to post');
    return;
  }
  const review = await api.createReview(
    options.pr,
    'Inline findings from the automated review pass. See the summary comment for the full list and for what this pass checks.',
    pending.map((finding) => ({
      path: finding.path,
      line: finding.line,
      side: 'RIGHT',
      body: `${finding.message}\n\n\`[${finding.rule}]\` ${inlineMarker(finding.rule)}`,
    })),
  );
  if (review.error) {
    // A line can fall outside the diff GitHub sees (whitespace-only hunks,
    // rename detection). The summary comment already carries every finding.
    console.error(
      `pr-review: inline review rejected (${review.status}): ${review.error}\n` +
        'The findings are in the summary comment.',
    );
    return;
  }
  console.log(`pr-review: ${pending.length} inline comment(s) posted`);
}

// --- Main -------------------------------------------------------------------

const options = parseOptions(process.argv.slice(2));
const diff = git([
  'diff',
  '--no-color',
  '--unified=0',
  '--diff-filter=ACMRT',
  `${options.base}...${options.head}`,
]);
const files = parseUnifiedDiff(diff);
const bodies = collectBodies(files, options.head);
const all = reviewChanges({ files, bodies });
const findings = all.slice(0, MAX_FINDINGS);
const additions = files.reduce((total, file) => total + file.addedLines.length, 0);
const summary = formatReviewMarkdown(findings, {
  files: files.length,
  additions,
  base: options.base,
  head: options.head,
});

if (options.json) {
  console.log(JSON.stringify({ base: options.base, head: options.head, findings: all }, null, 2));
} else {
  console.log(summary);
  if (all.length > findings.length) {
    console.log(`\npr-review: ${all.length - findings.length} further finding(s) not reported.`);
  }
}

const stepSummary = process.env.GITHUB_STEP_SUMMARY;
if (stepSummary) appendFileSync(stepSummary, `${summary}\n`);

if (options.post) await postReview(options, findings, summary, files);

const counts = countBySeverity(all);
console.error(
  `pr-review: ${all.length} finding(s) over ${files.length} file(s) ` +
    `(${counts.blocker} blocker, ${counts.warning} warning, ${counts.note} note)`,
);
if (options.strict && counts.blocker > 0) process.exit(1);
