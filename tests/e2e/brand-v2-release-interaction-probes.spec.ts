import { test, expect,brandV2Registry } from './brand-v2-static-fixture';
import { collectReleaseInteractionDetails } from './helpers/release-interaction-details';
import { persistentInputLabelProblems, segmentedControlProblems, targetSizeProblems } from '../../lib/brand-v2-release-interaction-details';
import {captureTextPopulation,measureTextPopulation}from './helpers/release-text-profile';
import { collectReleaseTableFrames } from './helpers/release-table-values';
import { profileTableValueProof } from '../../lib/brand-v2-release-values';
import {writeFileSync}from 'node:fs';
import {liveActivityVerdict,exportedLiveBasis,joinNativeLedgerTransition,type LiveMessageBindings}from '../../lib/brand-v2-release-live';
import {takeReleaseActivity,resumeReleaseActivity}from './helpers/release-activity';
import {measureLedgerMount}from './helpers/interactive-ledger-driver';
import {interactiveLedgerPlan}from '../../lib/brand-v2-interactive-ledger';
import type {ReleaseActivity}from '../../lib/brand-v2-release-activity';
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
      censusIds: data.targets.small.filter(target => target.tag === 'a').map(target => target.id),
      large: {
        count: 0,
        ids: [],
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

test('clipped scroll-plane targets retain their population without phantom footer collisions',async({page})=>{
  const registry=[{id:'control:link-focus',targetSize:{minimumPx:24,exceptions:[{kind:'spacing',criterion:'WCAG2.2 SC2.5.8 spacing exception',reason:'Measured separated targets.'}]},pointerAlternative:'native pointer activation'}];
  await page.setContent('<style>a{display:block;width:30px;height:18px;font:12px/18px Arial}</style><main><a id="footer" data-brand-control-id="control:link-focus" href="#footer" style="position:absolute;left:20px;top:220px">A</a><div id="sheet" style="position:fixed;left:20px;top:20px;width:80px;height:80px;overflow:auto"><div style="padding-top:200px"><a id="clipped" data-brand-control-id="control:link-focus" href="#clipped">B</a></div></div></main>');
  const first=await page.evaluate(collectReleaseInteractionDetails);
  expect(first.targets.count).toBe(2);expect(first.targets.small).toHaveLength(2);
  const clipped=first.targets.small.find(({name})=>name==='B')!;
  expect(clipped.clipping.context).toBe('#sheet');expect(clipped.clipping.visibleFragments).toEqual([]);
  expect(clipped.clipping.ancestors.some(({selector})=>selector==='#sheet')).toBe(true);
  expect(targetSizeProblems(first,registry)).toEqual([]);
  await page.locator('#clipped').evaluate(node=>{const next=node.cloneNode(true) as HTMLElement;next.id='close-neighbour';next.textContent='C';next.style.marginTop='2px';node.after(next);});
  const crowded=await page.evaluate(collectReleaseInteractionDetails);
  expect(crowded.targets.count).toBe(3);
  expect(targetSizeProblems(crowded,registry)).not.toEqual([]);
});

test('text below a sheet scroll window cannot collide with the page behind it',async({page})=>{
  await page.setContent('<main><p style="position:absolute;top:220px;left:20px">Page label</p><section style="position:fixed;top:20px;left:20px;width:180px;height:80px;overflow:auto"><div style="padding-top:180px"><p id="scrolled">Sheet description</p><p id="next">Second description</p></div></section></main>');
  const members=await page.evaluate(captureTextPopulation,['main p']);
  let readings=await page.evaluate(measureTextPopulation,members);
  expect(readings).toHaveLength(3);expect(readings.every(reading=>!reading.overlapped)).toBe(true);
  await page.locator('#next').evaluate(node=>{node.style.position='absolute';node.style.top='180px';});
  readings=await page.evaluate(measureTextPopulation,members);
  expect(readings.filter(reading=>reading.overlapped)).toHaveLength(2);
});

test('source table profile capture binds the native filter configuration and exact independent cells',async({page,staticBase},info)=>{
  const mount=brandV2Registry.interactive.mounts.find(mount=>mount.sourceId==='interactive:HardwareGuide')!;
  await page.goto(staticBase+mount.route);await page.evaluate(()=>document.fonts.ready);
  const owner=page.locator('[data-article-interactive="HardwareGuide"]');
  for(const changed of [false,true]){
    if(changed)await owner.getByRole('button',{name:'Arms',exact:true}).click();
    const details=await page.evaluate(collectReleaseInteractionDetails),frames=await collectReleaseTableFrames(page,mount.route,details.tables.map(table=>table.id));
    const tables=details.tables.filter(table=>table.frame==='HardwareGuide');expect(tables.length).toBeGreaterThan(0);
    for(const table of tables){
      const input={id:`actual:${changed}|${table.id}`,route:mount.route,table,frames,mounts:brandV2Registry.interactive.mounts};
      const failures=profileTableValueProof(input)?.failures;
      if(failures?.length){const path=info.outputPath('table-binding.json');writeFileSync(path,JSON.stringify(input,null,2));await info.attach('table-binding.json',{path,contentType:'application/json'});}
      expect(failures).toEqual([]);
      const changedTable=structuredClone(table);changedTable.cells[0].text='invented zero';
      expect(profileTableValueProof({...input,table:changedTable})?.failures.length).toBeGreaterThan(0);
    }
  }
});

test('native filter and unavailable-search messages join their exact canonical state',async({page,staticBase},info)=>{
  const basis=(route:string):LiveMessageBindings=>({static:exportedLiveBasis(process.cwd(),route),frameMessages:new Map(),searchMessages:new Set(['Searching for "action chunking"','The search index is unavailable']),playgroundMessages:new Set()});
  await page.goto(staticBase+'/market-map/');await page.locator('[data-market-map-search]').fill('no-such-company');
  await expect(page.locator('[data-market-map-empty]')).toBeVisible();
  const map=await page.evaluate(takeReleaseActivity),mapVerdict=liveActivityVerdict(map,basis('/market-map/'));
  writeFileSync(info.outputPath('map-native-activity.json'),JSON.stringify({activity:map,verdict:mapVerdict},null,2));
  expect(mapVerdict.failures).toEqual([]);
  await page.route('**/search-index.json',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));
  await page.route('**/pagefind/pagefind.js',route=>route.fulfill({status:503,contentType:'text/javascript',body:'unavailable'}));
  await page.goto(staticBase+'/search/');await page.getByRole('searchbox',{name:'Search the wiki'}).fill('action chunking');
  await expect(page.getByRole('status').first()).toHaveText('The search index is unavailable');
  const search=await page.evaluate(takeReleaseActivity),searchVerdict=liveActivityVerdict(search,basis('/search/'));
  writeFileSync(info.outputPath('search-native-activity.json'),JSON.stringify({activity:search,verdict:searchVerdict},null,2));
  expect(searchVerdict.failures).toEqual([]);
  const altered=structuredClone(search);altered.finalRegions[0].text='A made-up availability result';
  expect(liveActivityVerdict(altered,basis('/search/')).failures.length).toBeGreaterThan(0);
});

