import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import {
  RELEASE_EVIDENCE_DIRECTORY, RELEASE_PROFILES, RELEASE_STATE_VERSION,
  releaseSourceFingerprint, releaseStateProblems,
  type ReleaseProfile, type ReleaseState, type ReleaseStateArtifact,
} from '../../../lib/brand-v2-release-evidence';
import { documentOverflow } from './document-overflow';
import { readReleaseBuildStamp, releaseExportFingerprint } from '../../../lib/brand-v2-release-build';
import { collectReleaseResidueState } from './release-residue-state';
import { collectReleaseAccessibilityDetails } from './release-accessibility-details';
import { collectGlobalConvergence } from './global-convergence-collector';
import { collectorInput, readConvergenceRegistry } from '../../../lib/brand-v2-global-convergence-evidence';
import { RELEASE_ACCESSIBILITY_PREDICATES, type ReleaseAccessibility } from '../../../lib/brand-v2-release-accessibility';
import { decodePng } from '../../../lib/png-decode';

export const FINAL_RELEASE_PROFILES = process.env.ROBOT_WIKI_RELEASE_PROFILES === '1';
export const FINAL_CAPTURE_SOURCE_FINGERPRINT = FINAL_RELEASE_PROFILES ? releaseSourceFingerprint(process.cwd()) : null;
export const FINAL_CAPTURE_BUILD = FINAL_RELEASE_PROFILES ? readReleaseBuildStamp(process.cwd()) : null;
const accessibilityRegistry = readConvergenceRegistry(process.cwd());

/** A stable semantic digest excludes geometry and generated probe attributes.
 * It catches a measurement accidentally activating a control, losing state,
 * changing a selection or leaving a disclosure open. */
async function semanticState(page: Page): Promise<string> {
  const value = await page.evaluate(() => JSON.stringify({
    url: location.pathname + location.search + location.hash,
    controls: [...document.querySelectorAll('main input, main select, main textarea, main [aria-pressed], main [aria-selected], main details')].map((node) => ({
      tag: node.tagName, id: node.id,
      value: 'value' in node ? String(node.value) : null,
      checked: node instanceof HTMLInputElement ? node.checked : null,
      pressed: node.getAttribute('aria-pressed'), selected: node.getAttribute('aria-selected'),
      open: node instanceof HTMLDetailsElement ? node.open : null,
    })),
  }));
  return createHash('sha256').update(value).digest('hex');
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
      if (node === document.body && document.activeElement instanceof HTMLElement) document.activeElement.blur();
      else if (node instanceof HTMLElement && node.isConnected) node.focus({ preventScroll: true });
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
    const ids = new Set<string>();
    for (const node of document.querySelectorAll('[id]')) {
      if (ids.has(node.id)) failures.push(`duplicate id ${node.id}`);
      ids.add(node.id);
    }
    const controls = [...document.querySelectorAll('input:not([type=hidden]), select, textarea, button, summary, a[href], [role=button], [role=slider], [role=tab]')].filter(visible);
    for (const control of controls) {
      const label = text(control);
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
    if (active instanceof HTMLElement && controls.includes(active)) {
      const rect = active.getBoundingClientRect();
      const style = getComputedStyle(active);
      const painted = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 1 || style.boxShadow !== 'none';
      const centerX = Math.max(0, Math.min(innerWidth - 1, rect.x + rect.width / 2));
      const centerY = Math.max(0, Math.min(innerHeight - 1, rect.y + rect.height / 2));
      const top = document.elementFromPoint(centerX, centerY);
      focus.push({ selector: active.id ? `#${active.id}` : `${active.tagName}:${name(active).slice(0, 80)}`, reached: true,
        visible: active.matches(':focus-visible') ? painted : true,
        obscured: rect.bottom < 0 || rect.top >= innerHeight || (top !== null && !active.contains(top) && !top.contains(active)),
        name: name(active), label: text(active) });
    }
    return { mainCount: document.querySelectorAll('main, [role=main]').length,
      visibleTextCount: [...document.querySelectorAll('main *')].filter((node) => visible(node) && text(node)).length,
      fontsLoaded: document.fonts.status === 'loaded', semanticFailures: failures, focus,
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      forcedColorsActive: matchMedia('(forced-colors: active)').matches,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches };
  });
}

