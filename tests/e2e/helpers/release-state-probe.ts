import { writeReleaseStateRecord,writeReleaseStateManifest,type ReleaseStateReference,type ReleaseStateManifest } from '../../../lib/brand-v2-release-state-store';
import { takeReleaseActivity,resumeReleaseActivity } from './release-activity';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import {
  RELEASE_PROFILES,
  releaseSourceFingerprint,
  type ReleaseProfile, type ReleaseState,
} from '../../../lib/brand-v2-release-evidence';
import { documentOverflow } from './document-overflow';
import { readReleaseBuildStamp, releaseExportFingerprint } from '../../../lib/brand-v2-release-build';
import { collectReleaseResidueState } from './release-residue-state';
import { collectReleaseAccessibilityDetails } from './release-accessibility-details';
import { collectGlobalConvergence } from './global-convergence-collector';
import { collectorInput, readConvergenceRegistry } from '../../../lib/brand-v2-global-convergence-evidence';
import { RELEASE_ACCESSIBILITY_PREDICATES, type ReleaseAccessibility } from '../../../lib/brand-v2-release-accessibility';
import { decodePng } from '../../../lib/png-decode';
import { readFocusPaint } from './focus-paint';
import { collectReleaseInteractionDetails } from './release-interaction-details';
import { readReleaseCheckpoint,writeReleaseCheckpoint } from '../../../lib/brand-v2-release-checkpoint';
import { RELEASE_TEXT_ONLY_SELECTORS,RELEASE_TEXT_ONLY_SOURCE } from '../../../lib/brand-v2-release-text';
import { readReleaseFonts } from './release-fonts';
import { captureTextPopulation,measureTextPopulation } from './release-text-profile';
import { collectReleaseTableFrames } from './release-table-values';

export const FINAL_RELEASE_PROFILES = process.env.ROBOT_WIKI_RELEASE_PROFILES === '1';
export const FINAL_CAPTURE_SOURCE_FINGERPRINT = FINAL_RELEASE_PROFILES ? releaseSourceFingerprint(process.cwd()) : null;
export const FINAL_CAPTURE_BUILD = FINAL_RELEASE_PROFILES ? readReleaseBuildStamp(process.cwd()) : null;
const accessibilityRegistry = readConvergenceRegistry(process.cwd());

/** A stable semantic digest excludes geometry and generated probe attributes.
 * It catches a measurement accidentally activating a control, losing state,
 * changing a selection or leaving a disclosure open. */
async function semanticStateValue(page: Page): Promise<string> {
  return page.evaluate(() => JSON.stringify({
    url: location.pathname + location.search + location.hash,
    active:document.activeElement?{tag:document.activeElement.tagName,id:document.activeElement.id,role:document.activeElement.getAttribute('role'),label:document.activeElement.getAttribute('aria-label'),company:document.activeElement.getAttribute('data-company-id')}:null,
    controls: [...document.querySelectorAll('main input, main select, main textarea, main [aria-pressed], main [aria-selected], main details')].map((node) => ({
      tag: node.tagName, id: node.id,
      value: 'value' in node ? String(node.value) : null,
      checked: node instanceof HTMLInputElement ? node.checked : null,
      pressed: node.getAttribute('aria-pressed'), selected: node.getAttribute('aria-selected'),
      open: node instanceof HTMLDetailsElement ? node.open : null,
    })),
    text:(document.querySelector('main')?.textContent??'').replace(/\s+/g,' ').trim(),
    states:[...document.querySelectorAll('main [aria-expanded],main [data-state],main [data-status],main [data-camera-position]')].map((node)=>({id:node.id,expanded:node.getAttribute('aria-expanded'),state:node.getAttribute('data-state'),status:node.getAttribute('data-status'),camera:node.getAttribute('data-camera-position')})),
  }));
}
async function semanticState(page:Page):Promise<string>{return createHash('sha256').update(await semanticStateValue(page)).digest('hex');}


/** Cache identity also covers current rendered geometry, inline attributes
 * and CSSOM rules. A planted style or stale drawing cannot reuse an earlier
 * green case merely because its controls still have the same values. Canvas
 * states remain freshly measured: DOM signatures cannot establish pixels. */
