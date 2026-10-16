import { expect, type Locator } from '@playwright/test';

/**
 * Opens every closed `<details>` around `target`, outermost first, by its
 * own summary, the way a reader reaches the target. A figure's table can
 * sit in the figure's closed "How this was made" fold inside a closed
 * reveal, and a summary inside a closed parent is not clickable, so the
 * nearest disclosure alone is not enough. Returns how many were opened.
 */
export async function openClosedAncestorDetails(target: Locator): Promise<number> {
  const closed = target.locator('xpath=ancestor::details[not(@open)]');
  const outermost = target.locator(
    'xpath=ancestor::details[not(@open)][not(ancestor::details[not(@open)])]',
  );
  let opened = 0;
  for (let remaining = await closed.count(); remaining > 0; remaining -= 1) {
    await outermost.locator('xpath=./summary').click();
    await expect(closed).toHaveCount(remaining - 1);
    opened += 1;
  }
  return opened;
}
