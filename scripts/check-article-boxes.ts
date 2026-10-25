/**
 * Build gate for VAL-OPUS-151: no article under content/ mounts or imports a
 * Callout or Aside box. No allowlist and no exemption.
 *
 *   node scripts/check-article-boxes.ts [--content-dir <path>]
 */
import { join } from 'node:path';
import { boxUses } from '../lib/article-boxes.ts';

const root = process.cwd();
const at = process.argv.indexOf('--content-dir');
const contentDir = at >= 0 && process.argv[at + 1] ? process.argv[at + 1] : join(root, 'content');

const uses = boxUses(contentDir, root);
if (uses.length > 0) {
  console.error(`article-boxes: ${uses.length} Callout or Aside use(s) in article content:`);
  for (const use of uses) console.error(`  ${use}`);
  console.error('Keep a real, cited fact as one plain sentence, a caveat as a sentence or fold line, and cut a disclaimer.');
  process.exit(1);
}
console.log('article-boxes: OK (no Callout or Aside in any article)');