test('native self-check and copy messages retain their authored text and focus',async({page,staticBase},info)=>{
  const route='/classical/ros2-for-ml-engineers/';await page.goto(staticBase+route);await page.evaluate(()=>document.fonts.ready);
  await page.context().grantPermissions(['clipboard-read','clipboard-write']);
  const check=page.locator('[data-self-check]').first();await check.getByRole('radio').first().check();
  await expect(check.locator('details')).toHaveAttribute('open','');
  await page.locator('.prose h2 button[data-heading-permalink]').first().click();
  await expect(page.getByRole('status').filter({hasText:'Copied'})).toBeVisible();
  const activity=await page.evaluate(takeReleaseActivity);
  const basis:LiveMessageBindings={static:exportedLiveBasis(process.cwd(),route),frameMessages:new Map(),searchMessages:new Set(),playgroundMessages:new Set()};
  const verdict=liveActivityVerdict(activity,basis);writeFileSync(info.outputPath('article-native-activity.json'),JSON.stringify({activity,verdict},null,2));
  expect(verdict.failures).toEqual([]);
  const revealed=activity.finalRegions.find(region=>region.selfCheck?.selected!==null&&region.selfCheck);
  expect(revealed).toBeTruthy();revealed!.text='Incorrect reasoning';expect(liveActivityVerdict(activity,basis).failures.length).toBeGreaterThan(0);
});

test('figure ledger keys and spoken changes have exact independent native witnesses',async({browser,staticBase},info)=>{
  test.setTimeout(120_000);
  const plan=interactiveLedgerPlan(brandV2Registry),mount=plan.mounts.find(mount=>mount.sourceId==='interactive:ChunkSizeCurve')!;
  const intervals=new Map<string,ReleaseActivity>();
  const observation=await measureLedgerMount(browser,staticBase,plan,mount,undefined,async(page,state)=>{
    if(state.id.startsWith('focus:')&&intervals.has(state.id))return;
    expect(intervals.has(state.id)).toBe(false);intervals.set(state.id,await page.evaluate(takeReleaseActivity));await page.evaluate(resumeReleaseActivity);
  });
  const verdicts=observation.transitions.map(transition=>{
    const exact=`transition:${transition.control}:${transition.fold??'main'}:${transition.caseId}:${transition.keys.join('+')}`;
    const records=[...intervals].filter(([id])=>id===exact||id===`focus:${transition.control}`).map(([id,activity])=>({id,activity}));
    return {id:exact,...joinNativeLedgerTransition(transition,observation.controls.find(control=>control.index===transition.control)!.name,records)};
  });
  writeFileSync(info.outputPath('figure-native-activity.json'),JSON.stringify({observation,intervals:[...intervals],verdicts},null,2));
  expect(verdicts.length).toBeGreaterThan(0);expect(verdicts.flatMap(verdict=>verdict.failures)).toEqual([]);
});
