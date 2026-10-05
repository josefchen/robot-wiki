/**
 * Plants three violations into a copy of the explainers and their
 * teach-back records, and fails unless the teach-back check exits non-zero
 * naming the explainer for each plant and exits zero on the clean copy.
 *
 *   node scripts/plant-teach-back.ts [--id arm]
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EXPLAINER_ORDER } from '../components/explainers/catalog.ts';
import { recordPath, SCENE_DIR, TEACH_BACK_DIR } from '../lib/teach-back.ts';

const args = process.argv.slice(2);
const at = args.indexOf('--id');
const id = at >= 0 && args[at + 1] ? args[at + 1] : EXPLAINER_ORDER[0].id;

function mirror(): string {
  const copy = mkdtempSync(join(tmpdir(), 'teach-back-plant-'));
  cpSync('components/explainers', join(copy, 'components/explainers'), { recursive: true });
  cpSync(TEACH_BACK_DIR, join(copy, TEACH_BACK_DIR), { recursive: true });
  return copy;
}

const PLANTS: { plant: string; apply: (base: string) => void }[] = [
  { plant: 'record deleted', apply: (base) => rmSync(join(base, recordPath(id))) },
  {
    plant: 'verdict flipped to fail',
    apply: (base) => {
      const file = join(base, recordPath(id));
      writeFileSync(file, readFileSync(file, 'utf8').replace('"verdict": "pass"', '"verdict": "fail"'));
    },
  },
  { plant: 'scene file edited', apply: (base) => appendFileSync(join(base, SCENE_DIR, `${id}.js`), '\n// planted edit\n') },
];

const check = (base: string) => spawnSync(process.execPath, ['scripts/check-teach-back.ts', '--root', base], { encoding: 'utf8' });
let failed = 0;
for (const { plant, apply } of PLANTS) {
  const base = mirror();
  try {
    apply(base);
    const run = check(base);
    const named = run.stderr.split('\n').some((line) => line.startsWith(`teach-back: #${id}:`));
    const ok = run.status !== 0 && named;
    if (!ok) failed += 1;
    console.log(`teach-back plant: ${ok ? 'caught' : 'MISSED'} ${plant} (exit ${run.status})`);
    for (const line of run.stderr.split('\n').filter(Boolean)) console.log(`  ${line}`);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}
const base = mirror();
try {
  const clean = check(base);
  if (clean.status !== 0) failed += 1;
  console.log(`teach-back plant: clean copy exits ${clean.status}`);
} finally {
  rmSync(base, { recursive: true, force: true });
}
console.log(`teach-back plant: ${failed ? 'FAIL' : 'ok'}`);
process.exit(failed ? 1 : 0);
