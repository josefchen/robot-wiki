export type TextPopulationMember={id:string;selector:string;baselinePx:number;text:string};

/** Baseline census happens before injection. Product annotations cannot
 * opt out an otherwise matching, visibly rendered text member. */
export function captureTextPopulation(selectors:readonly string[]):TextPopulationMember[]{
  const cssPath=(node:Element)=>{
    if(node.id&&document.querySelectorAll('#'+CSS.escape(node.id)).length===1)return '#'+CSS.escape(node.id);
    const parts:string[]=[];for(let current:Element|null=node;current&&current!==document.body;current=current.parentElement){
      const siblings=[...(current.parentElement?.children??[])].filter((sibling)=>sibling.tagName===current!.tagName);
      parts.unshift(current.tagName.toLowerCase()+`:nth-of-type(${siblings.indexOf(current)+1})`);
    }return 'body > '+parts.join(' > ');
  };
  return [...document.querySelectorAll<HTMLElement>(selectors.join(','))].filter((node)=>node.checkVisibility({opacityProperty:true,visibilityProperty:true})&&node.getClientRects().length>0&&!node.closest('.sr-only,[aria-hidden="true"]')&&node.textContent?.trim())
    .map((node,index)=>{node.dataset.releaseTextProbe=String(index);return {id:`text:${index}`,selector:cssPath(node),baselinePx:parseFloat(getComputedStyle(node).fontSize),text:node.textContent?.replace(/\s+/g,' ').trim().slice(0,120)??''};});
}

/** Measures actual text ranges through their ancestors. Deliberately
 * nonvisual descendants never become a visual clipping failure; scrolling
 * instruments are validated separately for names, keys and alternatives. */
