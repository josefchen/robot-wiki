/**
 * Crawls every internal href of every exported HTML page and fails on any
 * link that would redirect or not resolve on the static host.
 *
 *   node scripts/check-internal-links.ts [--root out]
 *
 * Exits 1 on any 308 or 404, and on an export with no HTML pages.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { JSDOM } from 'jsdom';
import {
  documentHrefs,
  formatLinkProblem,
  inspectPageLinks,
  type LinkProblem,
} from '../lib/internal-link-check.ts';
import { SITE_URL } from '../lib/site.ts';

const args = process.argv.slice(2);
const at = args.indexOf('--root');
const root = at >= 0 && args[at + 1] ? args[at + 1] : 'out';

function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '_next' ? [] : htmlFiles(path);
    return entry.name.endsWith('.html') ? [path] : [];
  });
}

function pageRoute(file: string): string {
  const path = `/${relative(root, file).split(sep).join('/')}`;
  return path.endsWith('/index.html') ? path.slice(0, -'index.html'.length) : path;
}

if (!existsSync(root)) {
  console.error(`internal-links: no export at ${root}; build it first`);
  process.exit(1);
}
const exists = (file: string) => {
  const path = join(root, file);
  return existsSync(path) && statSync(path).isFile();
};

const pages = htmlFiles(root).sort();
const problems: LinkProblem[] = [];
let links = 0;
for (const file of pages) {
  const hrefs = documentHrefs(new JSDOM(readFileSync(file, 'utf8')).window.document);
  links += hrefs.length;
  problems.push(...inspectPageLinks(pageRoute(file), hrefs, SITE_URL, exists));
}

for (const problem of problems) console.error(`internal-links: ${formatLinkProblem(problem)}`);
const redirects = problems.filter((problem) => problem.status === 308).length;
const failed = problems.length > 0 || pages.length === 0;
console.log(
  `internal-links: ${failed ? 'FAIL' : 'ok'}; ${pages.length} pages, ${links} hrefs, ` +
    `${redirects} redirecting, ${problems.length - redirects} unresolved`,
);
process.exit(failed ? 1 : 0);
