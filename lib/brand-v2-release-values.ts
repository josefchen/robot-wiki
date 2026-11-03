import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { ReleaseProfile } from './brand-v2-release-evidence.ts';
import type { SourceParityVerdict } from './brand-v2-source-parity.ts';
import { SOURCE_ORACLES } from './brand-v2-source-oracles.ts';
import { SourceOracleContext,normalized } from './brand-v2-source-oracle-core.ts';
import { getCitation } from '../data/citations.ts';

const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
type Table=ReleaseProfile['interaction']['tables'][number];
// The independent visible census excludes the sort indicator's aria-hidden
// arrow. Its native aria-sort and source sort state are checked separately;
// only that terminal indicator is removed from column names, never values.
const heading=(value:string)=>normalized(value).replace(/[↑↓]$/,'');
const cells=(table:{headers:string[];cells:Array<{row:string;column:string;text:string}>})=>({headers:table.headers.map(heading),cells:table.cells.map(({row,column,text})=>({row:normalized(row),column:heading(column),text:normalized(text)}))});

/** A mount-level default pass is never a profile-state table proof. Re-run
 * the independent source oracle on the configuration actually measured in
 * this profile, then reconcile its exact raw table with the other census. */
export function profileTableValueProof(input:{id:string;route:string;table:Table;frames:ReleaseProfile['tableFrames'];mounts:readonly {id:string;sourceId:string;route:string}[]}):SourceParityVerdict|null{
  const owners=input.frames.filter(frame=>frame.tableIds.includes(input.table.id));
  if(!owners.length)return null;
  const failures:string[]=[];
  if(owners.length!==1)return {failures:['table has multiple source/configuration owners'],observed:{table:input.table.id,owners:owners.map(frame=>frame.mountId)},evidencePaths:[]};
  const owner=owners[0],mount=input.mounts.find(mount=>mount.id===owner.mountId),oracle=SOURCE_ORACLES[owner.sourceId];
  if(!mount||mount.sourceId!==owner.sourceId||mount.route!==input.route)failures.push('table source/configuration belongs to another mount or route');
  if(new Set(owner.tableIds).size!==owner.tableIds.length||owner.tableIds.length>owner.frame.tables.length)failures.push('source-frame table population differs from independent document census');
  const matches=owner.frame.tables.filter(raw=>JSON.stringify(cells(raw))===JSON.stringify(cells(input.table)));
  if(matches.length!==1)failures.push('rendered table differs from its exact source/configuration frame or has an ambiguous binding');
  const context=oracle?new SourceOracleContext(owner.frame,oracle,input.id):null;
  if(!context||!oracle)failures.push('table source lacks its independent value oracle');
  else{
    for(const basis of oracle.basis.filter(({kind})=>kind==='citation')){
      const citation=getCitation(basis.id),credit=oracle.citationText?.[basis.id];
      const linked=owner.frame.sourceBindings.some(binding=>binding.citationId===basis.id||binding.href===citation?.url||binding.href===`#ref-${basis.id}`);
      const printed=credit!==undefined&&normalized(owner.frame.text).includes(normalized(credit));
      if(!linked&&!printed)failures.push(`table source citation binding missing: ${basis.id}`);
    }
    try{oracle.check(context);context.finish();}catch(error){context.failures.push(error instanceof Error?error.message:String(error));}
    failures.push(...context.failures);
  }
  return {failures,observed:{mountId:owner.mountId,sourceId:owner.sourceId,tableId:input.table.id,tableSha256:hash(input.table),frameSha256:hash(owner.frame),controls:owner.frame.controls,sourceInputs:owner.frame.declaredBindings,checks:context?.checks??[]},evidencePaths:[...(oracle?.evidencePaths??[])]};
}

const checkedSchema=z.object({checkedReadings:z.array(z.object({id:z.string().min(1),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict())}).passthrough();
export function checkedTableValueProof(proof:SourceParityVerdict,id:string,table:Table):SourceParityVerdict{
  const parsed=checkedSchema.safeParse(proof.observed),failures=[...proof.failures];
  if(!parsed.success)failures.push('source-table proof omits exact checked reading identities');
  else{
    const matches=parsed.data.checkedReadings.filter(reading=>reading.id===id);
    if(matches.length!==1||matches[0].sha256!==hash(table))failures.push('source-table proof belongs to another table state/profile or changed cells');
  }
  return {...proof,failures};
}
