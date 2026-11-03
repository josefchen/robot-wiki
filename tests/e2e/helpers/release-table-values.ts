import type { Page } from '@playwright/test';
import registry from '../../../contract/brand-v2-registries.json' with {type:'json'};
import type { ReleaseProfile } from '../../../lib/brand-v2-release-evidence';
import { collectFrame } from './interactive-frame-evidence';
import { PLAIN_TABLE_SOURCES } from '../../../lib/brand-v2-interactive-captures';

/** Capture the source configuration and the complete raw frame in the same
 * actual profile as its tables. The table marker is assigned by the separate
 * whole-document census, so a mount cannot silently borrow its neighbour. */
export async function collectReleaseTableFrames(page:Page,route:string,tableIds:readonly string[]):Promise<ReleaseProfile['tableFrames']>{
  if(!tableIds.length)return [];
  const result:ReleaseProfile['tableFrames']=[];
  const frames=page.locator('main [data-figure-frame]');
  const names=await frames.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-figure-frame')??''));
  const tidy=(value:string)=>value.replace(/[^a-z0-9]/gi,'').toLowerCase();
  for(const mount of registry.interactive.mounts.filter(mount=>mount.route===route)){
    const source=registry.interactive.sources.find(source=>source.id===mount.sourceId);
    if(!source)throw new Error(`unregistered profile table owner ${mount.id}`);
    const matching=names.flatMap((name,index)=>tidy(name)===tidy(source.component)?[index]:[]);
    const root=PLAIN_TABLE_SOURCES.has(mount.sourceId)?page.locator(`main [data-article-interactive="${source.component}"]`).nth(mount.ordinal-1):frames.nth(matching[mount.ordinal-1]??-1);
    if(!PLAIN_TABLE_SOURCES.has(mount.sourceId)&&matching[mount.ordinal-1]===undefined)throw new Error(`missing profile table owner ${mount.id}`);
    const owned=await root.locator('table[data-release-value-table]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-release-value-table')!));
    const bound=owned.filter(id=>tableIds.includes(id));
    if(!bound.length)continue;
    result.push({mountId:mount.id,sourceId:mount.sourceId,tableIds:bound,frame:await collectFrame(root)});
  }
  const bound=result.flatMap(frame=>frame.tableIds);
  if(new Set(bound).size!==bound.length)throw new Error('profile table is bound to multiple source owners');
  return result;
}
