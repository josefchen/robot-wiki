import { test, expect } from '@playwright/test';
import { collectReleaseInteractionDetails } from './helpers/release-interaction-details';
import { persistentInputLabelProblems, segmentedControlProblems, targetSizeProblems } from '../../lib/brand-v2-release-interaction-details';
test('release interaction probe sees visible labels, nested inline citations, spacing, and forced-colour selection', async ({
  page
}) => {
  await page.setContent(`<style>body{font:16px sans-serif;color:#1c1c1a;background:#fafaf8}button{border:0;border-radius:0;background:transparent;color:inherit;padding:5px;font-weight:600}button[aria-pressed=true]{text-decoration:underline}.small{display:inline-block;width:14px;height:18px}p{width:500px}</style><main><p>Evidence<sup><span><a data-brand-control-id="control:link-focus" class="small" href="#source">1</a></span></sup>supports the claim.</p><label for="angle">Elbow</label><input type="range" id="angle" data-brand-control-id="control:input"><div role="group" aria-label="Method"><div data-brand-control-id="control:segmented"><button aria-pressed="true">Direct</button><button aria-pressed="false">Model</button></div></div></main>`);
  const registry = [{
    id: 'control:link-focus',
    targetSize: {
      minimumPx: 24,
      exceptions: [{
        kind: 'inline',
        criterion: 'WCAG 2.2 SC 2.5.8 inline exception',
        reason: 'Source in a sentence.'
      }]
    },
    pointerAlternative: 'native pointer activation'
  }, {
    id: 'control:input',
    targetSize: {
      minimumPx: 24,
      exceptions: [{
        kind: 'spacing',
        criterion: 'WCAG 2.2 SC 2.5.8 spacing exception',
        reason: 'Separate range row.'
      }]
    },
    pointerAlternative: 'native pointer activation'
  }];
  let data = await page.evaluate(collectReleaseInteractionDetails);
  expect(persistentInputLabelProblems(data)).toEqual([]);
  expect(segmentedControlProblems(data)).toEqual([]);
  expect(data.targets.small.find(target => target.tag === 'a')?.inlineText).toContain('supports the claim');
  expect(targetSizeProblems({
    ...data,
    targets: {
      count: 1,
      large: {
        count: 0,
        minWidth: null,
        minHeight: null
      },
      small: data.targets.small.filter(target => target.tag === 'a')
    }
  }, registry)).toEqual([]);
  await page.locator('label').evaluate(label => label.remove());
  await page.locator('input').evaluate(input => input.setAttribute('aria-label', 'Elbow'));
  expect(persistentInputLabelProblems(await page.evaluate(collectReleaseInteractionDetails))).not.toEqual([]);
  await page.emulateMedia({
    forcedColors: 'active'
  });
  data = await page.evaluate(collectReleaseInteractionDetails);
  expect(data.forcedColors).toBe(true);
  expect(segmentedControlProblems(data)).toEqual([]);
  await page.locator('[aria-pressed=true]').evaluate(button => (button as HTMLElement).style.textDecoration = 'none');
  expect(segmentedControlProblems(await page.evaluate(collectReleaseInteractionDetails))).not.toEqual([]);
});
test('Chromium exposes implicit atomic status and rejects an explicit contradiction', async ({
  page
}) => {
  await page.setContent('<div role="status" aria-live="polite">111 of 111 companies</div>');
  const client = await page.context().newCDPSession(page);
  const tree = await client.send('Accessibility.getFullAXTree');
  const status = tree.nodes.find(node => node.role?.value === 'status');
  expect(status?.properties?.find(p => p.name === 'atomic')?.value.value).toBe(true);
  expect(await page.locator('[role=status]').getAttribute('aria-atomic')).toBeNull();
  await page.locator('[role=status]').evaluate(node => node.setAttribute('aria-atomic', 'false'));
  const changed = await client.send('Accessibility.getFullAXTree');
  expect(changed.nodes.find(node => node.role?.value === 'status')?.properties?.find(p => p.name === 'atomic')?.value.value).toBe(false);
  await client.detach();
});
test('wrapped target fragments do not create phantom collisions or paragraph exemptions', async ({
  page
}) => {
  const registry = [{
    id: 'control:link-focus',
    targetSize: {
      minimumPx: 24,
      exceptions: [{
        kind: 'spacing',
        criterion: 'WCAG2.2 SC2.5.8 spacing exception',
        reason: 'Separated inline navigation targets.'
      }, {
        kind: 'inline',
        criterion: 'WCAG2.2 SC2.5.8 inline exception',
        reason: 'Links in authored prose.'
      }]
    },
    pointerAlternative: 'native pointer activation'
  }];
  await page.setContent('<p style="width:220px;font:16px/40px Arial"><a data-brand-control-id="control:link-focus" href="#first">First link</a> <a data-brand-control-id="control:link-focus" href="#wrapped">An unusually lengthy target that wraps across lines</a></p>');
  const spaced = await page.evaluate(collectReleaseInteractionDetails);
  expect(spaced.targets.small.some(target => target.fragmented)).toBe(true);
  expect(new Set(spaced.targets.small.map(target => target.id)).size).toBe(spaced.targets.small.length);
  expect(targetSizeProblems(spaced, registry)).toEqual([]);
  await page.locator('p').evaluate(node => node.style.lineHeight = '20px');
  expect(targetSizeProblems(await page.evaluate(collectReleaseInteractionDetails), registry)).not.toEqual([]);
  await page.setContent('<div><a data-brand-control-id="control:link-focus" href="#one">Navigation target</a><p>A separate block explanation must not count as inline prose.</p></div>');
  expect((await page.evaluate(collectReleaseInteractionDetails)).targets.small[0].inlineText).toBe('');
});
test('SVG pointer hit regions need a real24px square, including their non-scaling stroke', async ({
  page
}) => {
  await page.setContent('<svg width="100" height="100" viewBox="0 0 100 100"><circle role="button" aria-label="Mark" data-brand-control-id="control:selection" cx="50" cy="50" r="12" fill="transparent" stroke="transparent" stroke-width="24" vector-effect="non-scaling-stroke"/></svg>');
  expect((await page.evaluate(collectReleaseInteractionDetails)).targets.large.count).toBe(1);
  await page.locator('circle').evaluate(node => node.setAttribute('r', '4'));
  const small = await page.evaluate(collectReleaseInteractionDetails);
  expect(small.targets.large.count).toBe(0);
  expect(small.targets.small[0].nonRectangular).toBe(true);
});