export async function checkpointVisualState(page:Page):Promise<string|null>{
  const value=await page.evaluate(()=>{
    const visible=(node:Element)=>node.checkVisibility({opacityProperty:true,visibilityProperty:true})&&node.getClientRects().length>0;
    if([...document.querySelectorAll('canvas')].some(visible))return null;
    if([...document.querySelectorAll<HTMLImageElement>('img')].some((node)=>visible(node)&&(!node.complete||node.naturalWidth===0)))return null;
    const sheets=[...document.styleSheets,...document.adoptedStyleSheets].map((sheet)=>{
      // Each static-export worker gets a fresh local port. Bind local sheets
      // to their full resource path while keeping external origins and every
      // CSSOM rule. Frozen source/export fingerprints still bind file bytes.
      const url=sheet.href?new URL(sheet.href):null;
      const local=url&&(url.protocol==='http:'||url.protocol==='https:')&&url.origin===location.origin;
      const href=local?`${url.pathname}${url.search}${url.hash}`:sheet.href;
      try{return {href,disabled:sheet.disabled,rules:[...sheet.cssRules].map(({cssText})=>cssText)};}
      catch{return {href,disabled:sheet.disabled,rules:['unreadable stylesheet']};}
    });
    if(sheets.some(({rules})=>rules[0]==='unreadable stylesheet'))return null;
    const nodes=[document.documentElement,...document.body.querySelectorAll('*')].filter((node)=>!node.matches('script,style,noscript,template')&&visible(node)).map((node)=>{
      const box=node.getBoundingClientRect(),style=getComputedStyle(node);
      return {tag:node.tagName,attributes:[...node.attributes].map(({name,value})=>[name,value]),
        box:[box.x,box.y,box.width,box.height].map((value)=>Math.round(value*100)/100),
        paint:[style.fontFamily,style.fontSize,style.fontWeight,style.lineHeight,style.color,style.backgroundColor,style.opacity,style.transform,style.fill,style.stroke,style.strokeWidth,style.outline,style.outlineOffset,style.boxShadow,style.filter]};
    });
    return JSON.stringify({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,forced:matchMedia('(forced-colors:active)').matches,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches,sheets,nodes});
  });
  return value===null?null:createHash('sha256').update(value).digest('hex');
}

async function requiredText(page: Page) {
  return page.evaluate(() => {
    const visible = (node: HTMLElement) => node.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && !node.closest('.sr-only, [aria-hidden="true"]');
    const clean = (node: HTMLElement) => {
      const clone = node.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('[data-sidenote], .sr-only, [aria-hidden="true"], [role=tooltip]').forEach((child) => child.remove());
      return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
    };
    const core = [...new Set([...document.querySelectorAll<HTMLElement>('main h1, main h2, main h3, main p, main li, main caption, main figcaption, main output')]
      .filter((node) => visible(node) && !node.closest('[data-sidenote], nav[aria-label="Contents"]'))
      .map(clean).filter(Boolean))];
    const noteText = (node: HTMLElement) => {
      const parts: string[] = [];
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      for (let text = walker.nextNode(); text; text = walker.nextNode()) {
        if (text.parentElement && !text.parentElement.closest('.sidenote-index') && text.parentElement.checkVisibility({ opacityProperty: true, visibilityProperty: true })) parts.push(text.textContent ?? '');
      }
      return parts.map((part) => part.replace(/\s+/g, ' ').trim()).filter(Boolean);
    };
    const citations = [...document.querySelectorAll<HTMLElement>('main [data-sidenote]')].filter(visible)
      .map((node) => ({ id: node.id, segments: noteText(node), hrefs: [...node.querySelectorAll<HTMLAnchorElement>('a[href]')].filter((link) => !link.closest('.sidenote-index')).map((link) => link.getAttribute('href') ?? '') }));
    const contents = [...document.querySelectorAll<HTMLElement>('main nav[aria-label="Contents"] a')].filter(visible)
      .map((node) => ({ href: node.getAttribute('href') ?? '', text: node.innerText.replace(/\s+/g, ' ').trim() }));
    return { core, citations, contents };
  });
}

