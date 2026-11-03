// @vitest-environment node
import {createHash}from 'node:crypto';
import {cpSync,mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync,existsSync,symlinkSync,linkSync}from 'node:fs';
import {tmpdir}from 'node:os';
import {join}from 'node:path';
import {describe,expect,it}from 'vitest';
import {projectPublicEvidence,validatePublicEvidenceProjection,publishCapturedEvidence,readPublicEvidence,type PublicEvidenceKind}from '../../lib/brand-v2-release-public-evidence';
import {unitReportProblems,type UnitInventory,type UnitJson}from '../../lib/brand-v2-release-machine';
import {testRunProblems,reportedTestCommandProblems,type PlaywrightJson}from '../../lib/brand-v2-release-test-run';

const digest=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
const context={sourceFingerprint:'a'.repeat(64),exportFingerprint:'b'.repeat(64),producer:{name:'test',argv:['npm','test'],exitCode:0}};
const artifactPath='evidence/brand-v2/release/machine/unit-report.json';
const unit=(root='/workspace'):UnitJson=>({success:true,numTotalTests:1,numPassedTests:1,numFailedTests:0,numPendingTests:0,numTodoTests:0,testResults:[{name:root+'/tests/real.test.ts',status:'passed',message:'',assertionResults:[{ancestorTitles:['Source values'],title:'retains every measured cell',fullName:'Source values retains every measured cell',status:'passed',failureMessages:[]}]}]});
const inventory=(root='/workspace'):UnitInventory=>[{file:root+'/tests/real.test.ts',name:'Source values > retains every measured cell'}];
const browser=(root='/workspace'):PlaywrightJson=>({config:{configFile:root+'/playwright.release.config.ts',forbidOnly:true},suites:[{title:'scope',specs:[{id:'stable-case-id',file:root+'/tests/e2e/real.spec.ts',line:10,column:1,title:'measures actual behavior',tests:[{projectName:'chromium',expectedStatus:'passed',status:'expected',results:[{status:'passed',errors:[]}],annotations:[]}]}]}],errors:[],stats:{expected:1,unexpected:0,flaky:0,skipped:0}});
function project(value:unknown,kind:PublicEvidenceKind='vitest-report',root='/workspace'){
  return projectPublicEvidence(Buffer.from(JSON.stringify(value)),{root,temporaryRoot:'/temporary',kind,artifactPath,...context});
}

