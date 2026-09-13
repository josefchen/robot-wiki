import { test, expect, type Page, type Locator } from './helpers/motion-planning-offline-fixture';
import type { TestInfo } from '@playwright/test';
import { writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import pinned from '../fixtures/term-consumer-identities.json' with { type: 'json' };
import { ownedEvidencePath } from './helpers/keypoint-reader-oracle';

const PROSE = 'div.prose[data-pagefind-body]';
// Literal reader expectations from the preserved article/registry. Not source certification.
const SOURCES = [
  { id: 'lozano-perez-1983', count: 2, title: 'Spatial Planning: A Configuration Space Approach', authors: ['Tomás Lozano-Pérez'], meta: 'Tomás Lozano-Pérez, IEEE Trans. Computers, 1983', url: 'https://doi.org/10.1109/TC.1983.1676196' },
  { id: 'lavalle-2006', count: 5, title: 'Planning Algorithms', authors: ['Steven M. LaValle'], meta: 'Steven M. LaValle, Cambridge University Press, 2006', url: 'https://lavalle.pl/planning/' },
  { id: 'lavalle-1998', count: 3, title: 'Rapidly-exploring Random Trees: A New Tool for Path Planning', authors: ['Steven M. LaValle'], meta: 'Steven M. LaValle, Iowa State University TR 98-11, 1998', url: 'https://lavalle.pl/papers/Lav98c.pdf' },
  { id: 'kavraki-1996', count: 1, title: 'Probabilistic Roadmaps for Path Planning in High-Dimensional Configuration Spaces', authors: ['Lydia E. Kavraki', 'P. Švestka', 'J.-C. Latombe', 'M. H. Overmars'], meta: 'Lydia E. Kavraki, P. Švestka, J.-C. Latombe et al., IEEE Trans. Robotics and Automation, 1996', url: 'https://doi.org/10.1109/70.508439' },
] as const;

function evidence(page: Page, info: TestInfo) {
  const states: object[] = [], root = process.env.ROBOT_WIKI_EVIDENCE_ROOT;
  const inputPath = process.env.ROBOT_WIKI_GATE_INPUTS!;
  const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
  const record = (state: object) => {
    states.push(state);
    writeFileSync(ownedEvidencePath(root, info.outputPath('closeout-states.json')), JSON.stringify({ title: info.title, viewport: page.viewportSize(), inputPath, inputSha256: hash(inputPath), states, limits: 'Offline reader proof only; no fresh source check, article acceptance, whole reference rubric, full accessibility profiles or release acceptance.' }, null, 2));
  };
  const capture = async (name: string, detail: object = {}) => {
    const path = ownedEvidencePath(root, info.outputPath(name + '.png'));
    await page.screenshot({ path, animations: 'disabled' });
    record({ name, path, sha256: hash(path), at: new Date().toISOString(), ...detail });
  };
  const clear = async () => {
    await page.mouse.move(1, page.viewportSize()!.height - 1);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await expect(page.locator(`${PROSE} [role="tooltip"]:visible`)).toHaveCount(0);
  };
  const slices = async (target: Locator, name: string, finalText?: string) => {
    await clear(); await target.scrollIntoViewIfNeeded();
    const box = (await target.boundingBox())!, viewport = page.viewportSize()!, top = 90, step = viewport.height - top - 24;
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    for (let offset = 0, index = 0; offset < box.height; offset += step, index++) {
      await target.evaluate((el, v) => window.scrollBy(0, el.getBoundingClientRect().top - v.top + v.offset), { top, offset });
      await capture(`${name}-${index}`, { offset, height: box.height });
    }
    if (finalText) {
      const geometry = await target.evaluate((el, text) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          if ((node.parentElement?.closest('[role="tooltip"],.katex-mathml'))) continue;
          const start = (node.textContent ?? '').indexOf(text);
          if (start < 0) continue;
          const range = document.createRange(); range.setStart(node, start); range.setEnd(node, start + text.length);
          return [...range.getClientRects()].map(r => ({ top: r.top, bottom: r.bottom, left: r.left, right: r.right }));
        }
        return [];
      }, finalText);
      expect(geometry.length).toBeGreaterThan(0);
      for (const rect of geometry) { expect(rect.top).toBeGreaterThanOrEqual(54); expect(rect.bottom).toBeLessThanOrEqual(viewport.height); expect(rect.left).toBeGreaterThanOrEqual(0); expect(rect.right).toBeLessThanOrEqual(viewport.width); }
      record({ name: `${name}-final-text`, finalText, geometry, verifiedReachable: true });
    }
  };
  const axe = async () => {
    const result = await new AxeBuilder({ page }).include('#main-content').analyze();
    record({ name: 'axe', violations: result.violations, incomplete: result.incomplete });
    expect(result.violations).toEqual([]);
  };
  return { record, capture, clear, slices, axe };
}
async function open(page: Page, route: string) {
  expect((await page.goto(route))?.status()).toBe(200);
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(el => Object.keys(el).some(k => k.startsWith('__reactFiber$'))));
  await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))); });
}