async function contentAvailability(page: Page, baseline: Awaited<ReturnType<typeof requiredText>>) {
  const now = await requiredText(page);
  const hidden = baseline.core.filter((text) => !now.core.join(' ').includes(text));
  const disclosures: ReleaseProfile['disclosures'] = [];
  const active = await page.evaluateHandle(() => document.activeElement);
  const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  try {
    if (baseline.contents.length) {
      const details = page.locator('main details').filter({ has: page.locator('nav[aria-label="Contents"]') }).first();
      let opened = false;
      if (!now.contents.length && await details.count()) {
        const summary = details.locator('summary').first();
        await summary.focus(); await page.keyboard.press('Enter'); opened = true;
        await page.keyboard.press('Tab');
      }
      const after = await requiredText(page);
      const present = baseline.contents.every((entry) => after.contents.some((item) => item.href === entry.href && item.text === entry.text));
      const keyboard = !opened || await page.evaluate(() => Boolean(document.activeElement?.closest('nav[aria-label="Contents"]')));
      if (opened) { await details.locator('summary').first().focus(); await page.keyboard.press('Enter'); }
      disclosures.push({ id: 'contents', reached: after.contents.length > 0, keyboard, textPresent: present,
        restored: !opened || !await details.evaluate((node) => (node as HTMLDetailsElement).open) });
    }
    for (const citation of baseline.citations) {
      const note = page.locator(`[id="${citation.id}"]`);
      const mark = note.locator('xpath=..').locator('sup.cite-mark a');
      const originallyVisible = await note.isVisible();
      let reached = originallyVisible;
      let keyboard = true;
      if (!originallyVisible) {
        await mark.scrollIntoViewIfNeeded(); await mark.focus(); await page.keyboard.press('Enter');
        reached = await note.isVisible();
        keyboard = await mark.evaluate((node) => document.activeElement === node);
      }
      const text = reached ? await note.evaluate((node) => {
        const parts: string[] = [];
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        for (let text = walker.nextNode(); text; text = walker.nextNode()) {
          if (text.parentElement && !text.parentElement.closest('.sidenote-index') && text.parentElement.checkVisibility({ opacityProperty: true, visibilityProperty: true })) parts.push(text.textContent ?? '');
        }
        return parts.join(' ').replace(/\s+/g, ' ').trim();
      }) : '';
      if (!originallyVisible && reached) { await mark.focus(); await page.keyboard.press('Enter'); }
      const hrefs = reached ? await note.locator('a[href]').evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? '')) : [];
      disclosures.push({ id: `citation:${citation.id}`, reached, keyboard, textPresent: citation.segments.every((segment) => text.includes(segment)) && citation.hrefs.every((href) => hrefs.includes(href)),
        restored: originallyVisible || !await note.isVisible() });
    }
  } finally {
    await active.evaluate((node) => {
      if (node === document.body && (document.activeElement instanceof HTMLElement||document.activeElement instanceof SVGElement)) document.activeElement.blur();
      else if ((node instanceof HTMLElement||node instanceof SVGElement) && node.isConnected) node.focus({ preventScroll: true });
    });
    await active.dispose();
    await page.evaluate(({ x, y }) => scrollTo({ left: x, top: y, behavior: 'instant' }), scroll);
  }
  return { hidden, disclosures, requiredDisclosureIds: [...(baseline.contents.length ? ['contents'] : []), ...baseline.citations.map(({ id }) => `citation:${id}`)] };
}

