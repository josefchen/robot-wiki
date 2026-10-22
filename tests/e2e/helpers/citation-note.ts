import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Citation sidenotes for the specs that read the retired citation tooltip.
 *
 * Owner-approved successor (Josef, 2026-10-10, the research-page standard):
 * a citation is a superscript number with a sidenote, and the hover/focus
 * tooltip chip is gone (components/ui/cite.tsx). The facts a spec read off
 * the chip and its tooltip are read here off the new parts instead, at the
 * same strength:
 *
 * - `mark` is the number link inside `sup.cite-mark`: the citation's focus
 *   stop, described by its note (aria-describedby) and pointing at the
 *   References entry (`#ref-<id>`).
 * - `note` is the `[data-sidenote]` element: the number, the author-year
 *   label, the title (`.sidenote-title`) and the venue (screen-reader text).
 *   It is the element that replaces `[role="tooltip"]`.
 * - `source` is the note's author-year link to the source URL, the old
 *   chip's primary link.
 *
 * A prose citation's note stands in the right margin at rest from 1200 px.
 * Everywhere else (narrow screens, tables, figures) the number opens the
 * note inline, and pressing it again closes it. Glossary `<Term>` tooltips
 * are unchanged and keep `role="tooltip"`.
 */
export const CITE_MARK = 'sup.cite-mark a';
export const CITE_NOTE = '[data-sidenote]';
export const CITE_SOURCE = '[data-sidenote] a[target="_blank"]';

export function citeParts(cite: Locator): { mark: Locator; note: Locator; source: Locator } {
  return {
    mark: cite.locator(CITE_MARK),
    note: cite.locator(CITE_NOTE),
    source: cite.locator(CITE_SOURCE),
  };
}

/** Whether the note stands in the margin (floated) rather than inline. */
export async function citeNoteInMargin(cite: Locator): Promise<boolean> {
  return cite.locator(CITE_NOTE).evaluate((note) => {
    const float = getComputedStyle(note).float;
    return float === 'left' || float === 'right';
  });
}

/**
 * Clicks the number where it is painted. The number's link also holds a
 * 1 px screen-reader word ("Source"), and the default click point can land
 * on that clipped box, where the paragraph takes the hit; aiming at the
 * link's own box keeps the real hit test on the number.
 */
export async function clickCiteMark(mark: Locator): Promise<void> {
  await mark.scrollIntoViewIfNeeded();
  const box = await mark.boundingBox();
  if (!box) throw new Error('citation number has no box');
  await mark.click({ position: { x: box.width / 2, y: box.height / 2 } });
}

/**
 * Shows the note the way a reader does: by keyboard (Enter on the focused
 * number) or by pointer (a click on the number). A note already standing in
 * the margin is visible at rest and is left as it is, because there the
 * number jumps to the References entry instead. Returns the visible note.
 */
export async function revealCiteNote(
  cite: Locator,
  via: 'keyboard' | 'pointer' = 'keyboard',
): Promise<Locator> {
  const { mark, note } = citeParts(cite);
  if (!(await note.isVisible())) {
    if (via === 'keyboard') {
      await mark.focus();
      await mark.press('Enter');
    } else {
      await clickCiteMark(mark);
    }
  }
  await expect(note).toBeVisible();
  return note;
}

/** Closes a note that was opened inline; a margin note stays where it is. */
export async function closeCiteNote(cite: Locator): Promise<void> {
  const { mark, note } = citeParts(cite);
  if ((await note.getAttribute('data-open')) === 'true') {
    await clickCiteMark(mark);
    await expect(note).toHaveAttribute('data-open', 'false');
  }
}

/**
 * The tooltip's pointer and keyboard dismissal, checked on its successor:
 * at 375 px the number opens the note inline, with the title the margin
 * keeps for screen readers now shown, and closes it again, by click and by
 * Enter, with focus kept on the number. Restores the viewport.
 */
export async function cycleInlineCiteNote(page: Page, cite: Locator): Promise<void> {
  const viewport = page.viewportSize()!;
  await page.setViewportSize({ width: 375, height: 812 });
  const { mark, note } = citeParts(cite);
  await mark.scrollIntoViewIfNeeded();
  await expect(note).toBeHidden();
  await revealCiteNote(cite, 'pointer');
  await expect(note).toHaveAttribute('data-open', 'true');
  await expect(note.locator('.sidenote-title')).toBeVisible();
  await closeCiteNote(cite);
  await expect(note).toBeHidden();
  await page.mouse.move(0, 0);
  await revealCiteNote(cite, 'keyboard');
  await expect(mark).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(note).toBeHidden();
  await expect(mark).toBeFocused();
  await page.setViewportSize(viewport);
}

/** The facts a reader spec read off the retired tooltip, for one source. */
export type CiteNoteFacts = { title: string; meta: string; url: string; label?: string };

/**
 * The tooltip's two lines and its trigger's attributes, read off the note
 * at the same strength. The tooltip's first span held the title and its
 * second the venue line. The note sets the title in `.sidenote-title` after
 * the author-year link (shown when the note opens inline, kept for
 * assistive technology in the margin) and keeps the venue line as
 * screen-reader text, so both are matched exactly there. The author-year
 * link is the source link the chip's trigger was, with the same href,
 * target and rel; the number that replaced the trigger as the keyboard
 * stop is described by the note, and the note's id is unique on the page.
 */
