/**
 * The teach-back check (VAL-OPUS-044).
 *
 *   node scripts/check-teach-back.ts [--root .]
 *
 * Fails when an explainer in the catalogue has no teach-back record, a
 * verdict its measured answers do not give, a failing record without the
 * line citing the owner acceptance of 12 Oct 2026 and its residual unclear
 * words, a missing screenshot, a record that names a tool, model or vendor,
 * another registered takeaway, or a digest that no longer matches its scene
 * module and model files. Every message names the explainer.
 */
import { resolve } from 'node:path';
import { EXPLAINER_ORDER } from '../components/explainers/catalog.ts';
import { teachBackProblems } from '../lib/teach-back.ts';

const args = process.argv.slice(2);
const at = args.indexOf('--root');
const root = resolve(at >= 0 && args[at + 1] ? args[at + 1] : '.');

const problems: string[] = [];
for (const { id } of EXPLAINER_ORDER) problems.push(...(await teachBackProblems(root, id)));
for (const problem of problems) console.error(`teach-back: ${problem}`);
console.log(`teach-back: ${problems.length ? 'FAIL' : 'ok'}; ${EXPLAINER_ORDER.length} explainers, ${problems.length} problem(s)`);
process.exit(problems.length ? 1 : 0);
