import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { publishedModules } from '../data/modules.ts';
import {
  CONTENT_DATES_PATH,
  ROUTE_SOURCES,
  contentFilePath,
} from '../lib/content-dates.ts';
import {
  gitAddedAt,
  gitModifiedAt,
  gitModifiedAtAny,
  hasUncommittedChange,
  localIsoTimestamp,
} from '../lib/content-dates-git.ts';

// Rewrites data/content-dates.json from git history. An article or route
// whose source holds an uncommitted text change is stamped with the current
// time, so the commit that lands the change and the regenerated file agree to
// the day; rerun after committing to record the exact commit time.
const root = process.cwd();
const now = localIsoTimestamp(new Date());
const articles: Record<string, { published: string; modified: string }> = {};
const routes: Record<string, { modified: string }> = {};
const pending: string[] = [];

for (const { domain, slug } of [...publishedModules()].sort((left, right) =>
  `${left.domain}/${left.slug}`.localeCompare(`${right.domain}/${right.slug}`),
)) {
  const path = contentFilePath(domain, slug);
  const committed = gitModifiedAt(root, path);
  const uncommitted = hasUncommittedChange(root, path);
  if (uncommitted) pending.push(path);
  const modified = uncommitted || !committed ? now : committed;
  articles[`${domain}/${slug}`] = { published: gitAddedAt(root, path) ?? now, modified };
}

for (const [route, sources] of Object.entries(ROUTE_SOURCES)) {
  const committed = gitModifiedAtAny(root, sources);
  const dirty = sources.filter((source) => hasUncommittedChange(root, source));
  pending.push(...dirty.filter((source) => !pending.includes(source)));
  routes[route] = { modified: dirty.length > 0 || !committed ? now : committed };
}

writeFileSync(
  join(root, CONTENT_DATES_PATH),
  `${JSON.stringify({ articles, routes }, null, 2)}\n`,
);
console.log(
  `generate:content-dates: wrote ${Object.keys(articles).length} article dates and ${Object.keys(routes).length} route dates to ${CONTENT_DATES_PATH}`,
);
if (pending.length > 0) {
  console.log(
    `generate:content-dates: ${pending.length} source(s) carry uncommitted text and were stamped now; rerun after committing:\n  ${pending.join('\n  ')}`,
  );
}
