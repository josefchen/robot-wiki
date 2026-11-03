import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync}from 'node:fs';
import {createRequire}from 'node:module';
import {spawnSync}from 'node:child_process';
import {join}from 'node:path';
import {tmpdir}from 'node:os';
import {describe,expect,it}from 'vitest';
import {releaseSourceFingerprint,RELEASE_TOOLING_IGNORE_NOTE}from '../../lib/brand-v2-release-evidence';
const {writeAgentFiles}=createRequire(import.meta.url)('next/dist/server/lib/generate-agent-files.js') as {writeAgentFiles:(root:string)=>unknown};
describe('public release source identity',()=>{
  it('uses the same source identity despite distinct provider and framework deployment environments',()=>{
    const script=`import {createRequire}from'node:module';import{releaseSourceFingerprint}from'./lib/brand-v2-release-source.ts';const config=await createRequire(import.meta.url)('next/dist/server/config.js').default('phase-production-build',process.cwd(),{silent:true});console.log(JSON.stringify({build:await config.generateBuildId(),deployment:config.deploymentId,environment:process.env.NEXT_DEPLOYMENT_ID,provider:process.env.VERCEL_DEPLOYMENT_ID,source:releaseSourceFingerprint(process.cwd()),runtime:config.experimental.runtimeServerDeploymentId}));`;
    const rows=['one','two'].map(run=>{
      const child=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:process.cwd(),env:{...process.env,NOW_BUILDER:'1',NEXT_DEPLOYMENT_ID:`framework-${run}`,VERCEL_DEPLOYMENT_ID:`provider-${run}`},encoding:'utf8',timeout:20_000});
      expect(child.status,child.stderr).toBe(0);const row=JSON.parse(child.stdout.trim());expect(row.provider).toBe(`provider-${run}`);expect(row.runtime).toBe(false);expect([row.build,row.deployment,row.environment]).toEqual([row.source,undefined,'']);return row;
    });
    expect(rows[0].source).toBe(rows[1].source);
  },45_000);
  it('accepts only the documented exact tooling transformations',()=>{
    const root=mkdtempSync(join(tmpdir(),'release-source-'));
    try{
      mkdirSync(join(root,'lib'));writeFileSync(join(root,'lib/actual.ts'),'export const value=7;');
      writeAgentFiles(root);writeFileSync(join(root,'.gitignore'),`node_modules/\n${RELEASE_TOOLING_IGNORE_NOTE}.next/\n`);
      writeFileSync(join(root,'next-env.d.ts'),'/// <reference types="next" />\nimport "./.next/dev/types/routes.d.ts";\nimport "./.next/dev/types/root-params.d.ts";\n');
      const before=releaseSourceFingerprint(root);
      rmSync(join(root,'AGENTS.md'));rmSync(join(root,'CLAUDE.md'));
      writeFileSync(join(root,'.gitignore'),'node_modules/\n.next/\n');
      writeFileSync(join(root,'next-env.d.ts'),'/// <reference types="next" />\nimport "./.next/types/routes.d.ts";\nimport "./.next/types/root-params.d.ts";\n');
      expect(releaseSourceFingerprint(root)).toBe(before);
      writeFileSync(join(root,'lib/actual.ts'),'export const value=0;');expect(releaseSourceFingerprint(root)).not.toBe(before);
    }finally{rmSync(root,{recursive:true,force:true});}
  });
  it.each(['instruction','pointer','ignore rule','declaration','nested instruction'])(
    'rejects or rehashes changed %s bytes',mutation=>{
      const root=mkdtempSync(join(tmpdir(),'release-source-mutation-'));
      try{
        mkdirSync(join(root,'lib'));writeFileSync(join(root,'lib/actual.ts'),'export const value=7;');writeAgentFiles(root);
        writeFileSync(join(root,'.gitignore'),'node_modules/\n');writeFileSync(join(root,'next-env.d.ts'),'import "./.next/types/routes.d.ts";\n');const before=releaseSourceFingerprint(root);
        if(mutation==='instruction')writeFileSync(join(root,'AGENTS.md'),readFileSync(join(root,'AGENTS.md'),'utf8')+'\nChanged rule.');
        if(mutation==='pointer')writeFileSync(join(root,'CLAUDE.md'),'Another file\n');
        if(mutation==='ignore rule')writeFileSync(join(root,'.gitignore'),'node_modules/\nactual-source/\n');
        if(mutation==='declaration')writeFileSync(join(root,'next-env.d.ts'),'import "./another/types/routes.d.ts";\n');
        if(mutation==='nested instruction')writeFileSync(join(root,'lib/AGENTS.md'),'Nested proof instructions stay bound.');
        if(['instruction','pointer'].includes(mutation))expect(()=>releaseSourceFingerprint(root)).toThrow('unreviewed');else expect(releaseSourceFingerprint(root)).not.toBe(before);
      }finally{rmSync(root,{recursive:true,force:true});}
    },
  );
});
