import { test, expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const hash=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const title={kl:'Learning to Walk in Minutes Using Massively Parallel Deep Reinforcement Learning',rma:'RMA: Rapid Motor Adaptation for Legged Robots'};
// Scoped text-pair measurement complements, but does not erase, Axe incomplete
// SVG/chart checks elsewhere on the page. No style is injected into the product.
async function measureText(root: Locator) {
  return root.evaluate(element => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    const rgba = (color: string) => {
      ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data];
    };
    const mix = (fg: number[], bg: number[]) => {
      const alpha = fg[3] / 255;
      return [0, 1, 2].map(i => fg[i] * alpha + bg[i] * (1 - alpha)).concat(255);
    };
    const luminance = (color: number[]) => color.slice(0, 3).map(v => {
      const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }).reduce((n, c, i) => n + c * [0.2126, 0.7152, 0.0722][i], 0);
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const pairs = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent?.trim() || !node.parentElement) continue;
      const parent = node.parentElement;
      if (!parent.getClientRects().length) continue;
      const style = getComputedStyle(parent);
      if (style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
      const chain: Element[] = [];
      for (let e: Element | null = parent; e; e = e.parentElement) chain.unshift(e);
      let bg = [255, 255, 255, 255];
      for (const e of chain) bg = mix(rgba(getComputedStyle(e).backgroundColor), bg);
      const fg = mix(rgba(style.color), bg), a = luminance(fg), b = luminance(bg);
      const size = parseFloat(style.fontSize), bold = Number(style.fontWeight) >= 700;
      pairs.push({ text: node.textContent.trim(), foreground: fg, background: bg,
        ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
        required: size >= 24 || (bold && size >= 18.66) ? 3 : 4.5,
        fontSize: size, fontFamily: style.fontFamily });
    }
    return pairs;
  });
}
async function bounds(loc:Locator,page:Page){const b=await loc.boundingBox();expect(b).not.toBeNull();const v=page.viewportSize()!;expect(b!.x).toBeGreaterThanOrEqual(0);expect(b!.x+b!.width).toBeLessThanOrEqual(v.width+1);expect(b!.y).toBeGreaterThanOrEqual(0);expect(b!.y+b!.height).toBeLessThanOrEqual(v.height+1);return b;}
for(const width of [375,1440])for(const kind of ['kl','rma'] as const){
 test(`${kind} source reader at ${width}px`,async({page,context},info)=>{
  test.setTimeout(150000);
  const out=process.env.RMA_READER_OUT??info.outputDir;mkdirSync(out,{recursive:true});const run=process.env.RMA_READER_RUN??'reader';
  const inputPath=process.env.RMA_READER_OUT?join(out,`${run}.inputs.json`):undefined;
  const inputHash=inputPath?hash(inputPath):undefined;
  const captures:object[]=[],denied:string[]=[],errors:string[]=[],observations:object[]=[];
  await context.route('**/*',route=>{const u=new URL(route.request().url());if(['127.0.0.1','localhost'].includes(u.hostname))return route.continue();denied.push(u.href);return route.abort();});
  page.on('pageerror',e=>errors.push(String(e)));
  await context.addInitScript(()=>{const style=document.createElement('style');style.textContent='*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}';if(document.documentElement)document.documentElement.appendChild(style);else{const observer=new MutationObserver(()=>{if(document.documentElement){document.documentElement.appendChild(style);observer.disconnect();}});observer.observe(document,{childList:true});}});
  await page.setViewportSize({width,height:width===375?812:900});
  const capture=async(state:string,loc?:Locator)=>{const path=join(out,`${run}-${kind}-${width}-${state}.png`);if(loc)await loc.screenshot({path,animations:'disabled'});else await page.screenshot({path,animations:'disabled'});captures.push({path,sha256:hash(path),state,route:page.url(),viewport:page.viewportSize(),at:new Date().toISOString(),inputPath,inputHash});};
  const fontProbe=async(selector:string)=>{const cdp=await context.newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const d=await cdp.send('DOM.getDocument');const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:d.root.nodeId,selector});expect(nodeId).toBeGreaterThan(0);const fonts=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});expect(fonts.fonts.length).toBeGreaterThan(0);expect(fonts.fonts.every(f=>f.isCustomFont)).toBe(true);const styles=await page.locator(selector).evaluate(e=>{const s=getComputedStyle(e);return {text:[...e.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(''),fontFamily:s.fontFamily,fontSize:s.fontSize,lineHeight:s.lineHeight,color:s.color,background:s.backgroundColor};});const contrast=await measureText(page.locator(selector));expect(contrast.length).toBeGreaterThan(0);expect(contrast.every(c=>c.ratio>=c.required)).toBe(true);observations.push({selector,fonts,styles,contrast});await cdp.detach();};
  try{
   await page.goto(`/rl-sim2real/${kind==='kl'?'reward-design-mpc':'sim2real-transfer'}/`,{waitUntil:'networkidle',timeout:120000});await page.evaluate(()=>document.fonts.ready);
   const para=page.locator('p').filter({hasText:kind==='kl'?'Rudin and colleagues use an adaptive learning rate':'RMA uses a different two-stage construction:'});await expect(para).toHaveCount(1);
   const prose=await para.innerText();if(kind==='kl'){for(const s of ['desired KL of 0.01','exceeds twice the target','below half the target','This mechanism does not establish that reward retuning is stable.'])expect(prose).toContain(s);expect(prose).not.toContain('weight-retuning loop stays survivable');}else{for(const s of ['50 state-action steps (0.5 seconds of history)','about 10 Hz','100 Hz using the latest estimate','not online gradient updates','without real-world fine-tuning','multiple leg obstructions','not a guarantee of recovering each physical parameter'])expect(prose).toContain(s);await expect(page.getByText('RMA reported adaptation',{exact:true})).toBeVisible();await expect(page.getByText('A1: latent ~10 Hz; base policy 100 Hz',{exact:true})).toBeVisible();await capture('stat',page.getByText('RMA reported adaptation',{exact:true}).locator('..'));}
   await para.scrollIntoViewIfNeeded();await capture('prose',para);observations.push({prose});await fontProbe('h1');
   await para.evaluate(e=>e.setAttribute('data-reader-prose',''));await fontProbe('[data-reader-prose]');
   const id=kind==='kl'?'rudin-2021':'rma-2021';const cite=para.locator(`[data-cite-id="${id}"]`);const link=cite.getByRole('link',{name:kind==='kl'?'Rudin 2021':'Kumar 2021',exact:true});await expect(link).toHaveCount(1);await expect(link).toHaveAttribute('href',kind==='kl'?'https://arxiv.org/abs/2109.11978':'https://arxiv.org/abs/2107.04034');
   await link.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await link.hover();const tip=cite.getByRole('tooltip');await expect(tip).toBeVisible();expect(await tip.innerText()).toContain(title[kind]);await bounds(tip,page);await capture('citation-hover');
   await page.mouse.move(width-1,1);await link.focus();await expect(tip).toBeVisible();await bounds(tip,page);await capture('citation-focus');await cite.evaluate(e=>e.setAttribute('data-reader-citation',''));await fontProbe('[data-reader-citation] [role="tooltip"]');await fontProbe('[data-reader-citation] a:first-child');await fontProbe('[data-reader-citation] a[href^="#"] span');
   // The tooltip deliberately abbreviates >3 authors. The existing keyboard
   // jump reaches References, which renders all four without a disclosure.
   await page.keyboard.press('Tab');const jump=cite.getByRole('link',{name:`Jump to the full reference for ${title[kind]}`,exact:true});await expect(jump).toBeFocused();await page.keyboard.press('Enter');
   const ref=page.locator(`[data-reference-id="${id}"]`);await ref.scrollIntoViewIfNeeded();const names=ref.locator('[data-author-names]');const expected=kind==='kl'?['Nikita Rudin','David Hoeller','Philipp Reist','Marco Hutter']:['Ashish Kumar','Zipeng Fu','Deepak Pathak','Jitendra Malik'];expect(await names.innerText()).toBe(expected.join(', '));await expect(ref.getByRole('link',{name:title[kind],exact:true})).toBeVisible();await capture('full-reference',ref);await fontProbe(`[data-reference-id="${id}"] [data-author-names]`);await fontProbe(`[data-reference-id="${id}"] [data-reference-source-link]`);
   const termId=kind==='kl'?'ppo':'teacher-student-distillation';const term=page.locator(`[data-term-id="${termId}"]`).first();const termLink=term.getByRole('link');await termLink.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.mouse.move(width-1,1);await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));await termLink.hover();const termTip=term.getByRole('tooltip');await expect(termTip).toBeVisible();await capture('term-hover');observations.push({termHoverBounds:await termTip.boundingBox()});await bounds(termTip,page);
   const usableTop=await page.locator('header').evaluateAll(headers=>Math.max(0,...headers.filter(h=>{const s=getComputedStyle(h),r=h.getBoundingClientRect();return ['sticky','fixed'].includes(s.position)&&r.width>0&&r.height>0&&r.top<=0;}).map(h=>h.getBoundingClientRect().bottom)));
   expect((await termTip.boundingBox())!.y).toBeGreaterThanOrEqual(usableTop);
   // A definition that fits neither side stays complete in its own scroll
   // region, without extra page scrolling or covering the focused link.
   if(await termTip.evaluate(e=>e.scrollHeight>e.clientHeight)){
     await termLink.focus();await page.keyboard.press('Tab');await expect(termTip).toBeFocused();await page.keyboard.press('End');
     await expect.poll(()=>termTip.evaluate(e=>e.scrollTop+e.clientHeight>=e.scrollHeight-1)).toBe(true);
     await bounds(termTip,page);await capture('term-definition-end');await termLink.focus();await termTip.evaluate(e=>{e.scrollTop=0;});
   }
   await page.mouse.move(width-1,1);await termLink.focus();await bounds(termTip,page);const definition=await termTip.innerText();expect(definition.toLowerCase()).toContain(kind==='kl'?'proximal':'rma instead trained a base policy with a privileged encoder');await capture('term-focus');await term.evaluate(e=>e.setAttribute('data-reader-term',''));await fontProbe('[data-reader-term] [role="tooltip"] span:last-child');observations.push({definition});await page.keyboard.press('Tab');
   if(kind==='rma'){
    const quiz=page.locator('[data-self-check]');await expect(quiz).toHaveCount(1);await expect(quiz).toContainText('Which RMA component estimates');const answer=quiz.getByRole('radio',{name:'A separately trained adaptation module',exact:true});await answer.focus();await page.keyboard.press('Space');await expect(quiz.locator('details')).toHaveAttribute('open','');await expect(quiz).toContainText('The reported sub-second adaptation is not a control-frequency or gradient-update claim');await expect(quiz).toContainText('neither an exact friction estimate nor adaptation at every control step is promised');await capture('quiz',quiz);
    if(width===375){await page.getByRole('button',{name:'Open navigation menu',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await capture('drawer');await expect(page.locator('main')).toHaveAttribute('inert','');const close=dialog.getByRole('button',{name:'Close navigation menu',exact:true});await expect(close).toBeFocused();await page.keyboard.press('Shift+Tab');const first=dialog.getByRole('link',{name:'Robot Wiki',exact:true});await expect(first).toBeFocused();await page.keyboard.press('Shift+Tab');const last=dialog.getByRole('link',{name:'Credits',exact:true});await expect(last).toBeFocused();await page.keyboard.press('Tab');await expect(first).toBeFocused();await page.keyboard.press('Tab');await expect(close).toBeFocused();await page.keyboard.press('Tab');expect(await dialog.evaluate(e=>e.contains(document.activeElement))).toBe(true);await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(page.getByRole('button',{name:'Open navigation menu',exact:true})).toBeFocused();}
   }
   const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth}));expect(overflow.scroll).toBeLessThanOrEqual(overflow.inner+1);const axe=await new AxeBuilder({page}).analyze();observations.push({overflow,axe});expect(axe.violations).toEqual([]);expect(denied).toEqual([]);expect(errors).toEqual([]);
  }finally{writeFileSync(join(out,`${run}-${kind}-${width}-result.json`),JSON.stringify({at:new Date().toISOString(),kind,width,inputPath,inputHash,captures,observations,denied,errors,developmentUiHidden:false},null,2)+'\n');}
 });
}
