import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';

/** Real pointer/keyboard dismissal, not DOM/CSS removal or direct blur. */
export async function dismissReaderPopups(page: Page): Promise<void> {
  await page.mouse.move(2, 2);
  await page.keyboard.press('Escape');
  await page.getByRole('heading', { level: 1, name: 'Grasp Planning', exact: true }).click();
  await expect(page.getByRole('tooltip').filter({ visible: true })).toHaveCount(0);
}

type Glyph = { index: number; text: string; left: number; right: number; top: number; bottom: number };

/**
 * Every non-whitespace UTF-16 text position must occur in a fully visible,
 * hit-tested rectangle in at least one fixed-viewport capture. Tooltip and
 * hidden MathML text are excluded; displayed equations have separate proof.
 */
export async function captureReaderText(
  page: Page, node: Locator, label: string, info: TestInfo, scroll = true,
) {
  const inspect = async (hitTest: boolean) => node.evaluate((element, hit) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const glyphs: Array<Glyph & { unobstructed: boolean }> = [];
    let current: Node | null;
    let index = 0;
    let text = '';
    while ((current = walker.nextNode())) {
      const owner = current.parentElement!;
      if (owner.closest('.katex-mathml') ||
          (owner.closest('[role="tooltip"]') && element.getAttribute('role') !== 'tooltip')) continue;
      if (getComputedStyle(owner).visibility === 'hidden' || getComputedStyle(owner).display === 'none') continue;
      const value = current.textContent ?? '';
      text += value;
      for (let i = 0; i < value.length; i++, index++) {
        if (/\s/.test(value[i])) continue;
        const range = document.createRange();
        range.setStart(current, i);
        range.setEnd(current, i + 1);
        const r = range.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        const target = hit ? document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2) : null;
        glyphs.push({ index, text: value[i], left: r.left, right: r.right,
          top: r.top + scrollY, bottom: r.bottom + scrollY,
          unobstructed: !hit || target === owner || Boolean(target?.contains(owner)) });
      }
    }
    return { text, glyphs, scrollY, viewport: { width: innerWidth, height: innerHeight } };
  }, hitTest);
  await expect(node).toHaveCount(1);
  const original = await inspect(false);
  expect(original.glyphs.length, `${label}: real rendered text`).toBeGreaterThan(0);
  const covered = new Set<number>();
  const frames: Array<{ path: string; scrollY: number; indices: number[] }> = [];
  for (let frame = 0; covered.size < original.glyphs.length && frame < 30; frame++) {
    const next = original.glyphs.find(g => !covered.has(g.index))!;
    if (scroll) {
      await page.evaluate(y => window.scrollTo({ top: Math.max(0, y - 90), behavior: 'instant' }), next.top);
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    }
    const current = await inspect(true);
    expect(current.text).toBe(original.text);
    const visible = current.glyphs.filter(g =>
      g.top - current.scrollY >= 64 && g.bottom - current.scrollY <= current.viewport.height - 16 &&
      g.left >= 0 && g.right <= current.viewport.width && g.unobstructed);
    const newlyCovered = visible.filter(g => !covered.has(g.index));
    expect(newlyCovered.length, `${label}: slice must add unobstructed text`).toBeGreaterThan(0);
    const path = info.outputPath(`${label}-${String(frame + 1).padStart(2, '0')}.png`);
    await page.screenshot({ path });
    frames.push({ path, scrollY: current.scrollY, indices: visible.map(g => g.index) });
    for (const g of visible) covered.add(g.index);
    if (!scroll) break;
  }
  expect(covered.size, `${label}: every rendered non-whitespace position captured`).toBe(original.glyphs.length);
  return { label, text: original.text, glyphs: original.glyphs, covered: [...covered].sort((a, b) => a - b), frames };
}
