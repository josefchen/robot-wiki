import {createHash}from 'node:crypto';
import {existsSync,lstatSync,mkdirSync,mkdtempSync,readFileSync,renameSync,rmSync,writeFileSync,realpathSync}from 'node:fs';
import {homedir,tmpdir}from 'node:os';
import {dirname,isAbsolute,join,relative,resolve}from 'node:path';
import {z}from 'zod';

const hash=(bytes:string|Buffer)=>createHash('sha256').update(bytes).digest('hex');
const sha=z.string().regex(/^[a-f0-9]{64}$/);
const kinds=['vitest-inventory','vitest-report','playwright-inventory','playwright-report','command-log'] as const;
export type PublicEvidenceKind=typeof kinds[number];
const tokens={workspace:'<workspace>',temporary:'<temporary>'} as const;
type RootKind=keyof typeof tokens;
type Root={kind:RootKind;value:string};
type Context={sourceFingerprint:string;exportFingerprint:string;producer:{name:string;argv:string[];exitCode:number}};
const file=z.object({path:z.string().min(1),sha256:sha}).strict();
export const publicEvidenceReferenceSchema=file.extend({projection:file}).strict();
export type PublicEvidenceReference=z.infer<typeof publicEvidenceReferenceSchema>;
const producer=z.object({name:z.string().min(1),argv:z.array(z.string()).min(1),exitCode:z.number().int()}).strict();
const rootCommitment=z.object({kind:z.enum(['workspace','temporary']),sha256:sha,units:z.number().int().positive(),bytes:z.number().int().positive()}).strict();
const change=z.object({pointer:z.string(),mode:z.enum(['path','text']),originalSha256:sha,projectedSha256:sha,originalUnits:z.number().int().nonnegative(),originalBytes:z.number().int().nonnegative(),spans:z.array(z.object({offset:z.number().int().nonnegative(),originalOffset:z.number().int().nonnegative(),root:z.enum(['workspace','temporary'])}).strict()).min(1)}).strict();
export const publicEvidenceProjectionSchema=z.object({
  version:z.literal(1),rules:z.literal('exact-execution-paths-v1'),kind:z.enum(kinds),artifactPath:z.string().min(1),
  sourceFingerprint:sha,exportFingerprint:sha,producer,
  original:z.object({sha256:sha,bytes:z.number().int().nonnegative()}).strict(),
  projected:z.object({sha256:sha,bytes:z.number().int().nonnegative()}).strict(),
  protectedSha256:sha,roots:z.array(rootCommitment).length(2),changes:z.array(change),
}).strict();
type Receipt=z.infer<typeof publicEvidenceProjectionSchema>;
const pointerPart=(value:string)=>value.replaceAll('~','~0').replaceAll('/','~1');
const canonical=(value:unknown)=>JSON.stringify(value);
const outside=(path:string)=>path==='..'||path.startsWith('../')||isAbsolute(path);

/** Only runner-owned path fields and diagnostic text spans are eligible.
 * Test identities, titles, statuses, counts, producer commands, annotations
 * and every other field are protected in full. Reporter config.argv retains
 * all arguments with only an exact execution-prefix substitution. New fields fail when they
 * contain an execution prefix, instead of expanding this list implicitly. */