async function semanticReading(page: Page) {
  return page.evaluate(() => {
    const failures: string[] = [];
    const visible = (node: Element) => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
    const text = (node: Element) => {
      const clone = node.cloneNode(true) as Element;
      clone.querySelectorAll('[aria-hidden="true"]').forEach((child) => child.remove());
      return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
    };
    const name = (node: Element): string => {
      const ids = node.getAttribute('aria-labelledby')?.trim().split(/\s+/);
      return ids?.length ? ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ').trim()
        : node.getAttribute('aria-label') ?? (node instanceof HTMLInputElement || node instanceof HTMLSelectElement || node instanceof HTMLTextAreaElement
          ? [...(node.labels ?? [])].map(text).join(' ') : text(node));
    };
    // Region contents describe the scrollable/graphical subject; they are
    // not a visible action label. Native and ARIA action labels still bind
    // the accessible name, including nested label text.
    const visibleLabel=(node:Element)=>node.matches('button,summary,a[href],input,select,textarea,[role=button],[role=slider],[role=tab]')?text(node):'';
    const ids = new Set<string>();
    for (const node of document.querySelectorAll('[id]')) {
      if (ids.has(node.id)) failures.push(`duplicate id ${node.id}`);
      ids.add(node.id);
    }
    const controls = [...document.querySelectorAll('input:not([type=hidden]), select, textarea, button, summary, a[href], [role=button], [role=slider], [role=tab], [tabindex]:not(main)')].filter(visible);
    for (const control of controls) {
      const label = visibleLabel(control);
      const accessible = name(control);
      if (!accessible.trim()) failures.push(`unnamed control ${control.tagName}#${control.id}`);
      if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) {
        const labels = [...(control.labels ?? []), ...(control.getAttribute('aria-labelledby') ?? '').split(/\s+/).map((id) => document.getElementById(id)).filter((node): node is HTMLElement => Boolean(node))];
        if (control.type !== 'range' && !labels.some((node) => visible(node) && !node.closest('.sr-only') && text(node))) failures.push(`input lacks persistent visible label ${control.tagName.toLowerCase()}#${control.id} ${control.getAttribute('data-testid') ?? ''}`);
      }
      if (label && !accessible.toLowerCase().includes(label.toLowerCase())) failures.push(`label-in-name ${control.tagName}#${control.id}: ${label}`);
      if ((control as HTMLElement).tabIndex > 0) failures.push(`positive tabindex ${control.tagName}#${control.id}`);
    }
    for (const table of [...document.querySelectorAll('main table')].filter(visible)) {
      if (!table.querySelector('caption') && !table.getAttribute('aria-label') && !table.getAttribute('aria-labelledby')) failures.push('table without caption or accessible name');
      for (const th of table.querySelectorAll('th')) if (!th.hasAttribute('scope') && !th.id) failures.push(`table header lacks association: ${text(th)}`);
    }
    for (const node of [...document.querySelectorAll('main svg[role=img], main canvas[role=img]')].filter(visible)) {
      if (!name(node).trim() && !node.querySelector('title')) failures.push(`meaningful graphic lacks name ${node.tagName}`);
      if (node.getAttribute('aria-describedby')) {
        for (const id of node.getAttribute('aria-describedby')!.split(/\s+/)) if (!document.getElementById(id)?.textContent?.trim()) failures.push(`graphic missing text alternative ${id}`);
      }
    }
    for (const node of document.querySelectorAll('[data-brand-device-id][data-brand-decorative=true]')) {
      if (node.getAttribute('aria-hidden') !== 'true') failures.push(`decorative device exposed: ${node.getAttribute('data-brand-device-id')}`);
    }
    const active = document.activeElement;
    const focus: ReleaseProfile['focus'] = [];
    if (active instanceof Element && controls.includes(active)) {
      const rect = active.getBoundingClientRect();
      const style = getComputedStyle(active);
      const chartRing=active.closest('svg')?.querySelector('[data-focus-ring]');
      const ringStyle=chartRing?getComputedStyle(chartRing):null;
      const painted = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 1 || style.boxShadow !== 'none'||Boolean(chartRing&&visible(chartRing)&&ringStyle?.stroke!=='none'&&parseFloat(ringStyle?.strokeWidth??'0')>=1);
      const centerX = Math.max(0, Math.min(innerWidth - 1, rect.x + rect.width / 2));
      const centerY = Math.max(0, Math.min(innerHeight - 1, rect.y + rect.height / 2));
      const top = document.elementFromPoint(centerX, centerY);
      focus.push({ selector: active.id ? `#${active.id}` : `${active.tagName}:${name(active).slice(0, 80)}`, reached: true,
        visible: active.matches(':focus-visible') ? painted : true,
        obscured: rect.bottom < 0 || rect.top >= innerHeight || (top !== null && !active.contains(top) && !top.contains(active)),
        name: name(active), label: visibleLabel(active) });
    }
    return { mainCount: document.querySelectorAll('main, [role=main]').length,
      visibleTextCount: [...document.querySelectorAll('main *')].filter((node) => visible(node) && text(node)).length,
      semanticFailures: failures, focus,
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      forcedColorsActive: matchMedia('(forced-colors: active)').matches,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches };
  });
}