test('three foundation originals retain construction, density and probabilistic-completeness qualifications', async ({ page }, info) => {
  const e = evidence(page, info); await open(page, '/classical/motion-planning/');
  await expect(page.getByRole('heading', { level: 1, name: 'Motion Planning', exact: true })).toBeVisible();
  await expect(page.getByText('17 August 2026', { exact: true })).toBeVisible();
  const paragraphs = page.locator(`${PROSE} > p`);
  const construction = paragraphs.filter({ hasText: 'The difficulty is constructing the collision-constrained space' });
  await expect(construction).toHaveCount(1);
  for (const text of ['not a universal cutoff', 'constructive translational cases', 'PSPACE-hardness', 'unbounded', 'not an impossibility result for every seven-joint arm', 'validate entire local paths']) await expect(construction).toContainText(text);
  await e.slices(construction, 'construction-complexity', 'make efficient sampling difficult');
  const sampling = paragraphs.filter({ hasText: 'The probabilistic roadmap (PRM)' });
  await expect(sampling).toHaveCount(1); await expect(sampling).toContainText('validating local paths');
  await e.slices(sampling, 'sampling-module', 'plan many start-goal pairs against it');
  const convergence = paragraphs.filter({ hasText: 'Nearest-neighbor selection gives RRT an exploration bias' });
  await expect(convergence).toHaveCount(1);
  for (const text of ['planar holonomic example', 'larger Voronoi regions', 'infinite dense sample sequence', 'dense with probability one', 'not a guarantee of fast coverage on every problem', 'convergence-rate analysis open', 'not an assurance that an arbitrary existing path will be found', 'robust feasibility', 'positive clearance', 'independent uniform free-space samples', 'entire straight-line connections', '1-nearest sPRM counterexample is not probabilistically complete']) await expect(convergence).toContainText(text);
  await e.slices(convergence, 'voronoi-density-completeness', 'not probabilistically complete');
  const stats = page.locator(`${PROSE} > div.grid`);
  await expect(stats).toHaveCount(1);
  for (const text of ['RRT introduced', '1998', 'CHOMP', '2009', 'RRT* analysis', '2011', 'conditional theorem', '2D', '100 by 64 world, 5 obstacles']) await expect(stats).toContainText(text);
  await e.slices(stats, 'preserved-stats');
  e.record({ name: 'scope', correctedOriginals: [3, 6, 8], sourceOriginal5StillIncomplete: true, selfChecks: await page.locator('[data-self-check]').count(), authoredScientificTextChanged: false });
  await e.axe();
});

