import { test, expect, brandV2Registry } from './brand-v2-static-fixture';
import { mountRoots } from './helpers/interactive-mount-roots';
import { collectFrame } from './helpers/interactive-frame-evidence';
import { DATA_SOURCE_ORACLES } from '../../lib/brand-v2-source-oracles-data';
import { SourceOracleContext } from '../../lib/brand-v2-source-oracle-core';

test('a plain source widget remains bound through zero matching rows and reset', async ({ page, staticBase }) => {
  const route = '/data-hardware/hardware-taxonomy/';
  await page.goto(staticBase + route);
  const mounts = brandV2Registry.interactive.mounts.filter(mount => mount.route === route).map(mount => ({ ...mount, component: brandV2Registry.interactive.sources.find(source => source.id === mount.sourceId)!.component }));
  const roots = await mountRoots(page, route, mounts);
  const root = roots[mounts.findIndex(mount => mount.sourceId === 'interactive:HardwareGuide')];
  for (const name of ['Compute', 'Not disclosed', 'Under $1k']) {
    const button = root.getByRole('button', { name, exact: true });
    await button.focus(); await button.press('Enter');
  }
  await expect(root.getByRole('table')).toHaveCount(0);
  await expect(root.getByText('No hardware matches these filters.')).toBeVisible();
  const oracle = DATA_SOURCE_ORACLES['interactive:HardwareGuide'];
  const reading = new SourceOracleContext(await collectFrame(root), oracle, 'actual empty filter');
  oracle.check(reading); reading.finish();
  expect(reading.failures).toEqual([]);
  await root.getByRole('button', { name: 'Reset', exact: true }).press('Enter');
  await expect(root.getByRole('table')).toHaveCount(1);
  const reset = new SourceOracleContext(await collectFrame(root), oracle, 'actual reset');
  oracle.check(reset); reset.finish();
  expect(reset.failures).toEqual([]);
});

test('painted duplicate chart text and accessible cards retain independent clipping evidence', async ({ page }) => {
  await page.setContent(`<style>body{font:16px sans-serif;color:rgb(0,0,0)}figure{margin:0;width:700px}svg{display:block}text{font-size:14px;fill:rgb(0,0,0)}</style><main><figure><svg width="300" height="80" data-testid="method-year-strip" aria-hidden="true"><g data-series="codes"><text x="8" y="25" data-series-label-for="codes">word-like codes</text><circle data-method-dot="act" cx="100" cy="45" r="3" opacity="0.2"/></g></svg><div data-method-card="act">ACT2023Outputplain numbersPlans ahead100 movesSpeed50 commands a secondDownloadnot disclosed</div><div role="group" aria-label="Measured context"><button role="radio" aria-checked="true">Robot</button><button role="radio" aria-checked="false">Fleet</button><button role="radio" aria-checked="mixed">Unknown</button></div></figure></main>`);
  const root = page.locator('figure');
  let frame = await collectFrame(root);
  expect(frame.labels[0].hidden).toEqual(['"word-like codes": aria-hidden']);
  expect(frame.svgTexts[0].painted).toBe(true);
  expect(frame.svgTexts[0].paintFailures).toEqual([]);
  expect(frame.methodCards?.[0].visible).toBe(true);
  expect(frame.svgMarks.find(mark => mark.attrs['data-method-dot'] === 'act')?.effectiveOpacity).toBe(0.2);
  expect(frame.svgMarks.find(mark => mark.attrs['data-method-dot'] === 'act')?.displayed).toBe(true);
  expect(frame.controls.map(control => [control.label, control.checked])).toEqual([['Robot', true], ['Fleet', false], ['Unknown', null]]);
  await page.locator('svg').evaluate(svg => { svg.style.clipPath = 'inset(50%)'; });
  frame = await collectFrame(root);
  expect(frame.svgTexts[0].painted).toBe(false);
  expect(frame.svgTexts[0].paintFailures).toContain('text clipped away');
  await page.locator('svg').evaluate(svg => { svg.style.visibility = 'hidden'; });
  expect((await collectFrame(root)).svgMarks.every(mark => mark.displayed === false)).toBe(true);
  await page.locator('[data-method-card]').evaluate(card => { (card as HTMLElement).style.color = 'transparent'; });
  frame = await collectFrame(root);
  expect(frame.methodCards?.[0].visible).toBe(false);
  expect(frame.methodCards?.[0].paintFailures).toContain('unpainted text');
  await page.locator('[data-method-card]').evaluate(card => { (card as HTMLElement).style.color = 'black'; (card as HTMLElement).style.height = '1px'; (card as HTMLElement).style.overflow = 'hidden'; });
  expect((await collectFrame(root)).methodCards?.[0].visible).toBe(false);
  await page.locator('[data-method-card]').evaluate(card => { (card as HTMLElement).style.height = ''; (card as HTMLElement).style.width = '10px'; (card as HTMLElement).style.whiteSpace = 'nowrap'; });
  expect((await collectFrame(root)).methodCards?.[0].visible).toBe(false);
});