async function readIdleMotion(page: Page): Promise<NonNullable<ReleaseProfile['motion']>> {
  const pixels=async(canvas:ReturnType<Page['locator']>)=>createHash('sha256').update(decodePng(await canvas.screenshot()).rgba).digest('hex');
  const geometry = async () => createHash('sha256').update(await page.evaluate(() => JSON.stringify(
    [...document.querySelectorAll('main, main *')].filter((node) => node.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
      .map((node) => { const box = node.getBoundingClientRect(); const style = getComputedStyle(node);
        return { tag: node.tagName, attrs: [...node.attributes].filter(({ name }) => /^(d|x|y|x1|x2|y1|y2|cx|cy|r|width|height|transform|opacity)$/.test(name)).map(({ name, value }) => [name, value]),
          box: [box.x, box.y, box.width, box.height], transform: style.transform, opacity: style.opacity }; }),
  ))).digest('hex');
  const cssAnimations = await page.evaluate(() => document.getAnimations().filter((animation) => {
    const target = (animation.effect as KeyframeEffect | null)?.target;
    return animation.playState === 'running' && target instanceof Element && Boolean(target.closest('main')) &&
      target.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && Number(animation.effect?.getComputedTiming().duration ?? 0) > 1;
  }).map((animation) => `${animation.constructor.name}:${(animation.effect as KeyframeEffect).target?.tagName}`));
  const canvases: Array<{ id: string; before: string; after: string }> = [];
  const visible = [];
  for (const [index, canvas] of (await page.locator('main canvas').all()).entries()) {
    const inView = await canvas.evaluate((node) => { const box = node.getBoundingClientRect(); return node.checkVisibility() && box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth; });
    if (inView) visible.push({ id: `canvas:${index}`, canvas });
  }
  for (const item of visible) {
    let before=await pixels(item.canvas);let settled=false;
    // Resizing invalidates a WebGL backbuffer. Establish two consecutive
    // rendered pixel readings before starting the independent idle window;
    // continuously moving canvases never reach this precondition.
    for(let attempt=0;attempt<10;attempt++){
      await page.waitForTimeout(100);const next=await pixels(item.canvas);
      if(next===before){settled=true;break;}before=next;
    }
    if(!settled)throw new Error(`${item.id}: canvas never settled before the reduced-motion idle window`);
    canvases.push({ id: item.id, before, after: '' });
  }
  const geometryBefore = await geometry();
  const started = Date.now();
  await page.waitForTimeout(3000);
  const geometryAfter = await geometry();
  for (const [index, item] of visible.entries()) canvases[index].after = await pixels(item.canvas);
  return { windowMs: Date.now() - started, cssAnimations, geometryBefore, geometryAfter, canvases };
}

/** Run immediately after the owning driver reaches a real state. No reload,
 * selection or synthetic copied DOM is used. CDP changes only viewport/DPR;
 * every media/style mutation is restored even when a probe fails. */
export async function probeReleaseState(page: Page, input: Omit<ReleaseState, 'profiles'|'activity'>, maintain?: () => Promise<void>): Promise<ReleaseState> {
  const activity=await page.evaluate(takeReleaseActivity);
  const originalViewport = page.viewportSize();
  const original = await page.evaluate(() => ({ dpr: devicePixelRatio, width: innerWidth, height: innerHeight,
    forcedColors: matchMedia('(forced-colors:active)').matches, reduced: matchMedia('(prefers-reduced-motion:reduce)').matches,
    scrollX, scrollY }));
  await page.evaluate(()=>document.fonts.ready);
  const initialValue=await semanticStateValue(page);
  const initial=createHash('sha256').update(initialValue).digest('hex');
  const visual=FINAL_RELEASE_PROFILES?await checkpointVisualState(page):null;
  const checkpoint=FINAL_RELEASE_PROFILES&&FINAL_CAPTURE_BUILD&&FINAL_CAPTURE_SOURCE_FINGERPRINT&&visual?
    {source:FINAL_CAPTURE_SOURCE_FINGERPRINT,exported:FINAL_CAPTURE_BUILD.exportFingerprint,semanticDigest:createHash('sha256').update(initial).update(visual).digest('hex'),input}:null;
  if(checkpoint&&process.env.ROBOT_WIKI_RELEASE_RESUME!=='0'){
    const cached=readReleaseCheckpoint(process.cwd(),checkpoint);
    const fonts=await page.evaluate(readReleaseFonts);
    const fontsReady=fonts.status==='loaded'&&fonts.used.every(({ready})=>ready)&&fonts.usedFaceFailures.length===0;
    if(cached&&fontsReady){await page.evaluate(resumeReleaseActivity);return {...cached,activity};}
  }
  const session = await page.context().newCDPSession(page);
  const profiles: ReleaseProfile[] = [];
  const focusExpected=await page.evaluate(()=>Boolean(document.activeElement?.matches('input:not([type=hidden]),select,textarea,button,summary,a[href],[role=button],[role=slider],[role=tab],[tabindex]:not(main)')));
  const baselineText = await requiredText(page);
  try {
    for (const plan of RELEASE_PROFILES) {
      if(process.env.ROBOT_WIKI_RELEASE_PILOT==='1')console.log(`pilot ${input.id}: profile ${plan.id} starting`);
      await session.send('Emulation.setDeviceMetricsOverride', { width: plan.width, height: plan.height, deviceScaleFactor: plan.dpr, mobile: false });
      await page.emulateMedia({ forcedColors: plan.forcedColors ? 'active' : 'none', reducedMotion: plan.reducedMotion ? 'reduce' : 'no-preference' });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(async () => {
        const transitions = document.getAnimations().filter((animation) => animation instanceof CSSTransition);
        await Promise.all(transitions.map((animation) => animation.finished.catch(() => undefined)));
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      });
      // Vertical document scrolling is allowed by every resize profile.
      // CDP resize does not perform browser-chrome zoom's focus anchoring;
      // place the already-focused control in view without changing focus or
      // state, then still fail if sticky chrome actually obscures it.
      await page.evaluate(() => {
        const active = document.activeElement;
        if (active instanceof Element && active !== document.body && active !== document.documentElement) {
          active.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
        }
      });
      // A responsive branch can expose a font only after the two layout
      // frames above. Wait for that newly requested face as well as the
      // original document-font promise before taking the reading.
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => document.fonts.status === 'loaded');
      await maintain?.();
      const stateBefore = await semanticState(page);
      let textSizes: ReleaseProfile['textSizes'] = [];
      let textPopulation:ReleaseProfile['textPopulation']={source:null,selectors:[],memberIds:[]};
      let textStyle: Awaited<ReturnType<Page['addStyleTag']>> | undefined;
      if (plan.textOnly) {
        const sizes = await page.evaluate(captureTextPopulation,[...RELEASE_TEXT_ONLY_SELECTORS]);
        textPopulation={source:RELEASE_TEXT_ONLY_SOURCE,selectors:[...RELEASE_TEXT_ONLY_SELECTORS],memberIds:sizes.map(({id})=>id)};
        textStyle = await page.addStyleTag({ content: sizes.map(({ baselinePx },index) => `[data-release-text-probe="${index}"]{font-size:${baselinePx * 2}px!important}`).join('\n') });
        await page.evaluate(()=>document.fonts.ready);
        textSizes = await page.evaluate(measureTextPopulation,sizes);
      }
      try {
        await page.evaluate(()=>document.fonts.ready);
        const reading = await semanticReading(page);
        const fonts=await page.evaluate(readReleaseFonts);
        const fontsLoaded=fonts.status==='loaded'&&fonts.used.every(({ready})=>ready)&&fonts.usedFaceFailures.length===0;
        const axe = await new AxeBuilder({ page }).analyze();
        if(process.env.ROBOT_WIKI_RELEASE_PILOT==='1')console.log(`pilot ${input.id}: ${plan.id} Axe complete; checking disclosures`);
        const availability = await contentAvailability(page, baselineText);
        await maintain?.();
        if(process.env.ROBOT_WIKI_RELEASE_PILOT==='1')console.log(`pilot ${input.id}: ${plan.id} disclosures complete`);
        const motion = plan.reducedMotion ? await readIdleMotion(page) : undefined;
        const residue = await page.evaluate(collectReleaseResidueState);
        const convergence=await page.evaluate(collectGlobalConvergence,collectorInput(plan.width<768?'frame:mobile':plan.width<1440?'frame:tablet':'frame:desktop',accessibilityRegistry));
        const details=await page.evaluate(collectReleaseAccessibilityDetails);
        const accessibility:ReleaseAccessibility={counts:convergence.counts,
          findings:convergence.findings.filter(({predicate})=>RELEASE_ACCESSIBILITY_PREDICATES.some((p)=>p===predicate)) as ReleaseAccessibility['findings'],...details};
        const interaction=await page.evaluate(collectReleaseInteractionDetails);
        const tableFrames=await collectReleaseTableFrames(page,input.route,interaction.tables.map(({id})=>id));
        const live=await page.evaluate(takeReleaseActivity);
        const focusPaint=reading.focus.length>0&&await page.locator(':focus').count()?await page.locator(':focus').evaluate(readFocusPaint):null;
        profiles.push({ id: plan.id, ...reading,fonts,fontsLoaded,focusExpected,
          ...(plan.zoomBase ? { requestedCssViewport: { width: plan.zoomBase.width / 2, height: plan.zoomBase.height / 2 } } : {}),
          documentOverflowPx: Math.max(0, await documentOverflow(page)),
          axeViolations: axe.violations.map(({ id, nodes }) => `${id}:${nodes.map(({ target }) => target.join(' ')).join(';')}`),
          hiddenRequiredContent: availability.hidden, requiredDisclosureIds: availability.requiredDisclosureIds, disclosures: availability.disclosures,
          ...(motion ? { motion } : {}),
          residue,
          accessibility,
          interaction,tableFrames,liveRegions:live.finalRegions,liveRegionCount:live.finalRegionCount,focusPaint,
          textSizes,textPopulation, stateBefore, stateAfter: await semanticState(page) });
      } finally {
        await textStyle?.evaluate((node) => node.parentNode?.removeChild(node));
        await page.evaluate(() => document.querySelectorAll('[data-release-text-probe]').forEach((node) => node.removeAttribute('data-release-text-probe')));
      }
      if(process.env.ROBOT_WIKI_RELEASE_PILOT==='1')console.log(`pilot ${input.id}: profile ${plan.id} measured`);
    }
  } finally {
    await session.send('Emulation.setDeviceMetricsOverride', { width: original.width, height: original.height, deviceScaleFactor: original.dpr, mobile: false });
    await page.emulateMedia({ forcedColors: original.forcedColors ? 'active' : 'none', reducedMotion: original.reduced ? 'reduce' : 'no-preference' });
    if (originalViewport) await page.setViewportSize(originalViewport);
    await page.evaluate(async()=>{await document.fonts.ready;await new Promise<void>((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));});
    await page.evaluate(({ x, y }) => scrollTo({ left: x, top: y, behavior: 'instant' }), { x: original.scrollX, y: original.scrollY });
    await maintain?.();
    await session.detach();
    await page.evaluate(resumeReleaseActivity);
  }
  const finalValue=await semanticStateValue(page);
  if(initialValue!==finalValue){
    const before=JSON.parse(initialValue),after=JSON.parse(finalValue);
    const changed=Object.keys(before).filter((key)=>JSON.stringify(before[key])!==JSON.stringify(after[key])).map((key)=>`${key}: ${JSON.stringify(before[key]).slice(0,500)} -> ${JSON.stringify(after[key]).slice(0,500)}`);
    const error=new Error(`${input.id}: final profiles did not restore the original semantic state: ${changed.join('; ')}`) as Error&{observation:ReleaseState};
    error.observation={...input,profiles,activity};throw error;
  }
  const result={...input,profiles,activity};
  if(checkpoint)writeReleaseCheckpoint(process.cwd(),checkpoint,result);
  return result;
}