export async function expectCiteNoteFacts(page: Page, cite: Locator, facts: CiteNoteFacts): Promise<void> {
  const { mark, note, source } = citeParts(cite);
  await expect(note.locator('.sidenote-title')).toHaveText(`, ${facts.title}`);
  await expect(note.locator(':scope > .sr-only')).toHaveText(`. ${facts.meta}`);
  await expect(source).toHaveAttribute('href', facts.url);
  await expect(source).toHaveAttribute('target', '_blank');
  await expect(source).toHaveAttribute('rel', 'noopener noreferrer');
  if (facts.label !== undefined) await expect(source).toHaveText(facts.label);
  const id = await note.getAttribute('id');
  expect(id, 'the note carries an id').toBeTruthy();
  await expect(mark).toHaveAttribute('aria-describedby', id!);
  await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
}

/**
 * Shows the note by pointer or by keyboard, the two ways the tooltip
 * opened, and returns whether the note stands in the margin. From 1200 px
 * a prose note is in the margin at rest and stays there while its number
 * is pointed at or focused. Elsewhere the number opens it inline, by a
 * click (the pointer) or by Enter (the keyboard), with focus kept on the
 * number.
 */
export async function showCiteNote(page: Page, cite: Locator, mode: 'hover' | 'keyboard'): Promise<boolean> {
  const { mark, note } = citeParts(cite);
  const inMargin = await citeNoteInMargin(cite);
  const open = async () => (await note.getAttribute('data-open')) === 'true';
  if (mode === 'hover') {
    const box = await mark.boundingBox();
    if (!box) throw new Error('citation number has no box');
    await mark.hover({ position: { x: box.width / 2, y: box.height / 2 } });
    if (!inMargin && !(await open())) await clickCiteMark(mark);
  } else {
    await mark.focus();
    await expect(mark).toBeFocused();
    if (!inMargin && !(await open())) await page.keyboard.press('Enter');
    await expect(mark).toBeFocused();
  }
  await expect(note).toBeVisible();
  return inMargin;
}

/**
 * The tooltip's Escape, on its successor: an inline note closes when its
 * number is pressed again, by Enter with focus kept on the number or by a
 * click. A margin note has no open state to dismiss and stays at rest.
 */
export async function dismissCiteNote(page: Page, cite: Locator, mode: 'hover' | 'keyboard'): Promise<void> {
  const { mark, note } = citeParts(cite);
  if ((await note.getAttribute('data-open')) === 'true') {
    if (mode === 'keyboard') {
      await expect(mark).toBeFocused();
      await page.keyboard.press('Enter');
    } else {
      await clickCiteMark(mark);
    }
    await expect(note).toHaveAttribute('data-open', 'false');
    await expect(note).toBeHidden();
  }
  if (mode === 'keyboard') await expect(mark).toBeFocused();
}

/**
 * The tooltip's "Jump to the full reference" link, on its successor: the
 * number itself links to the References entry and jumps where its note
 * stands in the margin, from 1200 px. Narrower, the number opens the note
 * instead, so the jump is taken at 1280 px; the returned function restores
 * the viewport once the entry has been read.
 */
export async function jumpFromCiteMark(page: Page, cite: Locator, id: string): Promise<() => Promise<void>> {
  const viewport = page.viewportSize()!;
  const { mark } = citeParts(cite);
  await expect(mark).toHaveAttribute('href', `#ref-${id}`);
  await closeCiteNote(cite);
  const wide = await citeNoteInMargin(cite);
  if (!wide) {
    await page.setViewportSize({ width: 1280, height: viewport.height });
    await expect.poll(() => citeNoteInMargin(cite)).toBe(true);
  }
  await mark.focus();
  await expect(mark).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`#ref-${id}$`));
  return async () => {
    if (!wide) await page.setViewportSize(viewport);
  };
}

/**
 * The last visible words of a shown note and the note's own box, the
 * successor of the tooltip's end-of-text geometry. In the margin the note
 * is its number and label, the title being kept for assistive technology;
 * inline it also shows the title. Screen-reader-only text is clipped by
 * design and is not a visible end.
 */
export async function citeNoteEnd(note: Locator) {
  return note.evaluate((el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let last: Text | null = null;
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      const parent = node.parentElement!;
      const clipped = parent.closest('.sr-only') || getComputedStyle(parent).clipPath !== 'none' ||
        parent.getBoundingClientRect().width <= 1;
      if (!clipped && (node.textContent ?? '').trim()) last = node;
    }
    const text = last?.textContent ?? '';
    const range = document.createRange();
    if (last) { range.setStart(last, Math.max(0, text.length - 30)); range.setEnd(last, text.length); }
    const rects = last ? [...range.getClientRects()] : [];
    const panel = [...el.getClientRects()];
    const box = {
      top: Math.min(...panel.map((r) => r.top)), bottom: Math.max(...panel.map((r) => r.bottom)),
      left: Math.min(...panel.map((r) => r.left)), right: Math.max(...panel.map((r) => r.right)),
    };
    return {
      lastText: text.slice(-30), panel: box,
      rects: rects.map((r) => ({ top: r.top, bottom: r.bottom, left: r.left, right: r.right })),
      scrollHeight: el.scrollHeight, clientHeight: el.clientHeight,
    };
  });
}
