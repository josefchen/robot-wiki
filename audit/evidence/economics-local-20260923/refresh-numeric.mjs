import fs from 'node:fs';
import assert from 'node:assert/strict';
import { localPartDigest, parseLocalBasisCatalog, validateLocalBasisPlan } from '../../../lib/audit-local-basis.ts';
import { CITATIONS } from '../../../data/citations.ts';
import { DIRECTORY, ROUTE, artifact, save } from './support.ts';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const text=fs.readFileSync('audit/local-basis.json','utf8');const catalog=parseLocalBasisCatalog(JSON.parse(text));
const plan=catalog.plans.find(p=>p.id==='economics-local-i52-20260923');
const old=read(`${DIRECTORY}/numeric-run.json`);const run=read(`${DIRECTORY}/numeric-run-final.json`);
assert.equal(artifact(run.test.path).sha256,run.test.sha256);assert.equal(run.exitCode,0);
for(const c of run.cases){
 const before=old.cases.find(p=>p.id===c.id);assert.deepEqual(c.recipe,before.recipe);assert.deepEqual(c.expected,before.expected);
 const p=catalog.proofs.find(p=>p.id===c.id);const provenance={command:run.command,runner:run.runner,cwd:run.cwd,environment:run.environment,startedAt:run.startedAt,endedAt:run.endedAt,exitCode:0,test:run.test};
 for(const d of c.dependencies)assert.equal(artifact(d.file.path).sha256,d.file.sha256);
 const receipt=save(`${c.id}.final.receipt.json`,{schemaVersion:'local-run-v1',...provenance,inputDigest:p.inputDigest,outputDigest:p.outputDigest,dependencies:c.dependencies,observations:[]});
 p.artifacts=c.dependencies;p.provenance={...provenance,receipt};
}
const at=new Date().toISOString();
for(const partId of ['i52-authored-price-and-inputs','i52-price-arithmetic']){
 const a=plan.adjudications.find(a=>a.partId===partId);const original=read(a.event.path);
 const rationale=original.rationale+' I reviewed the final type-narrowing-only producer change and actual numeric rerun: all four recipes/outputs are deep-equal to their initial values. Only the producing test hash, times and receipts changed; no model or browser dependency changed. Original run and review remain retained.';
 const inputDigest=localPartDigest(plan,partId,catalog.proofs);
 const event=save(`${partId}.final.review.json`,{...original,eventId:`${plan.id}:${partId}:numeric-refresh:${at}`,observedAt:at,rationale,inputDigest});
 a.rationale=rationale;a.inputDigest=inputDigest;a.event=event;
}
const context={root:process.cwd(),catalog,registry:read('contract/brand-v2-registries.json').interactive,publishedRoutes:[ROUTE,'/rl-sim2real/parallel-sim-rl/','/rl-sim2real/reward-design-mpc/','/rl-sim2real/sim2real-transfer/']};
for(const p of catalog.plans)assert.deepEqual(validateLocalBasisPlan(p,p.currentCells,p.id,{citationId:'',sourceUrl:'',supportingPassage:''},new Set(CITATIONS.map(c=>c.id)),context).failures,[],p.id);
// Find top-level JSON array entries while preserving old serialized bytes.
function spans(text, key) {
  const start = key ? new RegExp(`"${key}"\\s*:\\s*\\[`).exec(text).index + new RegExp(`"${key}"\\s*:\\s*\\[`).exec(text)[0].length : text.indexOf('[') + 1;
  const entries = [];
  let pos = start;
  while (true) {
    while (/\s|,/.test(text[pos])) pos++;
    if (text[pos] === ']') return { start, end: pos, entries };
    const from = pos;
    let depth = 0, quoted = false, escaped = false;
    for (; pos < text.length; pos++) {
      const ch = text[pos];
      if (quoted) { if (escaped) escaped = false; else if (ch === '\\') escaped = true; else if (ch === '"') quoted = false; continue; }
      if (ch === '"') quoted = true;
      else if ('[{'.includes(ch)) depth++;
      else if (']}'.includes(ch) && --depth === 0) { pos++; break; }
    }
    entries.push({ from, to: pos, raw: text.slice(from, pos) });
  }
}

function replace(text,key,value){const entry=spans(text,key).entries.find(e=>JSON.parse(e.raw).id===value.id);assert(entry);const raw=JSON.stringify(value,null,2).split('\n').map((line,i)=>i?'    '+line:line).join('\n');return text.slice(0,entry.from)+raw+text.slice(entry.to);}
let updated=replace(text,'plans',plan);for(const c of run.cases)updated=replace(updated,'proofs',catalog.proofs.find(p=>p.id===c.id));assert.deepEqual(JSON.parse(updated),catalog);fs.writeFileSync('audit/local-basis.json',updated);
save('refresh-numeric.json',{at,changedProofs:run.cases.map(c=>c.id),changedPartReviews:2,originalRecordsPreserved:true,browserReusedWithoutRerun:true,unchangedOutputs:true});console.log(JSON.stringify({updatedProofs:4,newPartReviews:2,rowsApplied:0,nativeFailures:0,at}));
