import { test, expect, type Locator } from './servo-apollo-fixture';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
for (const viewport of [{width:375,height:812},{width:1440,height:900}]) {
  test(`servo and Apollo source reader at ${viewport.width}px`, async ({page},testInfo) => {
    const captures: object[] = []; const errors: string[] = [];
    const inputPath=process.env.ROBOT_WIKI_GATE_INPUTS!;
    const inputSha256=createHash('sha256').update(readFileSync(inputPath)).digest('hex');
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
      const prose=page.locator('div.prose[data-pagefind-body]');
      if(slug==='perception'){
        await text(prose.locator('h2').filter({hasText:'Visual servoing:'}),'servo-heading');
        const paragraphs=prose.locator('p').filter({has:page.locator('[data-cite-id^="chaumette-hutchinson-"]')});
        expect(await paragraphs.count()).toBeGreaterThanOrEqual(3);
        for(let i=0;i<await paragraphs.count();i++)await text(paragraphs.nth(i),'servo-prose-'+(i+1));
        const term=prose.locator('[data-term-id="visual-servoing"]');await term.locator('a, button').first().focus();await expect(term.getByRole('tooltip')).toBeVisible();
        await expect(term.getByRole('tooltip')).toContainText('local stability conditions');await term.evaluate(el=>window.scrollBy(0,el.getBoundingClientRect().top-(innerHeight-120)));const glossaryBox=await term.getByRole('tooltip').boundingBox();expect(glossaryBox!.y).toBeGreaterThanOrEqual(56);expect(glossaryBox!.y+glossaryBox!.height).toBeLessThanOrEqual(viewport.height);await capture('servo-glossary-focus',{glossaryBox});await page.keyboard.press('Escape');await page.keyboard.press('Tab');
      }else{
        await text(page.getByText('Ames nonlinear navigation studies',{exact:true}),'apollo-stat');
        const paragraphs=prose.locator('p').filter({has:page.locator('[data-cite-id="mcgee-schmidt-1985"]')});
        expect(await paragraphs.count()).toBe(2);for(let i=0;i<2;i++)await text(paragraphs.nth(i),'apollo-prose-'+(i+1));
      }
      for(const id of slug==='perception'?['chaumette-hutchinson-2006','chaumette-hutchinson-2007']:['mcgee-schmidt-1985']){
        const cite=prose.locator('[data-cite-id="'+id+'"]').first();await cite.scrollIntoViewIfNeeded();await cite.locator('a, button').first().hover();await expect(cite.getByRole('tooltip')).toBeVisible();
        const hover=await cite.getByRole('tooltip').boundingBox();await cite.locator('a, button').first().focus();const tip=cite.getByRole('tooltip');await expect(tip).toBeVisible();
        const box=await tip.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(viewport.width);expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.y+box!.height).toBeLessThanOrEqual(viewport.height);
        if(slug==='perception')await expect(tip).toContainText('François Chaumette');
        await capture(id+'-citation-focus',{hover,focus:box,text:await tip.innerText()});await page.keyboard.press('Escape');await page.keyboard.press('Tab');
      }
      expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
    }
    expect(errors).toEqual([]);
  });
}