async function readIdleMotion(page: Page): Promise<NonNullable<ReleaseProfile['motion']>> {
  const pixels=async(canvas:ReturnType<Page['locator']>)=>createHash('sha256').update(decodePng(await canvas.screenshot()).rgba).digest('hex');
  const geometry = async () => createHash('sha256').update(await page.evaluate(() => JSON.stringify(
    [...document.querySelectorAll('main svg, main svg *')].filter((node) => node.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
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
export async function probeReleaseState(page: Page, input: Omit<ReleaseState, 'profiles'>, maintain?: () => Promise<void>): Promise<ReleaseState> {
  const originalViewport = page.viewportSize();
  const original = await page.evaluate(() => ({ dpr: devicePixelRatio, width: innerWidth, height: innerHeight,
    forcedColors: matchMedia('(forced-colors:active)').matches, reduced: matchMedia('(prefers-reduced-motion:reduce)').matches,
    scrollX, scrollY }));
  const session = await page.context().newCDPSession(page);
  const profiles: ReleaseProfile[] = [];
  const initial = await semanticState(page);
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
        if (active instanceof HTMLElement && active !== document.body && active !== document.documentElement) {
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
      let textStyle: Awaited<ReturnType<Page['addStyleTag']>> | undefined;
      if (plan.textOnly) {
        const sizes = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('body h1, body h2, body h3, body p, body button, body label, body a, body th, body td, body li, body summary, body input, body select')]
          .filter((node) => node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden' && !node.closest('.sr-only, [aria-hidden="true"]') &&
            (node.textContent?.trim() || node.matches('input, select, textarea')))
          .map((node, index) => { node.dataset.releaseTextProbe = String(index); return { index, baselinePx: parseFloat(getComputedStyle(node).fontSize) }; }));
        textStyle = await page.addStyleTag({ content: sizes.map(({ index, baselinePx }) => `[data-release-text-probe="${index}"]{font-size:${baselinePx * 2}px!important}`).join('\n') });
        textSizes = await page.evaluate((expected) => expected.map(({ index, baselinePx }) => {
          const node = document.querySelector<HTMLElement>(`[data-release-text-probe="${index}"]`)!;
          const style = getComputedStyle(node);
          const box = node.getBoundingClientRect();
          const clips = /hidden|clip/.test(style.overflow) && (node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1);
          return { selector: `[data-release-text-probe="${index}"] ${node.tagName.toLowerCase()}#${node.id} ${(node.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60)}`, baselinePx, actualPx: parseFloat(style.fontSize), visible: box.width > 0 && box.height > 0 && style.visibility !== 'hidden', clipped: clips };
        }), sizes);
      }
      try {
        const reading = await semanticReading(page);
        const axe = await new AxeBuilder({ page }).analyze();
        if(process.env.ROBOT_WIKI_RELEASE_PILOT==='1')console.log(`pilot ${input.id}: ${plan.id} Axe complete; checking disclosures`);
        const availability = await contentAvailability(page, baselineText);
        if(process.env.ROBOT_WIKI_RELEASE_PILOT==='1')console.log(`pilot ${input.id}: ${plan.id} disclosures complete`);
        const motion = plan.reducedMotion ? await readIdleMotion(page) : undefined;
        const residue = await page.evaluate(collectReleaseResidueState);
        const convergence=await page.evaluate(collectGlobalConvergence,collectorInput(plan.width<768?'frame:mobile':plan.width<1440?'frame:tablet':'frame:desktop',accessibilityRegistry));
        const details=await page.evaluate(collectReleaseAccessibilityDetails);
        const accessibility:ReleaseAccessibility={counts:convergence.counts,
          findings:convergence.findings.filter(({predicate})=>RELEASE_ACCESSIBILITY_PREDICATES.some((p)=>p===predicate)) as ReleaseAccessibility['findings'],...details};
        profiles.push({ id: plan.id, ...reading,
          ...(plan.zoomBase ? { requestedCssViewport: { width: plan.zoomBase.width / 2, height: plan.zoomBase.height / 2 } } : {}),
          documentOverflowPx: Math.max(0, await documentOverflow(page)),
          axeViolations: axe.violations.map(({ id, nodes }) => `${id}:${nodes.map(({ target }) => target.join(' ')).join(';')}`),
          hiddenRequiredContent: availability.hidden, requiredDisclosureIds: availability.requiredDisclosureIds, disclosures: availability.disclosures,
          ...(motion ? { motion } : {}),
          residue,
          accessibility,
          textSizes, stateBefore, stateAfter: await semanticState(page) });
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
    await page.evaluate(({ x, y }) => scrollTo({ left: x, top: y, behavior: 'instant' }), { x: original.scrollX, y: original.scrollY });
    await maintain?.();
    await session.detach();
  }
  if (initial !== await semanticState(page)) throw new Error(`${input.id}: final profiles did not restore the original semantic state`);
  return { ...input, profiles };
}

export function writeReleaseStateGroup(group: string, expectedStateIds: readonly string[], cases: ReleaseState[]): ReleaseStateArtifact {
  const currentFingerprint = releaseSourceFingerprint(process.cwd());
  if (!FINAL_CAPTURE_SOURCE_FINGERPRINT || currentFingerprint !== FINAL_CAPTURE_SOURCE_FINGERPRINT) throw new Error('release capture source changed during the run, or final capture was not enabled; freeze source and rebuild before measuring');
  if (!FINAL_CAPTURE_BUILD || releaseExportFingerprint(process.cwd()) !== FINAL_CAPTURE_BUILD.exportFingerprint) throw new Error('production export changed during release state capture');
  const artifact: ReleaseStateArtifact = { version: RELEASE_STATE_VERSION, sourceFingerprint: FINAL_CAPTURE_SOURCE_FINGERPRINT, exportFingerprint: FINAL_CAPTURE_BUILD.exportFingerprint, group, expectedStateIds: [...expectedStateIds], cases };
  const failures = releaseStateProblems(artifact, { fingerprint: artifact.sourceFingerprint, exportFingerprint: artifact.exportFingerprint, group, stateIds: expectedStateIds });
  const dir = join(process.cwd(), RELEASE_EVIDENCE_DIRECTORY);
  mkdirSync(dir, { recursive: true });
  if (failures.length) {
    writeFileSync(join(dir, `${group}.failed.json`), JSON.stringify({ artifact, failures }, null, 2) + '\n');
    throw new Error(failures.join('\n'));
  }
  writeFileSync(join(dir, `${group}.json`), JSON.stringify(artifact, null, 2) + '\n');
  return artifact;
}
