import { describe, expect, it } from 'vitest';
import {
  compareTestInventories,
  formatInventoryComparison,
  parseTestInventory,
} from '@/lib/test-inventory';

const PLAYWRIGHT_LIST = `Listing tests:
  [chromium] › example.spec.ts:10:3 › outer suite › keeps the first assertion
  [chromium] › example.spec.ts:24:3 › outer suite › keeps the second assertion
Total: 2 tests in 1 file
`;

describe('parseTestInventory', () => {
  it('normalizes Playwright list output without source line drift', () => {
    expect(parseTestInventory(PLAYWRIGHT_LIST)).toEqual([
      '[chromium] › example.spec.ts › outer suite › keeps the first assertion',
      '[chromium] › example.spec.ts › outer suite › keeps the second assertion',
    ]);
  });

  it('rejects a Playwright total that disagrees with parsed reporter names', () => {
    expect(() =>
      parseTestInventory(PLAYWRIGHT_LIST.replace('Total: 2 tests', 'Total: 3 tests')),
    ).toThrow('Playwright reported 3 tests but 2 names were parsed');
  });

  it('preserves an empty Playwright inventory for the CLI to reject', () => {
    expect(
      parseTestInventory('Listing tests:\nTotal: 0 tests in 0 files\n'),
    ).toEqual([]);
  });

  it('does not silently reinterpret malformed JSON as line-delimited text', () => {
    expect(() => parseTestInventory('{"assertions": [')).toThrow(
      'looks like JSON but is not valid JSON',
    );
  });

  it('normalizes JSON assertion inventories deterministically', () => {
    expect(
      parseTestInventory(
        JSON.stringify({
          assertions: [
            { id: 'VAL-B2-002', title: 'Second assertion' },
            '  VAL-B2-001   First assertion ',
            { name: 'custom assertion' },
          ],
        }),
      ),
    ).toEqual([
      'VAL-B2-001 First assertion',
      'VAL-B2-002: Second assertion',
      'custom assertion',
    ]);
  });
});

describe('compareTestInventories', () => {
  it('reports added, removed, and duplicate-count drift in stable order', () => {
    const comparison = compareTestInventories(
      ['beta', 'alpha', 'duplicate', 'duplicate'],
      ['gamma', 'duplicate', 'beta'],
    );

    expect(comparison).toEqual({
      beforeCount: 4,
      afterCount: 3,
      added: [{ name: 'gamma', count: 1 }],
      removed: [
        { name: 'alpha', count: 1 },
        { name: 'duplicate', count: 1 },
      ],
    });
    expect(formatInventoryComparison(comparison)).toContain('Count drift: -1');
    expect(formatInventoryComparison(comparison)).toContain(
      '- duplicate (1 occurrence removed)',
    );
  });

  it('is equal only when names and multiplicities match', () => {
    expect(
      compareTestInventories(
        ['suite › one', 'suite › two'],
        ['suite › two', 'suite › one'],
      ),
    ).toEqual({
      beforeCount: 2,
      afterCount: 2,
      added: [],
      removed: [],
    });
  });

  it('catches a planted reporter-visible test deletion', () => {
    const before = parseTestInventory(PLAYWRIGHT_LIST);
    const plantedAfter = parseTestInventory(
      PLAYWRIGHT_LIST.replace(
        '  [chromium] › example.spec.ts:24:3 › outer suite › keeps the second assertion\n',
        '',
      ).replace('Total: 2 tests', 'Total: 1 test'),
    );

    expect(compareTestInventories(before, plantedAfter)).toEqual({
      beforeCount: 2,
      afterCount: 1,
      added: [],
      removed: [
        {
          name: '[chromium] › example.spec.ts › outer suite › keeps the second assertion',
          count: 1,
        },
      ],
    });
  });
});
