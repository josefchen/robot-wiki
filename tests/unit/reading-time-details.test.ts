import { describe, expect, it } from 'vitest';
import { countVisibleWords } from '@/lib/reading-time';

/**
 * Ground truth for disclosure handling in the reading-time walker
 * (VAL-EDU-001/002/003). Every expected number below was measured in
 * headless Chromium on 2026-08-19 by rendering the exact fragment inside
 * an `article .prose` container and tokenizing the container's innerText
 * on whitespace. The walker must agree with the browser it approximates,
 * so green means agreement with Chromium, not with the walker's own
 * previous output.
 *
 * Both directions are encoded on purpose. A walker that skipped every
 * <details> unconditionally passes the closed cases and fails the open
 * ones; a walker that never learned about <details> passes the open ones
 * and fails the closed ones. VAL-EDU-002 is proved by exactly this flip,
 * so the closed and open forms of one markup must differ by the body
 * word count and nothing else.
 */

describe('countVisibleWords: disclosures mirror Chromium innerText', () => {
  it('counts only the summary of a closed disclosure, excluding its body', () => {
    // Chromium innerText: "intro two words\n\nsum one two\n\noutro two
    // words" = 9 tokens. The 6-token body is absent by construction
    // (content-visibility on the closed slot).
    const markup =
      '<p>intro two words</p>' +
      '<details><summary>sum one two</summary>' +
      '<div><p>body one two three four five</p></div>' +
      '</details>' +
      '<p>outro two words</p>';
    expect(countVisibleWords(markup)).toBe(9);
  });

  it('counts a disclosure with a bare open attribute in full', () => {
    // Measured 15 tokens: the body joins the summary and the prose.
    const markup =
      '<p>intro two words</p>' +
      '<details open><summary>sum one two</summary>' +
      '<div><p>body one two three four five</p></div>' +
      '</details>' +
      '<p>outro two words</p>';
    expect(countVisibleWords(markup)).toBe(15);
  });

  it('counts a disclosure with open="" (the react-dom/server form) in full', () => {
    // Same measured count as the bare form: React emits open="" for
    // open={true}, so both spellings must read as open.
    const markup =
      '<p>intro two words</p>' +
      '<details open=""><summary>sum one two</summary>' +
      '<div><p>body one two three four five</p></div>' +
      '</details>' +
      '<p>outro two words</p>';
    expect(countVisibleWords(markup)).toBe(15);
  });

  it('judges a disclosure nested in an open one on its own state', () => {
    // Measured 14 tokens: the inner summary renders (3), the inner body
    // does not (5 excluded), everything else counts. A chart data
    // disclosure inside an opened reveal has exactly this shape.
    const markup =
      '<details open><summary>outer head two</summary>' +
      '<p>outer body three words</p>' +
      '<details><summary>inner head two</summary>' +
      '<p>inner body four hidden words</p></details>' +
      '<p>outer tail two words</p></details>';
    expect(countVisibleWords(markup)).toBe(14);
  });

  it('hides an open disclosure nested inside a closed one entirely', () => {
    // Measured 3 tokens: only the outer summary. The open attribute on
    // the inner element cannot un-hide content inside a closed outer
    // body; Chromium drops the whole nested subtree.
    const markup =
      '<details><summary>outer head two</summary>' +
      '<p>outer body three words</p>' +
      '<details open><summary>inner head two</summary>' +
      '<p>inner body four words</p></details></details>';
    expect(countVisibleWords(markup)).toBe(3);
  });

  it('counts a closed disclosure with no summary as nothing', () => {
    // Measured 4 tokens: no summary means nothing of the disclosure
    // renders at rest.
    const markup =
      '<p>lead two</p><details><p>hidden body three words</p></details><p>tail two</p>';
    expect(countVisibleWords(markup)).toBe(4);
  });

  it('counts summary prose with inline markup like any other prose', () => {
    // Measured 3 tokens ("bold second third"); the body stays excluded.
    const markup =
      '<details><summary>bold <strong>second</strong> third</summary>' +
      '<p>hidden four five six</p></details>';
    expect(countVisibleWords(markup)).toBe(3);
  });

  it('excludes loose text before and after the summary of a closed disclosure', () => {
    // Measured 2 tokens: only "only summary". Direct text children of a
    // closed details live in the hidden slot too, not only elements.
    const markup =
      '<details>loose hidden<summary>only summary</summary>tail hidden</details>';
    expect(countVisibleWords(markup)).toBe(2);
  });

  it('does not read the word open inside an attribute value as the open attribute', () => {
    // Measured 5 tokens: the disclosure stays closed despite
    // aria-label="press open to expand" and class="open disclosure".
    // Attribute names are matched, not substrings of the tag.
    const markup =
      '<p>lead two</p>' +
      '<details aria-label="press open to expand" class="open disclosure">' +
      '<summary>sum</summary><p>hidden words must not count</p></details>' +
      '<p>tail two</p>';
    expect(countVisibleWords(markup)).toBe(5);
  });

  it('judges sibling disclosures independently', () => {
    // Measured 7 tokens: first summary only, second in full.
    const markup =
      '<details><summary>first head</summary><p>first hidden body</p></details>' +
      '<details open><summary>second head</summary><p>second visible body</p></details>';
    expect(countVisibleWords(markup)).toBe(7);
  });

  it('still applies resting-hidden rules inside an open disclosure', () => {
    // Measured 5 tokens: open counts the body, and the hidden attribute
    // still excludes its own subtree inside it. Disclosure state and
    // resting-hidden state compose rather than override.
    const markup =
      '<details open><summary>head two</summary>' +
      '<p>shown three words</p><p hidden>hidden four words</p></details>';
    expect(countVisibleWords(markup)).toBe(5);
  });

  it('counts only the FIRST direct-child summary of a closed disclosure', () => {
    // Measured in headless Chromium 2026-08-19 (visual-details-summary-probe):
    // innerText "alpha beta", 2 tokens. Chromium renders only the first
    // direct-child <summary> of a closed <details>; the second is absent.
    // The orchestrator's independent measurement returned the same numbers.
    const markup =
      '<details><summary>alpha beta</summary><summary>gamma delta</summary></details>';
    expect(countVisibleWords(markup)).toBe(2);
  });

  it('counts ALL direct-child summaries once the disclosure is open', () => {
    // Measured 4 tokens: an open details renders every direct-child
    // summary, so the closed-state cardinality rule must not leak into
    // the open state.
    const markup =
      '<details open><summary>alpha beta</summary><summary>gamma delta</summary></details>';
    expect(countVisibleWords(markup)).toBe(4);
  });

  it('counts only the first of three summaries in a closed disclosure', () => {
    // Measured 2 tokens ("s one"): with three direct-child summaries a
    // closed details still renders exactly the first one.
    const markup =
      '<details><summary>s one</summary><summary>s two</summary><summary>s three</summary></details>';
    expect(countVisibleWords(markup)).toBe(2);
  });

  it('ignores a leading <p> when finding the first summary of a closed disclosure', () => {
    // Measured 2 tokens ("s one"): a <p> before the summaries changes
    // nothing; the first direct-child summary still renders alone.
    const markup =
      '<details><p>p one two</p><summary>s one</summary><summary>s two</summary></details>';
    expect(countVisibleWords(markup)).toBe(2);
  });

  it('flips with the open attribute: the cheap experiment VAL-EDU-002 names', () => {
    // One attribute added to one shipped disclosure must move the count
    // by exactly the body's word count, in both directions. This is the
    // unit-scale shape of the build-level mutation proof.
    const body = '<div><p>body one two three four five</p></div>';
    const closed = `<details><summary>sum one two</summary>${body}</details>`;
    const open = `<details open><summary>sum one two</summary>${body}</details>`;
    const closedCount = countVisibleWords(closed);
    const openCount = countVisibleWords(open);
    expect(openCount - closedCount).toBe(6); // the body's six words
    expect(countVisibleWords(open) - countVisibleWords(closed)).toBe(6);
  });
});