export function publicEvidencePathMode(kind:PublicEvidenceKind,pointer:string):'path'|'text'|null{
  if(kind==='command-log')return pointer===''?'text':null;
  if(kind==='vitest-inventory')return /^\/\d+\/file$/.test(pointer)?'path':null;
  if(kind==='vitest-report'){
    if(/^\/testResults\/\d+\/name$/.test(pointer))return 'path';
    if(/^\/testResults\/\d+\/message$/.test(pointer)||/^\/testResults\/\d+\/assertionResults\/\d+\/failureMessages\/\d+$/.test(pointer))return 'text';
    return null;
  }
  if(/^\/config\/(?:configFile|rootDir)$/.test(pointer)||/^\/config\/projects\/\d+\/(?:outputDir|testDir|snapshotDir)$/.test(pointer))return 'path';
  if(/^\/config\/argv\/\d+$/.test(pointer))return 'text';
  if(/^\/(?:suites\/\d+\/)*(?:file|specs\/\d+\/file)$/.test(pointer))return 'path';
  if(/\/(?:location|attachments\/\d+)\/(?:file|path)$/.test(pointer))return 'path';
  if(/\/(?:errors\/\d+|error)\/(?:message|stack|snippet)$/.test(pointer)||/\/(?:stdout|stderr)\/\d+\/text$/.test(pointer))return 'text';
  return null;
}
function rootsFor(root:string,temporary:string):Root[]{
  const roots:Root[]=[{kind:'workspace',value:resolve(root)},{kind:'temporary',value:resolve(temporary)}];
  if(roots.some(entry=>entry.value==='/'||entry.value.length<3)||roots[0].value===roots[1].value)throw new Error('execution roots must be distinct concrete directories');
  return roots.sort((a,b)=>b.value.length-a.value.length);
}
function replacePrefixes(value:string,roots:Root[]){
  let output='',offset=0;
  const spans:Receipt['changes'][number]['spans']=[];
  for(let index=0;index<value.length;){
    const root=roots.find(root=>value.startsWith(root.value,index)&&(!value[index+root.value.length]||/[\/\s"'`):?,\]}]/.test(value[index+root.value.length])));
    if(!root){index++;continue;}
    output+=value.slice(offset,index);spans.push({offset:output.length,originalOffset:index,root:root.kind});output+=tokens[root.kind];index+=root.value.length;offset=index;
  }
  output+=value.slice(offset);return {value:output,spans};
}
function walk(value:unknown,visit:(value:string,pointer:string)=>string,pointer=''):unknown{
  if(typeof value==='string')return visit(value,pointer);
  if(Array.isArray(value))return value.map((entry,index)=>walk(entry,visit,pointer+'/'+index));
  if(value!==null&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,entry])=>{if(visit(key,pointer+'/@key:'+pointerPart(key))!==key)throw new Error('projection cannot rename object keys');return [key,walk(entry,visit,pointer+'/'+pointerPart(key))];}));
  return value;
}
function atPointer(value:unknown,pointer:string):unknown{
  if(pointer==='')return value;
  return pointer.slice(1).split('/').reduce<unknown>((node,part)=>node!==null&&typeof node==='object'?(node as Record<string,unknown>)[part.replaceAll('~1','/').replaceAll('~0','~')]:undefined,value);
}
function protectedValue(value:unknown,kind:PublicEvidenceKind,roots:Root[]):unknown{
  return walk(value,(text,pointer)=>{
    const result=replacePrefixes(text,roots);
    if(result.spans.length&&!publicEvidencePathMode(kind,pointer))throw new Error(`unregistered execution-path field ${pointer}`);
    return result.value;
  });
}

export function projectPublicEvidence(raw:Buffer,input:{root:string;temporaryRoot?:string;kind:PublicEvidenceKind;artifactPath:string}&Context){
  const roots=rootsFor(input.root,input.temporaryRoot??tmpdir());
  const original:unknown=input.kind==='command-log'?raw.toString('utf8'):JSON.parse(raw.toString('utf8'));
  if(input.kind==='command-log'&&!Buffer.from(original as string).equals(raw))throw new Error('command log is not lossless UTF-8');
  const changes:Receipt['changes']=[];
  const projected=walk(original,(text,pointer)=>{
    const result=replacePrefixes(text,roots),mode=publicEvidencePathMode(input.kind,pointer);
    if(result.value.includes(homedir()+'/'))throw new Error(`unregistered host path at ${pointer}`);
    if(!result.spans.length){if(mode==='path'&&(isAbsolute(text)||text.startsWith('file://')))throw new Error(`unregistered absolute runner path at ${pointer}`);return text;}
    if(!mode)throw new Error(`unregistered execution-path field ${pointer}`);
    changes.push({pointer,mode,originalSha256:hash(text),projectedSha256:hash(result.value),originalUnits:text.length,originalBytes:Buffer.byteLength(text),spans:result.spans});return result.value;
  });
  const expected=protectedValue(original,input.kind,roots);
  if(canonical(projected)!==canonical(expected))throw new Error('projection changed protected report content');
  const bytes=Buffer.from(input.kind==='command-log'?projected as string:JSON.stringify(projected,null,2)+'\n');
  const receipt:Receipt={version:1,rules:'exact-execution-paths-v1',kind:input.kind,artifactPath:input.artifactPath,sourceFingerprint:input.sourceFingerprint,exportFingerprint:input.exportFingerprint,producer:input.producer,
    original:{sha256:hash(raw),bytes:raw.length},projected:{sha256:hash(bytes),bytes:bytes.length},protectedSha256:hash(canonical(expected)),
    roots:roots.map(root=>({kind:root.kind,sha256:hash(root.value),units:root.value.length,bytes:Buffer.byteLength(root.value)})),changes};
  validatePublicEvidenceProjection(bytes,receipt,input);
  return {bytes,receipt};
}