/** Final drivers keep only these small references, never the whole matrix. */
export async function captureReleaseState(page:Page,input:Omit<ReleaseState,'profiles'|'activity'>,maintain?:()=>Promise<void>):Promise<ReleaseStateReference>{
  if(!FINAL_CAPTURE_SOURCE_FINGERPRINT||!FINAL_CAPTURE_BUILD)throw new Error('final state capture requires the current successful production stamp');
  const state=await probeReleaseState(page,input,maintain);
  return writeReleaseStateRecord(process.cwd(),state,{source:FINAL_CAPTURE_SOURCE_FINGERPRINT,exported:FINAL_CAPTURE_BUILD.exportFingerprint});
}
export function writeReleaseStateGroup(group:string,expectedStateIds:readonly string[],cases:ReleaseStateReference[]):ReleaseStateManifest{
  const currentFingerprint=releaseSourceFingerprint(process.cwd());
  if(!FINAL_CAPTURE_SOURCE_FINGERPRINT||currentFingerprint!==FINAL_CAPTURE_SOURCE_FINGERPRINT)throw new Error('release capture source changed during the run, or final capture was not enabled; freeze source and rebuild before measuring');
  if(!FINAL_CAPTURE_BUILD||releaseExportFingerprint(process.cwd())!==FINAL_CAPTURE_BUILD.exportFingerprint)throw new Error('production export changed during release state capture');
  return writeReleaseStateManifest(process.cwd(),group,expectedStateIds,cases,{source:FINAL_CAPTURE_SOURCE_FINGERPRINT,exported:FINAL_CAPTURE_BUILD.exportFingerprint});
}
