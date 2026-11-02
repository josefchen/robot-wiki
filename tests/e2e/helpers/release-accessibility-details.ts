import type { ReleaseAccessibility } from '../../../lib/brand-v2-release-accessibility';

/** In-page structural census. Missing annotations never shrink meaningful
 * SVG/canvas or table populations; each discovered subject keeps its proof. */
export function collectReleaseAccessibilityDetails(): Pick<ReleaseAccessibility,'tables'|'graphics'|'scrollRegions'|'svgText'> {
  const visible=(node:Element)=>node.checkVisibility({opacityProperty:true,visibilityProperty:true})&&node.getClientRects().length>0;
  const label=(node:Element)=>`${node.tagName.toLowerCase()}${node.id?'#'+node.id:''} ${node.getAttribute('aria-label')??''}`.trim();
  const idText=(ids:string|null)=>ids?.split(/\s+/).map((id)=>document.getElementById(id)?.textContent??'').join(' ').trim()??'';
  const name=(node:Element)=>idText(node.getAttribute('aria-labelledby'))||node.getAttribute('aria-label')||node.querySelector(':scope > title, :scope > caption')?.textContent?.trim()||'';
  const controls='button,input:not([type=hidden]),select,textarea,summary,a[href],[role=button],[role=slider],[tabindex]';
  const frame=(node:Element)=>node.closest('[data-figure-frame],figure,[data-playground-workbench],section[aria-label],section[aria-labelledby],[role=region]')??node.parentElement!;
  const alternative=(node:Element)=>{
    const direct=idText(node.getAttribute('aria-describedby'));
    if(direct)return {text:direct,binding:'aria-describedby'};
    const host=frame(node);const hostDescription=idText(host.getAttribute('aria-describedby'));
    if(hostDescription)return {text:hostDescription,binding:'named containing region aria-describedby'};
    const bound=host.querySelector('[data-chart-description],figcaption,[data-figure-readout],[data-testid="tech-telemetry"]');
    if(bound?.textContent?.trim())return {text:bound.textContent.trim(),binding:'same figure or named instrument region'};
    const table=host.querySelector('table');
    return table?.textContent?.trim()?{text:table.textContent.trim(),binding:'same figure or named instrument region table'}:{text:'',binding:''};
  };
  const tables=[...document.querySelectorAll('main table')].filter(visible).map((table,index)=>{
    const rows=[...table.querySelectorAll('tr')];const allHeaders=[...table.querySelectorAll('th')];const unassociated:string[]=[];
    const columnHeaders=rows.flatMap((row,rowIndex)=>[...row.children].flatMap((cell,column)=>cell.tagName==='TH'&&(cell.getAttribute('scope')==='col'||cell.getAttribute('scope')==='colgroup'||rowIndex===0)?[{column,start:column,span:Number(cell.getAttribute('colspan')??1)}]:[]));
    let cells=0;
    rows.forEach((row,rowIndex)=>{
      let column=0;
      for(const cell of row.children){
        const span=Number(cell.getAttribute('colspan')??1);
        if(cell.tagName==='TD'){
          cells++;
          const explicit=(cell.getAttribute('headers')??'').trim().split(/\s+/).filter(Boolean);
          const associated=explicit.length?explicit.every((id)=>table.querySelector('th#'+CSS.escape(id))):columnHeaders.some((head)=>column>=head.start&&column<head.start+head.span);
          if(!associated)unassociated.push(`row:${rowIndex+1},column:${column+1}`);
        }
        column+=span;
      }
    });
    return {id:`table:${index}:${label(table)}`,name:name(table),headers:allHeaders.length,cells,unassociated};
  });
  const graphics=[...document.querySelectorAll('main svg,main canvas')].filter((node)=>{
    if(!visible(node)||node.closest('button,a,summary'))return false;
    const box=node.getBoundingClientRect();
    // A hidden-to-AT chart with a visible data-table twin is still a visual
    // instrument. Tiny decorative symbols remain out of this population.
    return !node.closest('[aria-hidden="true"]')||box.width>=100&&box.height>=40;
  }).map((node,index)=>{
    const host=frame(node);const alt=alternative(node);
    const candidates=[...host.querySelectorAll<HTMLElement>(controls)].filter((item)=>visible(item)&&!item.matches(':disabled')&&!item.closest('[inert]'));
    const geometry=[...node.querySelectorAll('path,line,rect,circle,ellipse,polyline,polygon')].filter((item)=>!item.closest('defs,clipPath,mask,pattern'));
    const visibleGeometry=geometry.filter((item)=>{
      if(!visible(item))return false;const style=getComputedStyle(item);
      const background=getComputedStyle(node).backgroundColor;
      return (style.fill!=='none'&&style.fill!=='transparent'&&style.fill!=='rgba(0, 0, 0, 0)'&&style.fill!==background)||(style.stroke!=='none'&&style.stroke!=='transparent'&&Number.parseFloat(style.strokeWidth)>0);
    }).length;
    return {id:`graphic:${index}:${label(node)}`,name:name(node)||name(host),alternative:alt.text,binding:alt.binding,
      interactive:Boolean(node.querySelector(controls))||node instanceof HTMLCanvasElement&&candidates.length>0,
      keyboardControls:candidates.filter((item)=>item.tabIndex>=0).length,geometry:geometry.length,visibleGeometry,hiddenFromAT:Boolean(node.closest('[aria-hidden="true"]'))};
  });
  const scrollRegions=[...document.querySelectorAll<HTMLElement>('main [role=region],main [tabindex]')].filter((node)=>visible(node)&&node.scrollWidth>node.clientWidth+1&&Boolean(node.querySelector('table,svg,canvas'))).map((node,index)=>({id:`scroll:${index}:${label(node)}`,name:name(node),keyboard:node.tabIndex>=0,alternative:node.textContent?.trim()??''}));
  type Colour={r:number;g:number;b:number;a:number};
  const rgba=(value:string):Colour|null=>{const values=/rgba?\(([^)]+)\)/.exec(value)?.[1].split(/[, /]+/).map(Number);return values&&values.length>=3?{r:values[0],g:values[1],b:values[2],a:values[3]??1}:null;};
  const blend=(top:Colour,bottom:Colour):Colour=>({r:top.r*top.a+bottom.r*(1-top.a),g:top.g*top.a+bottom.g*(1-top.a),b:top.b*top.a+bottom.b*(1-top.a),a:1});
  const ground=(node:Element|null):Colour=>{if(!node)return {r:255,g:255,b:255,a:1};const colour=rgba(getComputedStyle(node).backgroundColor);return colour?blend(colour,ground(node.parentElement)):ground(node.parentElement);};
  const light=(c:Colour)=>{const channel=(n:number)=>{const v=n/255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;};return .2126*channel(c.r)+.7152*channel(c.g)+.0722*channel(c.b);};
  const svgText=[...document.querySelectorAll('main svg text')].filter((node)=>visible(node)&&node.textContent?.trim()).flatMap((node,index)=>{
    const style=getComputedStyle(node);const foreground=rgba(style.fill);if(!foreground)return [{id:`svg-text:${index}:${node.textContent}`,foreground:style.fill,background:'unresolved',ratio:0,required:4.5}];
    const background=ground(node);const fg=light(blend(foreground,background));const bg=light(background);const size=Number.parseFloat(style.fontSize);
    return [{id:`svg-text:${index}:${node.textContent}`,foreground:style.fill,background:`rgb(${background.r}, ${background.g}, ${background.b})`,ratio:(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05),required:size>=24||size>=18.66&&Number(style.fontWeight)>=700?3:4.5}];
  });
  return {tables,graphics,scrollRegions,svgText};
}