/** Public verification needs no private file or original filesystem path.
 * The original-byte hash remains the provenance commitment. The protected
 * semantic hash includes every value and path suffix after the documented
 * prefix substitution, so updating a projected file hash cannot conceal an
 * altered outcome, title, file binding, error, command, or case population. */
export function validatePublicEvidenceProjection(bytes:Buffer,receiptInput:unknown,expected:{kind:PublicEvidenceKind;artifactPath:string}&Context){
  const receipt=publicEvidenceProjectionSchema.parse(receiptInput);
  if(receipt.kind!==expected.kind||receipt.artifactPath!==expected.artifactPath||receipt.sourceFingerprint!==expected.sourceFingerprint||receipt.exportFingerprint!==expected.exportFingerprint||canonical(receipt.producer)!==canonical(expected.producer))throw new Error('public evidence projection identity differs');
  if(receipt.projected.sha256!==hash(bytes)||receipt.projected.bytes!==bytes.length)throw new Error('projected evidence bytes changed');
  if(new Set(receipt.roots.map(root=>root.kind)).size!==2)throw new Error('projection root commitments differ');
  const value:unknown=receipt.kind==='command-log'?bytes.toString('utf8'):JSON.parse(bytes.toString('utf8'));
  if(receipt.kind!=='command-log'&&Buffer.from(JSON.stringify(value,null,2)+'\n').compare(bytes)!==0)throw new Error('projected JSON has a noncanonical encoding');
  if(hash(canonical(value))!==receipt.protectedSha256)throw new Error('protected evidence content changed');
  const seen=new Set<string>();
  for(const change of receipt.changes){
    if(seen.has(change.pointer)||publicEvidencePathMode(receipt.kind,change.pointer)!==change.mode)throw new Error('unexpected or duplicate projection transformation');seen.add(change.pointer);
    const text=atPointer(value,change.pointer);if(typeof text!=='string'||hash(text)!==change.projectedSha256)throw new Error('projected path field changed');
    let previous=-1,unitDelta=0,byteDelta=0;
    for(const span of change.spans){
      const root=receipt.roots.find(root=>root.kind===span.root)!;const token=tokens[span.root];
      if(span.offset<=previous||text.slice(span.offset,span.offset+token.length)!==token||span.originalOffset!==span.offset+unitDelta)throw new Error('projection span does not match its documented prefix');
      previous=span.offset+token.length-1;unitDelta+=root.units-token.length;byteDelta+=root.bytes-Buffer.byteLength(token);
    }
    if(change.originalUnits!==text.length+unitDelta||change.originalBytes!==Buffer.byteLength(text)+byteDelta)throw new Error('projection path extent changed');
  }
  walk(value,(text)=>{
    for(const root of receipt.roots)for(let at=text.indexOf('/');at>=0;at=text.indexOf('/',at+1))if(hash(text.slice(at,at+root.units))===root.sha256)throw new Error('projected evidence retains an original execution prefix');return text;
  });
  return receipt;
}

function artifactFile(root:string,path:string){
  const resolved=resolve(root,path),within=relative(join(root,'evidence/brand-v2/release'),resolved);
  if(isAbsolute(path)||outside(within))throw new Error('public evidence path escapes the release directory');
  const physical=relative(realpathSync(root),realpathSync(dirname(resolved)));
  if(outside(physical))throw new Error('public evidence parent escapes the checkout');
  return resolved;
}
function checkedPrivateDirectory(root:string,directory:string){
  mkdirSync(directory,{recursive:true,mode:0o700});
  const within=relative(realpathSync(root),realpathSync(directory));
  if(!outside(within))throw new Error('raw evidence directory must be outside the checkout');
  return directory;
}
function assertRegularDestination(path:string){
  const entry=lstatSync(path,{throwIfNoEntry:false});
  if(entry&&(!entry.isFile()||entry.isSymbolicLink()))throw new Error('public evidence destination is not a regular file');
}
/** Rename replaces the directory entry itself: neither a raced symlink nor
 * an existing hard link can redirect the write into the private archive. */
