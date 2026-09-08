import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { getCitation } from '../../data/citations';
import { METHODS } from '../../data/methods';
import { HIERARCHY_SYSTEMS } from '../../lib/hierarchy-timescales';
import { expectedApparatusGraph } from '../../lib/brand-v2-apparatus-evidence';
import { missingOccurrences } from './source-reader-requirements';

// Current dev-render correction check, not static-export or release acceptance.
const transferProof = process.env.GO_HELIX_TRANSFER_PROOF === '1';
const graph = expectedApparatusGraph(process.cwd());
const changedIds = transferProof ? ['helix-2025', 'agibot-go2-2026', 'pi-human-to-robot-2025'] : ['open-x-embodiment-2023', 'gemini-robotics-15-2025', 'gemini-robotics-2-2026', 'skild-series-c-2026'];
const primary = transferProof ? ['generalist-policies', 'comparison-matrix', 'cross-embodiment', 'hierarchical', 'generalization', 'reliability-gap'] : ['vla-models', 'generalist-policies', 'comparison-matrix', 'cross-embodiment', 'hierarchical'];
const targets = readdirSync('content').flatMap(domain => readdirSync(join('content', domain)).filter(f => f.endsWith('.mdx')).flatMap(f => {
  const slug = f.slice(0, -4);
  const { data } = matter(readFileSync(join('content', domain, f), 'utf8'));
  const carriedIds = transferProof && ['comparison-matrix', 'generalization', 'reliability-gap'].includes(slug) ? ['open-x-embodiment-2023', 'gemini-robotics-2-2026'] : [];
  const ids = (data.citations as string[]).filter(id => [...changedIds, ...carriedIds].includes(id));
  return ids.length || primary.includes(slug) ? [{ route: `/${domain}/${slug}/`, slug, ids }] : [];
}));

