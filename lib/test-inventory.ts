export interface InventoryComparison {
  beforeCount: number;
  afterCount: number;
  added: Array<{ name: string; count: number }>;
  removed: Array<{ name: string; count: number }>;
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function compareCodePoints(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function inventoryEntry(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = normalizeWhitespace(value);
    return normalized.length > 0 ? normalized : null;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.id === 'string' && typeof record.title === 'string') {
    return `${normalizeWhitespace(record.id)}: ${normalizeWhitespace(record.title)}`;
  }
  for (const key of ['name', 'title', 'id']) {
    if (typeof record[key] === 'string') {
      return normalizeWhitespace(record[key]);
    }
  }
  return null;
}

function collectJsonEntries(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      const normalized = inventoryEntry(entry);
      return normalized ? [normalized] : collectJsonEntries(entry);
    });
  }
  if (!value || typeof value !== 'object') {
    return [];
  }

  const record = value as Record<string, unknown>;
  for (const key of ['assertions', 'tests', 'inventory', 'items']) {
    if (key in record) {
      return collectJsonEntries(record[key]);
    }
  }

  const normalized = inventoryEntry(record);
  return normalized ? [normalized] : [];
}

export function parseTestInventory(input: string): string[] {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return collectJsonEntries(parsed).sort(compareCodePoints);
  } catch {
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      throw new Error('Inventory looks like JSON but is not valid JSON.');
    }
    // Playwright's line reporter is intentionally plain text. Fall through.
  }

  const lines = trimmed.split(/\r?\n/);
  const playwrightEntries = lines
    .map((line) => line.trim())
    .filter((line) => /^\[[^\]]+\]\s+›\s+/.test(line))
    .map((line) =>
      normalizeWhitespace(
        line.replace(
          /^(\[[^\]]+\]\s+›\s+.+?):\d+:\d+(\s+›\s+)/,
          '$1$2',
        ),
      ),
    );

  const reportedTotal = lines
    .map((line) => line.trim().match(/^Total:\s+(\d+)\s+tests?\b/))
    .find((match) => match !== null);
  if (trimmed.startsWith('Listing tests:') || reportedTotal) {
    if (reportedTotal && Number(reportedTotal[1]) !== playwrightEntries.length) {
      throw new Error(
        `Playwright reported ${reportedTotal[1]} tests but ${playwrightEntries.length} names were parsed.`,
      );
    }
    return playwrightEntries.sort(compareCodePoints);
  }

  return trimmed
    .split(/\r?\n/)
    .map(normalizeWhitespace)
    .filter(
      (line) =>
        line.length > 0 &&
        !line.startsWith('#') &&
        !/^Total:\s+\d+\s+tests?\b/.test(line),
    )
    .sort(compareCodePoints);
}

export function compareTestInventories(
  before: readonly string[],
  after: readonly string[],
): InventoryComparison {
  const beforeCounts = new Map<string, number>();
  const afterCounts = new Map<string, number>();
  for (const name of before) {
    beforeCounts.set(name, (beforeCounts.get(name) ?? 0) + 1);
  }
  for (const name of after) {
    afterCounts.set(name, (afterCounts.get(name) ?? 0) + 1);
  }

  const names = [...new Set([...beforeCounts.keys(), ...afterCounts.keys()])]
    .sort(compareCodePoints);
  const added: InventoryComparison['added'] = [];
  const removed: InventoryComparison['removed'] = [];

  for (const name of names) {
    const difference =
      (afterCounts.get(name) ?? 0) - (beforeCounts.get(name) ?? 0);
    if (difference > 0) {
      added.push({ name, count: difference });
    } else if (difference < 0) {
      removed.push({ name, count: -difference });
    }
  }

  return {
    beforeCount: before.length,
    afterCount: after.length,
    added,
    removed,
  };
}

export function formatInventoryComparison(
  comparison: InventoryComparison,
): string {
  const drift = comparison.afterCount - comparison.beforeCount;
  const lines = [
    `Before: ${comparison.beforeCount}`,
    `After: ${comparison.afterCount}`,
    `Count drift: ${drift >= 0 ? '+' : ''}${drift}`,
  ];

  if (comparison.added.length === 0 && comparison.removed.length === 0) {
    lines.push('Inventories are equivalent.');
    return lines.join('\n');
  }

  if (comparison.added.length > 0) {
    lines.push('Added:');
    for (const entry of comparison.added) {
      lines.push(
        `+ ${entry.name} (${entry.count} occurrence${entry.count === 1 ? '' : 's'} added)`,
      );
    }
  }
  if (comparison.removed.length > 0) {
    lines.push('Removed:');
    for (const entry of comparison.removed) {
      lines.push(
        `- ${entry.name} (${entry.count} occurrence${entry.count === 1 ? '' : 's'} removed)`,
      );
    }
  }
  return lines.join('\n');
}
