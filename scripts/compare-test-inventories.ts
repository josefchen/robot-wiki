/**
 * Compare reporter-visible Playwright test lists or normalized assertion
 * inventories. Source line numbers are ignored; names and multiplicities are
 * not. Exit 1 means the visible contract drifted.
 */
import { readFile } from 'node:fs/promises';
import {
  compareTestInventories,
  formatInventoryComparison,
  parseTestInventory,
} from '../lib/test-inventory.ts';

const paths = process.argv.slice(2);
if (paths.length !== 2) {
  console.error(
    'Usage: npm run compare:test-inventories -- <before.txt|json> <after.txt|json>',
  );
  process.exit(2);
}

const [beforeText, afterText] = await Promise.all(
  paths.map((path) => readFile(path, 'utf8')),
);
const before = parseTestInventory(beforeText);
const after = parseTestInventory(afterText);
if (before.length === 0 || after.length === 0) {
  console.error(
    `compare-test-inventories: both inventories must be non-empty (before=${before.length}, after=${after.length})`,
  );
  process.exit(2);
}
const comparison = compareTestInventories(before, after);

console.log(formatInventoryComparison(comparison));
if (comparison.added.length > 0 || comparison.removed.length > 0) {
  process.exitCode = 1;
}