for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  for (const target of targets) {
    test(`source reader ${target.slug} at ${viewport.width}`, async ({ page }, info) => {
      test.setTimeout(120_000);
      await page.setViewportSize(viewport);
      const errors: string[] = [];
      const consoleErrors: { text: string; location: unknown }[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error') consoleErrors.push({ text: message.text(), location: message.location() });
      });
      await page.goto(target.route);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ caret: 'initial', path: info.outputPath('article-top.png') });
      const expected = graph.get(target.route)!;
      expect(expected, 'route must have an independent source graph').toBeTruthy();
      const requiredChips = [...expected.citationMarkers, ...expected.componentCitationSites.map(site => site.id)];
      const observedChips = await page.locator('div.prose [data-cite-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-cite-id')!));
      expect(missingOccurrences(requiredChips, observedChips), 'required body/component citation occurrences').toEqual([]);
      const observedReferences = await page.locator('ol [data-reference-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-reference-id')!));
      expect(observedReferences, 'complete ordered bibliography').toEqual(expected.references);
      const requiredMethodSources = target.slug === 'comparison-matrix' ? METHODS.flatMap(method => [...method.sources]) : [];
      const observedMethodSources = await page.locator('[data-method-source-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-method-source-id')!));
      expect(missingOccurrences(requiredMethodSources, observedMethodSources), 'mounted method-source link occurrences').toEqual([]);
      const withoutChips = target.ids.filter(id => !requiredChips.includes(id));
      for (const id of withoutChips) expect(expected.furtherReading, 'source-derived further reading, not a model-name exclusion').toContain(id);
      const boxes = [];
      const citeIds = [...new Set([...target.ids, ...(target.slug === 'vla-models' ? ['openvla-oft-2025'] : [])])].filter(id => requiredChips.includes(id));
      for (const id of citeIds) {
        const chip = page.locator(`div.prose [data-cite-id="${id}"] a`).first();
        await expect(chip).toHaveCount(1);
        await chip.scrollIntoViewIfNeeded();
        await chip.focus();
        await expect(chip).toBeFocused();
        const tip = page.getByRole('tooltip');
        await expect(tip).toBeVisible();
        const box = await tip.boundingBox();
        expect.soft(box!.x, `${id} tooltip left`).toBeGreaterThanOrEqual(0);
        expect.soft(box!.x + box!.width, `${id} tooltip right`).toBeLessThanOrEqual(viewport.width);
        expect.soft(await tip.evaluate(el => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight), `${id} tooltip interior`).toBe(true);
        boxes.push({ id, box });
        await page.screenshot({ caret: 'initial', path: info.outputPath(`${id}-tooltip.png`) });
        await chip.blur();
        await page.mouse.move(0, 0);
        await chip.hover();
        await expect(tip).toBeVisible();
        await page.mouse.move(0, 0);
      }
      expect.soft((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      for (const id of target.ids) {
        const citation = getCitation(id)!;
        const entry = page.locator(`ol [data-reference-id="${id}"]`);
        await expect(entry).toContainText(citation.title);
        await expect(entry.locator(`a[href="${citation.url}"]`).first()).toHaveCount(1);
        const names = entry.locator('[data-author-names]');
        if (citation.authors.length > 8) {
          await expect(names).toContainText(`and ${citation.authors.length - 8} more`);
          const button = entry.getByRole('button');
          await button.scrollIntoViewIfNeeded();
          await button.focus();
          await page.keyboard.press('Enter');
          await expect(button).toHaveAttribute('aria-expanded', 'true');
          await expect(button).toBeFocused();
          await expect(names).toHaveText(citation.authors.join(', '));
          await page.screenshot({ caret: 'initial', path: info.outputPath(`${id}-authors-expanded.png`) });
          expect.soft((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
          await page.keyboard.press('Enter');
          await expect(button).toHaveAttribute('aria-expanded', 'false');
          await expect(button).toBeFocused();
        } else {
          await expect(names).toHaveText(citation.authors.join(', '));
        }
        await entry.scrollIntoViewIfNeeded();
        await page.screenshot({ caret: 'initial', path: info.outputPath(`${id}-reference.png`) });
      }
      if (target.slug === 'comparison-matrix') {
        const table = page.getByRole('table');
        await expect(table.locator('tbody tr')).toHaveCount(18);
        const region = page.getByRole('region', { name: /policies across/ });
        await region.focus();
        await page.keyboard.press('ArrowRight');
        await expect.poll(() => region.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
        const filter = page.getByLabel('Filter methods');
        await filter.fill('OpenVLA-OFT');
        await expect(table.locator('tbody tr')).toHaveCount(1);
        await expect(table.locator('tbody tr')).toContainText('25 / 25');
        await expect(table.locator('tbody tr')).toContainText('25 Hz');
        await region.scrollIntoViewIfNeeded();
        await page.screenshot({ caret: 'initial', path: info.outputPath('oft-matrix.png') });
        await filter.fill('Gemini');
        await page.getByRole('group', { name: 'Filter by weights' }).getByRole('button', { name: 'Not disclosed', exact: true }).click();
        await expect(table.locator('tbody tr')).toHaveCount(2);
        await expect(table).toContainText('continuous; The v3 model card');
        await region.evaluate(el => { el.scrollLeft = el.scrollWidth; });
        await page.screenshot({ caret: 'initial', path: info.outputPath('gemini-unknown-matrix.png') });
        await page.getByRole('button', { name: 'Reset', exact: true }).click();
        await expect(table.locator('tbody tr')).toHaveCount(18);
      }
      if (target.slug === 'generalist-policies') {
        await page.getByRole('button', { name: 'Not disclosed', exact: true }).click();
        for (const name of [/Gemini Robotics 1\.5/, /Gemini Robotics 2/, /Skild Brain/, ...(transferProof ? [/^Helix$/, /^Helix 02$/, /^AgiBot GO-2$/] : [])]) {
          const button = page.getByRole('button', { name });
          await button.focus();
          await page.keyboard.press('Enter');
          await expect(button).toBeFocused();
          await expect(button).toHaveAttribute('data-status', 'undisclosed');
        }
        await page.getByRole('button', { name: /Gemini Robotics 1\.5/ }).click();
        await expect(page.getByText(/Report first submitted October 2, 2025; this date does not establish the release date/)).toBeVisible();
        await page.getByRole('button', { name: 'Not disclosed', exact: true }).scrollIntoViewIfNeeded();
        await page.screenshot({ caret: 'initial', path: info.outputPath('unknown-timeline.png') });
        await page.getByRole('button', { name: 'Reset', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Helix', exact: true })).toHaveAttribute('aria-pressed', 'true');
      }
      if (target.slug === 'cross-embodiment') {
        const button = page.getByRole('button', { name: 'Motion transfer', exact: true });
        await button.focus();
        await page.keyboard.press('Enter');
        await expect(button).toBeFocused();
        await expect(page.getByText('Motion transfer: human-hand mapping not specified in this illustration', { exact: true })).toBeVisible();
        await button.scrollIntoViewIfNeeded();
        await page.screenshot({ caret: 'initial', path: info.outputPath('motion-transfer.png') });
        await page.getByRole('button', { name: 'Reset', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Padded shared vector', exact: true })).toHaveAttribute('aria-pressed', 'true');
      }
      if (transferProof && target.slug === 'hierarchical') {
        for (const system of HIERARCHY_SYSTEMS) {
          const button = page.getByRole('button', { name: system.name, exact: true });
          await button.focus();
          await page.keyboard.press('Enter');
          await expect(button).toBeFocused();
          await expect(page.getByTestId('lane-row-instruction')).toContainText('schematic');
          const slider = page.getByRole('slider', { name: /playhead/i });
          await slider.focus();
          await page.keyboard.press('End');
          await expect(slider).toHaveValue('2000');
          await expect(page.getByTestId('lane-row-instruction')).toContainText('last update: 0 ms');
          await button.scrollIntoViewIfNeeded();
          await page.screenshot({ caret: 'initial', path: info.outputPath(`timescales-${system.id}.png`) });
        }
        await page.getByRole('button', { name: 'Reset', exact: true }).click();
        await expect(page.getByTestId('playhead-readout')).toHaveText('t = 0 ms');
        await expect(page.getByTestId('lane-row-chunk')).toContainText('schematic');
      }
      expect.soft(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
      expect.soft(await page.locator('.katex-error').count()).toBe(0);
      expect.soft(errors).toEqual([]);
      expect.soft(consoleErrors).toEqual([]);
      console.log(JSON.stringify({ route: target.route, viewport, requiredChips, observedChips, requiredMethodSources, observedMethodSources, withoutChips, boxes, errors, consoleErrors, outputDir: info.outputDir }));
    });
  }
}