function replacePublicArtifact(path:string,bytes:Buffer){
  assertRegularDestination(path);
  const staging=mkdtempSync(join(dirname(path),'.evidence-write-'));
  try{
    const staged=join(staging,'artifact');
    writeFileSync(staged,bytes,{flag:'wx'});
    renameSync(staged,path);
  }finally{rmSync(staging,{recursive:true,force:true});}
}
export function privateReleaseEvidenceDirectory(root:string):string{
  const directory=resolve(process.env.ROBOT_WIKI_RELEASE_RAW_DIRECTORY??join(homedir(),'.local/share/robot-wiki-release-raw'));
  const within=relative(resolve(root),directory);if(!outside(within))throw new Error('raw evidence directory must be outside the checkout');
  return checkedPrivateDirectory(root,directory);
}
export function publishCapturedEvidence(root:string,path:string,kind:PublicEvidenceKind,context:Context,privateDirectory=privateReleaseEvidenceDirectory(root)):PublicEvidenceReference{
  const privateWithin=relative(resolve(root),resolve(privateDirectory));if(!outside(privateWithin))throw new Error('raw evidence directory must be outside the checkout');
  checkedPrivateDirectory(root,privateDirectory);
  const source=artifactFile(root,path);if(!lstatSync(source).isFile()||lstatSync(source).isSymbolicLink())throw new Error('captured evidence is not a regular file');
  const receiptPath=path+'.projection.json',receiptFile=artifactFile(root,receiptPath);
  assertRegularDestination(receiptFile);
  const raw=readFileSync(source),rawHash=hash(raw),rawPath=join(privateDirectory,rawHash+'.raw');mkdirSync(privateDirectory,{recursive:true,mode:0o700});
  if(existsSync(rawPath)){if(lstatSync(rawPath).isSymbolicLink()||!readFileSync(rawPath).equals(raw))throw new Error('private raw evidence hash collision or link');}else writeFileSync(rawPath,raw,{flag:'wx',mode:0o600});
  const origin={path,kind,executionRoot:root,temporaryRoot:tmpdir(),...context,rawSha256:rawHash},originBytes=JSON.stringify(origin,null,2)+'\n',originPath=join(privateDirectory,rawHash+'.'+hash(canonical(origin))+'.origin.json');
  if(existsSync(originPath)){if(lstatSync(originPath).isSymbolicLink()||readFileSync(originPath,'utf8')!==originBytes)throw new Error('private origin record changed');}else writeFileSync(originPath,originBytes,{flag:'wx',mode:0o600});
  try{
    const {bytes,receipt}=projectPublicEvidence(raw,{root,kind,artifactPath:path,...context});
    const receiptBytes=Buffer.from(JSON.stringify(receipt,null,2)+'\n');
    replacePublicArtifact(source,bytes);replacePublicArtifact(receiptFile,receiptBytes);
    return {path,sha256:hash(bytes),projection:{path:receiptPath,sha256:hash(receiptBytes)}};
  }catch(error){rmSync(source,{force:true});throw error;}
}
export function readPublicEvidence(root:string,reference:PublicEvidenceReference,kind:PublicEvidenceKind,context:Context):Buffer{
  const ref=publicEvidenceReferenceSchema.parse(reference);
  if(ref.projection.path!==ref.path+'.projection.json')throw new Error('projection receipt path differs');
  const source=artifactFile(root,ref.path),receipt=artifactFile(root,ref.projection.path);
  if([source,receipt].some(path=>lstatSync(path).isSymbolicLink()||!lstatSync(path).isFile()))throw new Error('public evidence or receipt is not a regular file');
  const bytes=readFileSync(source),receiptBytes=readFileSync(receipt);
  if(hash(bytes)!==ref.sha256||hash(receiptBytes)!==ref.projection.sha256)throw new Error('public evidence or receipt hash changed');
  validatePublicEvidenceProjection(bytes,JSON.parse(receiptBytes.toString('utf8')),{kind,artifactPath:ref.path,...context});return bytes;
}