describe('canonical public execution evidence',()=>{
  it('retains every case, outcome and command while replacing only execution prefixes',()=>{
    const raw=unit(),result=project(raw),published=JSON.parse(result.bytes.toString()) as UnitJson;
    expect(published.testResults[0].name).toBe('<workspace>/tests/real.test.ts');
    expect(published.testResults[0].assertionResults).toEqual(raw.testResults[0].assertionResults);
    expect(result.receipt.producer).toEqual(context.producer);expect(result.receipt.original.sha256).toBe(digest(JSON.stringify(raw)));
    const listed=JSON.parse(project(inventory(),'vitest-inventory').bytes.toString()) as UnitInventory;
    expect(unitReportProblems(listed,published)).toEqual([]);
    expect(validatePublicEvidenceProjection(result.bytes,result.receipt,{kind:'vitest-report',artifactPath,...context})).toEqual(result.receipt);
  });
  it('produces identical public values from relocated execution roots',()=>{
    const first=project(unit('/jobs/first'),'vitest-report','/jobs/first'),second=project(unit('/another/location'),'vitest-report','/another/location');
    expect(first.bytes).toEqual(second.bytes);expect(first.receipt.protectedSha256).toBe(second.receipt.protectedSha256);
    expect(first.receipt.original.sha256).not.toBe(second.receipt.original.sha256);
  });
  it('archives exact raw bytes privately and verifies after relocation without that archive',()=>{
    const base=mkdtempSync(join(tmpdir(),'public-evidence-')),root=join(base,'original'),other=join(base,'relocated'),privateRoot=join(base,'private');
    try{
      mkdirSync(join(root,'evidence/brand-v2/release/machine'),{recursive:true});
      const raw=Buffer.from(JSON.stringify(unit(root),null,3)+'\n');writeFileSync(join(root,artifactPath),raw);
      const reference=publishCapturedEvidence(root,artifactPath,'vitest-report',context,privateRoot);
      expect(readFileSync(join(privateRoot,digest(raw)+'.raw'))).toEqual(raw);
      cpSync(root,other,{recursive:true});rmSync(root,{recursive:true});rmSync(privateRoot,{recursive:true});
      const bytes=readPublicEvidence(other,reference,'vitest-report',context);expect(JSON.parse(bytes.toString()).testResults[0].name).toBe('<workspace>/tests/real.test.ts');
      expect(()=>readPublicEvidence(other,reference,'vitest-report',{...context,producer:{...context.producer,exitCode:1}})).toThrow('identity');
    }finally{rmSync(base,{recursive:true,force:true});}
  });
  it.each(['private-raw','outside-file','dangling'])('refuses a receipt symlink to %s without changing its target or captured input',targetKind=>{
    const base=mkdtempSync(join(tmpdir(),'public-evidence-link-')),root=join(base,'repo'),privateRoot=join(base,'private');
    try{
      mkdirSync(join(root,'evidence/brand-v2/release/machine'),{recursive:true});mkdirSync(privateRoot);
      const raw=Buffer.from(JSON.stringify(unit(root))),source=join(root,artifactPath);
      writeFileSync(source,raw);
      const target=targetKind==='private-raw'?join(privateRoot,digest(raw)+'.raw'):join(base,targetKind+'.json');
      const original=targetKind==='private-raw'?raw:Buffer.from('preserve unrelated evidence');
      if(targetKind!=='dangling')writeFileSync(target,original);
      symlinkSync(target,source+'.projection.json');
      expect(()=>publishCapturedEvidence(root,artifactPath,'vitest-report',context,privateRoot)).toThrow('destination is not a regular file');
      expect(readFileSync(source)).toEqual(raw);
      if(targetKind==='dangling')expect(existsSync(target)).toBe(false);else expect(readFileSync(target)).toEqual(original);
    }finally{rmSync(base,{recursive:true,force:true});}
  });
  it('replaces source and receipt hard links without overwriting the private original',()=>{
    const base=mkdtempSync(join(tmpdir(),'public-evidence-hardlink-')),root=join(base,'repo'),privateRoot=join(base,'private');
    try{
      mkdirSync(join(root,'evidence/brand-v2/release/machine'),{recursive:true});mkdirSync(privateRoot);
      const raw=Buffer.from(JSON.stringify(unit(root))),rawPath=join(privateRoot,digest(raw)+'.raw'),source=join(root,artifactPath);
      writeFileSync(rawPath,raw);linkSync(rawPath,source);linkSync(rawPath,source+'.projection.json');
      const reference=publishCapturedEvidence(root,artifactPath,'vitest-report',context,privateRoot);
      expect(readFileSync(rawPath)).toEqual(raw);
      expect(JSON.parse(readPublicEvidence(root,reference,'vitest-report',context).toString()).testResults[0].name).toBe('<workspace>/tests/real.test.ts');
    }finally{rmSync(base,{recursive:true,force:true});}
  });
  it.each(['failed','skipped','omitted','title','case-file','count','error'])(
    'rejects changed %s content even if its projected byte hash is updated',mutation=>{
      const result=project(unit()),changed=JSON.parse(result.bytes.toString()) as UnitJson;
      if(mutation==='failed'){changed.success=false;changed.testResults[0].assertionResults[0].status='failed';}
      if(mutation==='skipped')changed.testResults[0].assertionResults[0].status='skipped';
      if(mutation==='omitted')changed.testResults[0].assertionResults=[];
      if(mutation==='title')changed.testResults[0].assertionResults[0].title='Different case';
      if(mutation==='case-file')changed.testResults[0].name='<workspace>/tests/another.test.ts';
      if(mutation==='count')changed.numPassedTests=0;
      if(mutation==='error')changed.testResults[0].assertionResults[0].failureMessages=['concealed failure'];
      const bytes=Buffer.from(JSON.stringify(changed,null,2)+'\n'),receipt=structuredClone(result.receipt);receipt.projected={sha256:digest(bytes),bytes:bytes.length};
      expect(()=>validatePublicEvidenceProjection(bytes,receipt,{kind:'vitest-report',artifactPath,...context})).toThrow('protected');
    },
  );
  it('retains failed and skipped observations so the ordinary acceptance predicates still reject them',()=>{
    for(const status of ['failed','skipped']){
      const raw=unit();raw.success=false;raw.testResults[0].assertionResults[0].status=status;raw.testResults[0].assertionResults[0].failureMessages=['Problem at /workspace/tests/real.test.ts:10'];
      const published=JSON.parse(project(raw).bytes.toString()) as UnitJson;
      expect(published.testResults[0].assertionResults[0].status).toBe(status);
      expect(published.testResults[0].assertionResults[0].failureMessages).toEqual(['Problem at <workspace>/tests/real.test.ts:10']);
      expect(unitReportProblems(JSON.parse(project(inventory(),'vitest-inventory').bytes.toString()),published).length).toBeGreaterThan(0);
    }
  });
  it('keeps Playwright test IDs, annotations, exact inventory and execution outcomes intact',()=>{
    const original=browser(),listed=JSON.parse(project(original,'playwright-inventory').bytes.toString()) as PlaywrightJson;
    const executed=JSON.parse(project(original,'playwright-report').bytes.toString()) as PlaywrightJson;
    expect(testRunProblems(listed,executed,0)).toEqual([]);expect(executed.suites[0].specs![0].id).toBe('stable-case-id');
    executed.suites[0].specs![0].tests[0].results=[{status:'skipped'}];expect(testRunProblems(listed,executed,0).length).toBeGreaterThan(0);
    expect(testRunProblems(listed,listed,1)).toContain('test command exited 1');
  });
  it('preserves and checks the actual reporter invocation after projecting its binary path',()=>{
    const command=['npx','playwright','test','--config','playwright.release.config.ts','--forbid-only'];
    const input=browser();input.config!.argv=['/usr/bin/node','/workspace/node_modules/.bin/playwright',...command.slice(2)];
    const output=JSON.parse(project(input,'playwright-report').bytes.toString()) as PlaywrightJson;
    expect(output.config!.argv![1]).toBe('<workspace>/node_modules/.bin/playwright');expect(reportedTestCommandProblems(output,command)).toEqual([]);
    output.config!.argv!.push('--grep=one');expect(reportedTestCommandProblems(output,command)).not.toEqual([]);
  });
  it('replaces only exact prefix spans in logs, including Unicode and multiple roots',()=>{
    const raw='θ RUN /workspace\nfailed at file:///workspace/tests/case.ts:4\n2 passed, 1 failed\nartifact /temporary/run-123/file.json\n';
    const result=projectPublicEvidence(Buffer.from(raw),{root:'/workspace',temporaryRoot:'/temporary',kind:'command-log',artifactPath,...context});
    expect(result.bytes.toString()).toBe('θ RUN <workspace>\nfailed at file://<workspace>/tests/case.ts:4\n2 passed, 1 failed\nartifact <temporary>/run-123/file.json\n');
    expect(validatePublicEvidenceProjection(result.bytes,result.receipt,{kind:'command-log',artifactPath,...context}).changes[0].spans).toHaveLength(3);
  });
  it('refuses unknown fields, outcome-field transformations and malformed span metadata',()=>{
    const unexpected=unit();unexpected.testResults[0].assertionResults[0].title='case /workspace/private';expect(()=>project(unexpected)).toThrow('unregistered');
    expect(()=>project({'/workspace/private':'unchanged'})).toThrow('unregistered');
    const foreign=unit('/workspace-other');expect(()=>project(foreign)).toThrow('unregistered absolute');
    const result=project(unit());
    const pointer=structuredClone(result.receipt);pointer.changes[0].pointer='/success';expect(()=>validatePublicEvidenceProjection(result.bytes,pointer,{kind:'vitest-report',artifactPath,...context})).toThrow('unexpected');
    const span=structuredClone(result.receipt);span.changes[0].spans[0].offset=1;expect(()=>validatePublicEvidenceProjection(result.bytes,span,{kind:'vitest-report',artifactPath,...context})).toThrow('span');
    const extent=structuredClone(result.receipt);extent.changes[0].originalBytes++;expect(()=>validatePublicEvidenceProjection(result.bytes,extent,{kind:'vitest-report',artifactPath,...context})).toThrow('extent');
    const command=structuredClone(result.receipt);command.producer.argv.push('--grep=one');expect(()=>validatePublicEvidenceProjection(result.bytes,command,{kind:'vitest-report',artifactPath,...context})).toThrow('identity');
  });
  it('keeps the raw archive when publication fails instead of leaving private paths in the public file',()=>{
    const base=mkdtempSync(join(tmpdir(),'projection-failure-')),root=join(base,'repo'),privateRoot=join(base,'private');
    try{
      mkdirSync(join(root,'evidence/brand-v2/release/machine'),{recursive:true});const raw=Buffer.from(JSON.stringify({title:root+'/unexpected'}));writeFileSync(join(root,artifactPath),raw);
      expect(()=>publishCapturedEvidence(root,artifactPath,'vitest-report',context,privateRoot)).toThrow('unregistered');
      expect(readFileSync(join(privateRoot,digest(raw)+'.raw'))).toEqual(raw);expect(existsSync(join(root,artifactPath))).toBe(false);
      expect(()=>publishCapturedEvidence(root,'../escape.json','vitest-report',context,privateRoot)).toThrow('escapes');
    }finally{rmSync(base,{recursive:true,force:true});}
  });
  it('does not put private originals behind an inside-checkout symlink or dot-prefixed path',()=>{
    const base=mkdtempSync(join(tmpdir(),'projection-private-')),root=join(base,'repo'),outsideLink=join(base,'looks-private');
    try{
      mkdirSync(join(root,'evidence/brand-v2/release/machine'),{recursive:true});mkdirSync(join(root,'inside'));symlinkSync(join(root,'inside'),outsideLink,'dir');
      writeFileSync(join(root,artifactPath),JSON.stringify(unit(root)));
      expect(()=>publishCapturedEvidence(root,artifactPath,'vitest-report',context,outsideLink)).toThrow('outside');
      expect(()=>publishCapturedEvidence(root,artifactPath,'vitest-report',context,join(root,'..private'))).toThrow('outside');
    }finally{rmSync(base,{recursive:true,force:true});}
  });
});
