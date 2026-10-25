import { test, expect, type Locator } from './servo-apollo-fixture';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readerGateInputs } from './helpers/reader-gate-inputs';
import { citeParts, dismissCiteNote, showCiteNote } from './helpers/citation-note';
import { waitForHydration } from './interaction-ready';
for (const viewport of [{width:375,height:812},{width:1440,height:900}]) {
  test(`servo and Apollo source reader at ${viewport.width}px`, async ({page},testInfo) => {
    const captures: object[] = []; const errors: string[] = [];
    const {inputPath,inputSha256}=readerGateInputs(testInfo,'servo-apollo');
    page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.setViewportSize(viewport);
    const capture=async(name:string,state:object={})=>{
      const path=testInfo.outputPath(name+'.png');await page.screenshot({path,animations:'disabled'});
      captures.push({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex'),utc:new Date().toISOString(),url:page.url(),viewport,inputPath,inputSha256,state});
      writeFileSync(testInfo.outputPath('source-reader.json'),JSON.stringify({captures,errors},null,2));
    };
    const text=async(el:Locator,name:string)=>{
      await el.scrollIntoViewIfNeeded(); const box=await el.boundingBox();expect(box).not.toBeNull();
      for(let offset=0,part=1;offset<box!.height;offset+=viewport.height-180,part++){
        await el.evaluate((e,y)=>window.scrollBy(0,e.getBoundingClientRect().top-100+y),offset);
        await capture(name+'-'+part,{text:await el.innerText(),offset});
      }
    };
    for(const slug of ['perception','state-estimation']){
      await page.goto('/classical/'+slug+'/');await page.evaluate(()=>document.fonts.ready);await expect(page.locator('div.prose')).toBeVisible();
      // A screenshot hides the caret with an inline style, and React reports that as a hydration
      // mismatch on a lazily mounted figure's input it has not hydrated yet.
      await page.waitForFunction(()=>[...document.querySelectorAll('main input')].every(el=>Object.keys(el).some(k=>k.startsWith('__reactFiber$'))));
      const prose=page.locator('div.prose[data-pagefind-body]');
      if(slug==='perception'){
        await text(prose.locator('h2').filter({hasText:'Visual servoing:'}),'servo-heading');
        const paragraphs=prose.locator('p').filter({has:page.locator('[data-cite-id^="chaumette-hutchinson-"]')});
        expect(await paragraphs.count()).toBeGreaterThanOrEqual(3);
        for(let i=0;i<await paragraphs.count();i++)await text(paragraphs.nth(i),'servo-prose-'+(i+1));
        const term=prose.locator('[data-term-id="visual-servoing"]');await term.locator('a, button').first().focus();await expect(term.getByRole('tooltip')).toBeVisible();
        await expect(term.getByRole('tooltip')).toContainText('local stability conditions');await term.evaluate(el=>window.scrollBy(0,el.getBoundingClientRect().top-(innerHeight-120)));
        // The term re-places its tooltip in the next frame after a scroll, before that frame paints.
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const glossaryBox=await term.getByRole('tooltip').boundingBox();expect(glossaryBox!.y).toBeGreaterThanOrEqual(56);expect(glossaryBox!.y+glossaryBox!.height).toBeLessThanOrEqual(viewport.height);await capture('servo-glossary-focus',{glossaryBox});await page.keyboard.press('Escape');await page.keyboard.press('Tab');
      }else{
        await text(page.getByText('Ames nonlinear navigation studies',{exact:true}),'apollo-stat');
        const paragraphs=prose.locator('p').filter({has:page.locator('[data-cite-id="mcgee-schmidt-1985"]')});
        // Owner-approved successor (Josef, 2026-10-10, the research-page standard): exactly two
        // paragraphs cited McGee and Schmidt. The owner's verified rewrite of the classical articles
        // (db856b22, 7 October 2026) added a third, "Linearization holds near the estimate ...",
        // which cites the same history, so the exact count is three and all three are captured.
        expect(await paragraphs.count()).toBe(3);for(let i=0;i<3;i++)await text(paragraphs.nth(i),'apollo-prose-'+(i+1));
      }
      for(const id of slug==='perception'?['chaumette-hutchinson-2006','chaumette-hutchinson-2007']:['mcgee-schmidt-1985']){
        // Owner-approved successor (Josef, 2026-10-10, the research-page standard): hovering and then
        // focusing the chip's first link showed its role="tooltip" (with the authors) inside the
        // viewport, and Escape closed it. A citation is now a number with a sidenote
        // (helpers/citation-note.ts): the note shows on hover and on focus of the number (in the
        // margin at rest from 1200 px, opened inline by a click or Enter below it), carries the
        // same authors in its venue line, stays inside the viewport, and closes when the number is
        // pressed again.
        const cite=prose.locator('[data-cite-id="'+id+'"]').first();const {mark,note:tip}=citeParts(cite);await cite.scrollIntoViewIfNeeded();await waitForHydration(mark);await showCiteNote(page,cite,'hover');await expect(tip).toBeVisible();
        const hover=await tip.boundingBox();await dismissCiteNote(page,cite,'hover');await showCiteNote(page,cite,'keyboard');await expect(tip).toBeVisible();
        const box=await tip.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(viewport.width);expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.y+box!.height).toBeLessThanOrEqual(viewport.height);
        if(slug==='perception')await expect(tip).toContainText('François Chaumette');
        await capture(id+'-citation-focus',{hover,focus:box,text:await tip.innerText()});await dismissCiteNote(page,cite,'keyboard');await page.keyboard.press('Tab');
      }
      expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
    }
    expect(errors).toEqual([]);
  });
}