test('foundation citation chips keep intended short metadata and full References authors', async ({ page }, info) => {
  const e = evidence(page, info); await open(page, '/classical/motion-planning/');
  for (const source of SOURCES) {
    const roots = page.locator(`${PROSE} [data-cite-id="${source.id}"]`); await expect(roots).toHaveCount(source.count);
    for (let occurrence = 0; occurrence < source.count; occurrence++) {
      await e.clear(); const root = roots.nth(occurrence), anchor = root.locator('a').first(), tip = root.getByRole('tooltip');
      await root.scrollIntoViewIfNeeded(); await root.evaluate(el => window.scrollBy(0, el.getBoundingClientRect().top - innerHeight / 2));
      await anchor.focus(); await expect(tip).toBeVisible();
      await expect(tip.locator(':scope > span').nth(0)).toHaveText(source.title); await expect(tip.locator(':scope > span').nth(1)).toHaveText(source.meta);
      await expect(anchor).toHaveAttribute('href', source.url); await expect(anchor).toHaveAttribute('target', '_blank'); await expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');
      const box = (await tip.boundingBox())!, v = page.viewportSize()!;
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(v.width); expect(box.y).toBeGreaterThanOrEqual(54); expect(box.y + box.height).toBeLessThanOrEqual(v.height);
      const scroll = await tip.evaluate(el => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }));
      expect(scroll.scrollHeight).toBeLessThanOrEqual(scroll.clientHeight);
      await e.capture(`${source.id}-chip-${occurrence}`, { box, scroll, fullMetadataVisible: true });
      await page.keyboard.press('Escape'); await expect(tip).not.toBeVisible(); await expect(anchor).toBeFocused();
    }
    await e.clear(); const jump = roots.first().getByRole('link', { name: `Jump to the full reference for ${source.title}`, exact: true });
    await jump.focus(); await page.keyboard.press('Enter'); await expect(page).toHaveURL(new RegExp(`#ref-${source.id}$`));
    const reference = page.locator(`[data-reference-id="${source.id}"]`);
    await expect(reference.locator('[data-author-names]')).toHaveText(source.authors.join(', '));
    await expect(reference.getByRole('link', { name: source.title, exact: true })).toHaveAttribute('href', source.url);
    await e.slices(reference, `${source.id}-full-reference`, source.url);
    e.record({ name: 'reference-identity', id: source.id, authors: source.authors, allAuthorCount: source.authors.length, sourceFollowed: false });
    await page.goBack(); await expect(page).toHaveURL(/\/classical\/motion-planning\/$/);
    e.record({ name: 'back-focus-observation', id: source.id, focus: await page.evaluate(() => document.activeElement?.tagName), accepted: false });
  }
  await e.clear(); await e.axe();
});

test('competing-theses mounts the exact post-PI ordered Term population and changed paragraph', async ({ page }, info) => {
  const e = evidence(page, info), route = '/frontier/competing-theses/'; await open(page, route);
  const expected = pinned.articles.find(a => a.route === route)!;
  expect(expected.termIds).toEqual(['vision-language-action-model', 'world-model', 'scaling-law', 'whole-body-control', 'teleoperation']);
  const ids = await page.locator(`${PROSE} [data-term-id]`).evaluateAll(els => els.map(el => el.getAttribute('data-term-id')));
  expect(ids).toEqual(expected.termIds); await expect(page.locator(`${PROSE} [data-term-id="imitation-learning"]`)).toHaveCount(0);
  const paragraph = page.locator(`${PROSE} > p`).filter({ hasText: 'The generalist comparison is not an exclusivity result' });
  await expect(paragraph).toHaveCount(1);
  for (const text of ['one π0.7 model', 'evaluated laundry-folding, espresso-making, and box-building tasks', 'distilling Recap experience with strategy metadata', 'successful episodes per hour, not inference speed']) await expect(paragraph).toContainText(text);
  await e.slices(paragraph, 'thesis-replacement', 'another round of per-task training');
  const teleoperation = page.locator(`${PROSE} [data-term-id="teleoperation"]`);
  await e.slices(teleoperation.locator('..'), 'thesis-surviving-teleoperation');
  e.record({ name: 'mounted-identity', route, ids, removed: 'imitation-learning:1', shifted: { term: 'teleoperation:1', beforeOrdinal: 6, currentOrdinal: 5 }, sourceChangeCommit: '6af0bdd73375f8c121a8830df20e247ce5dd2c67', otherRoutesNotMountedByThisWitness: 46 });
  await e.axe();
});
