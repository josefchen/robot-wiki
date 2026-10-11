import { expect, type Locator } from '@playwright/test';

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