export function measureTextPopulation(expected:TextPopulationMember[]){
  const allText:Array<{member:number;owner:Element;rect:DOMRect;exposed:DOMRect|null;plane:Element|null}>=[];
  const textPlane=(owner:Element,rect:DOMRect)=>{
    let plane:Element|null=null,exposed:DOMRect|null=rect;
    for(let ancestor:Element|null=owner;ancestor&&ancestor!==document.documentElement;ancestor=ancestor.parentElement){
      const css=getComputedStyle(ancestor),x=/^(auto|scroll|hidden|clip)$/.test(css.overflowX),y=/^(auto|scroll|hidden|clip)$/.test(css.overflowY);
      if(!plane&&(css.position==='fixed'||css.position==='sticky'||x&&ancestor.scrollWidth>ancestor.clientWidth+1||y&&ancestor.scrollHeight>ancestor.clientHeight+1))plane=ancestor;
      if(exposed&&(x||y)){
        const box=ancestor.getBoundingClientRect();const left:number=x?Math.max(exposed.left,box.left+ancestor.clientLeft):exposed.left,right:number=x?Math.min(exposed.right,box.left+ancestor.clientLeft+ancestor.clientWidth):exposed.right,top:number=y?Math.max(exposed.top,box.top+ancestor.clientTop):exposed.top,bottom:number=y?Math.min(exposed.bottom,box.top+ancestor.clientTop+ancestor.clientHeight):exposed.bottom;
        exposed=right>left&&bottom>top?new DOMRect(left,top,right-left,bottom-top):null;
      }
    }
    return {exposed,plane};
  };
  const ink=new OffscreenCanvas(1,1).getContext('2d');
  if(!ink)throw new Error('text-only glyph measurement has no 2D text metrics');
  const glyphBounds=(owner:Element,value:string,rect:DOMRect)=>{
    const css=getComputedStyle(owner);
    ink.font=`${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
    const metrics=ink.measureText(value);
    const fontHeight=metrics.fontBoundingBoxAscent+metrics.fontBoundingBoxDescent;
    if(!(fontHeight>0)||!Number.isFinite(metrics.actualBoundingBoxAscent+metrics.actualBoundingBoxDescent))throw new Error('text-only glyph metrics are unavailable');
    const scale=rect.height/fontHeight;
    // Range rectangles include the font's full ascent/descent, even when
    // those pixels contain no glyph. Use measured ink bounds vertically;
    // retaining the entire horizontal advance is conservative for collision.
    return new DOMRect(rect.x,rect.top+(metrics.fontBoundingBoxAscent-metrics.actualBoundingBoxAscent)*scale,rect.width,(metrics.actualBoundingBoxAscent+metrics.actualBoundingBoxDescent)*scale);
  };
  const readings=expected.map((member,index)=>{
    const node=document.querySelector<HTMLElement>(`[data-release-text-probe="${index}"]`);
    if(!node)return {...member,actualPx:null,visible:false,clipped:false,overlapped:false};
    const style=getComputedStyle(node);const box=node.getBoundingClientRect();
    const texts:Array<{owner:Element;rect:DOMRect}>=[];
    const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);
    for(let text=walker.nextNode();text;text=walker.nextNode()){
      const owner=text.parentElement;if(!owner||!text.textContent?.trim()||owner.closest('.sr-only,.katex-mathml,[aria-hidden="true"],script,style,template'))continue;
      if(!owner.checkVisibility({opacityProperty:true,visibilityProperty:true}))continue;
      let nonvisual=false;
      for(let ancestor:Element|null=owner;ancestor&&ancestor!==node.parentElement;ancestor=ancestor.parentElement){
        const css=getComputedStyle(ancestor),bounds=ancestor.getBoundingClientRect();
        if(css.position==='absolute'&&bounds.width<=1&&bounds.height<=1&&/^inset\(\s*50%/.test(css.clipPath)){nonvisual=true;break;}
      }
      if(nonvisual)continue;
      const range=document.createRange();range.selectNodeContents(text);
      for(const rangeRect of range.getClientRects())if(rangeRect.width>1&&rangeRect.height>1){const rect=glyphBounds(owner,text.textContent,rangeRect);texts.push({owner,rect});allText.push({member:index,owner,rect,...textPlane(owner,rect)});}
    }
    let clipped=false;let overlapped=false;
    for(const {owner,rect}of texts){
      for(let ancestor:Element|null=owner;ancestor&&ancestor!==document.documentElement;ancestor=ancestor.parentElement){
        const css=getComputedStyle(ancestor);if(css.display==='inline'||css.display==='contents')continue;
        const bounds=ancestor.getBoundingClientRect();
        if(/^(hidden|clip)$/.test(css.overflowX)&&(rect.left<bounds.left-1||rect.right>bounds.right+1))clipped=true;
        if(/^(hidden|clip)$/.test(css.overflowY)&&(rect.top<bounds.top-1||rect.bottom>bounds.bottom+1))clipped=true;
      }
    }
    for(let i=0;i<texts.length&&!overlapped;i++)for(let j=i+1;j<texts.length;j++){
      const a=texts[i].rect,b=texts[j].rect;
      const width=Math.min(a.right,b.right)-Math.max(a.left,b.left),height=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
      // Same-line siblings may touch through glyph kerning. Distinct line
      // rectangles overlapping by more than 30% of their height are not a
      // typography tolerance; cross-element collisions are also collected
      // by the registered-member comparison below.
      if(Math.abs(a.top-b.top)>Math.min(a.height,b.height)*.3&&width>2&&height>Math.min(a.height,b.height)*.3){overlapped=true;break;}
    }
    return {...member,actualPx:parseFloat(style.fontSize),visible:box.width>0&&box.height>0&&node.checkVisibility({opacityProperty:true,visibilityProperty:true}),clipped,overlapped};
  });
  // Compare only the registered text members, keeping headings, prose and
  // their controls in scope without turning the test into a new SVG/leaf
  // census. Ancestor/descendant members share text and are not collisions.
  const buckets=new Map<number,number[]>();
  allText.forEach(({rect},index)=>{for(let row=Math.floor(rect.top/64);row<=Math.floor(rect.bottom/64);row++){const entries=buckets.get(row)??[];entries.push(index);buckets.set(row,entries);}});
  for(const entries of buckets.values())for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
    const a=allText[entries[i]],b=allText[entries[j]];
    if(a.member===b.member||a.owner===b.owner||a.owner.contains(b.owner)||b.owner.contains(a.owner))continue;
    // Keep every text member. Within one scroll plane its full content is
    // compared, including content reached by scrolling. Across planes only
    // currently exposed glyphs can collide with the surrounding page.
    const ar=a.plane===b.plane?a.rect:a.exposed,br=a.plane===b.plane?b.rect:b.exposed;
    if(!ar||!br)continue;
    const width=Math.min(ar.right,br.right)-Math.max(ar.left,br.left);
    const height=Math.min(ar.bottom,br.bottom)-Math.max(ar.top,br.top);
    if(width>2&&height>Math.min(ar.height,br.height)*.3){readings[a.member].overlapped=true;readings[b.member].overlapped=true;}
  }
  return readings;
}
