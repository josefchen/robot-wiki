import { expect, test } from '@playwright/test';
import { measureFirstScreen } from './helpers/first-screen-measure';
import { findCue, populationFailures, type FirstScreenMount } from '../helpers/first-screen-contract';

const route = '/fixture/';
const names = { crossbody: 'CrossBody', controllab: 'ControlLab', laterlab: 'LaterLab' };
const fixture = (body: string) => `<main><div data-pagefind-body class="prose">${body}</div></main>`;
const cue = '<p>Try Translate between bodies. <a data-cite-id="fixture">Source</a></p>';

test('first-screen successor measures the visible stage rather than a closed fold SVG', async ({ page }) => {
  await page.setContent(fixture(`${cue}<figure data-figure-frame="cross-body">
    <button>Translate between bodies</button>
    <details><summary>Adjust more</summary><div>
      <svg id="hidden-stage" width="200" height="200"></svg><button>Hidden reset</button>
      <p>Try the hidden reset, which must never become the adjacent cue.</p>
    </div></details>
    <svg id="visible-stage" width="200" height="120"></svg>
  </figure><p>The next article paragraph.</p>`));
  const result = await page.evaluate(measureFirstScreen, { route, componentNames: names });
  const actualTop = await page.locator('#visible-stage').evaluate((element) => element.getBoundingClientRect().top + scrollY);
  expect(result?.first?.topEdge).toBe(actualTop);
  await expect(page.locator(result!.first!.regionSelector)).toHaveAttribute('data-figure-frame', 'cross-body');
  expect(result?.first?.controlLabels).toContain('Translate between bodies');
  expect(result?.first?.adjacentParagraphs.map((paragraph) => paragraph.text).join(' ')).not.toContain('hidden reset');
  expect(findCue(result!.first!.adjacentParagraphs.map((paragraph) => paragraph.text), result!.first!.controlLabels)?.control).toBe('Translate between bodies');
});

test('first-screen successor keeps an earlier control-only canvas ahead of a later SVG lab', async ({ page }) => {
  await page.setContent(fixture('<p>Try the Budget slider. <a data-cite-id="fixture">Source</a></p><section data-article-interactive="ControlLab"><label for="budget">Budget</label><input id="budget" type="range"><canvas></canvas></section><figure data-figure-frame="later-lab" style="margin-top:2000px"><button>Run later</button><svg width="200" height="120"></svg></figure>'));
  const result = await page.evaluate(measureFirstScreen, { route, componentNames: names });
  expect(result?.first?.mountId).toBe('mount:/fixture/:ControlLab:1');
  expect(result?.first?.topEdge).toBeNull();
  expect(result?.first?.noSvgReason).toContain('no rendered non-decorative SVG');
  expect(result?.mounts.map((mount) => mount.id)).toEqual(['mount:/fixture/:ControlLab:1', 'mount:/fixture/:LaterLab:1']);
});

test('first-screen successor rejects a removed mount and a marker whose controls were removed', async ({ page }) => {
  const html = fixture('<p>Try Run later. <a data-cite-id="fixture">Source</a></p><figure data-figure-frame="later-lab"><button>Run later</button><svg width="200" height="120"></svg></figure>');
  const expected: FirstScreenMount[] = [{ id: 'mount:/fixture/:LaterLab:1', identity: 'LaterLab', route, source: 'fixture registry', operable: true }];
  await page.setContent(html);
  const measure = () => page.evaluate(measureFirstScreen, { route, componentNames: names });
  expect(populationFailures([route], expected, [(await measure())!])).toEqual([]);
  await page.locator('button').evaluate((element) => element.remove());
  expect(populationFailures([route], expected, [(await measure())!])).not.toEqual([]);
  await page.setContent(html);
  await page.locator('figure').evaluate((element) => element.remove());
  expect(populationFailures([route], expected, [(await measure())!])).not.toEqual([]);
  await page.setContent(html);
  expect(populationFailures([route], [], [(await measure())!])).not.toEqual([]);
});

test('first-screen successor refuses an operating cue hidden in a closed reveal', async ({ page }) => {
  await page.setContent(fixture('<details><summary>Hidden cue</summary><p>Try Run later. <a data-cite-id="fixture">Source</a></p></details><figure data-figure-frame="later-lab"><button>Run later</button><svg width="200" height="120"></svg></figure>'));
  const before = await page.evaluate(measureFirstScreen, { route, componentNames: names });
  expect(findCue(before!.first!.adjacentParagraphs.map((paragraph) => paragraph.text), before!.first!.controlLabels)).toBeNull();
  await page.locator('summary').click();
  const after = await page.evaluate(measureFirstScreen, { route, componentNames: names });
  expect(findCue(after!.first!.adjacentParagraphs.map((paragraph) => paragraph.text), after!.first!.controlLabels)).not.toBeNull();
});

test('first-screen successor classifies only registered code-copy apparatus and preserves passive diagram identity', async ({ page }) => {
  await page.setContent(fixture('<div data-code-copy><button aria-label="Copy code to clipboard">Copy</button></div><figure data-figure-frame="example-diagram" data-figure-kind="original-schematic" data-image-id="example-diagram"><svg width="200" height="120"></svg></figure><figure data-figure-frame="later-lab"><button>Run later</button><svg width="200" height="120"></svg></figure>'));
  const before = await page.evaluate(measureFirstScreen, { route, componentNames: names });
  expect(before?.mounts[0]).toMatchObject({ id: 'mount:/fixture/:diagram:example-diagram:1', operable: false });
  expect(before?.first?.mountId).toBe('mount:/fixture/:LaterLab:1');
  expect(before?.unboundControls).toEqual([]);
  expect(before?.apparatusControls).toHaveLength(1);
  await page.locator('[data-code-copy]').evaluate((element) => element.removeAttribute('data-code-copy'));
  const withoutScope = await page.evaluate(measureFirstScreen, { route, componentNames: names });
  expect(withoutScope?.unboundControls).toEqual(['Copy code to clipboard']);
});

test('first-screen successor counts citation text under the real article selectors', async ({ page }) => {
  await page.setContent(`<style>.sidenote { display:none } .prose > p .sidenote { display:inline }</style>${fixture('<p>Body words <span class="sidenote">source label</span></p><figure data-figure-frame="later-lab"><button>Run later</button><svg width="200" height="120"></svg></figure>')}`);
  const result = await page.evaluate(measureFirstScreen, { route, componentNames: names });
  expect(result?.first?.precedingWords).toBe(4);
  // The old detached clone lost the .prose ancestor and silently dropped
  // the two citation words. The fixture makes that failure observable.
  const cloneWords = await page.locator('.prose > p').evaluate((paragraph) => {
    const holder = document.createElement('div');
    holder.append(paragraph.cloneNode(true));
    document.body.append(holder);
    const words = holder.innerText.trim().split(/\s+/).length;
    holder.remove();
    return words;
  });
  expect(cloneWords).toBe(2);
});
