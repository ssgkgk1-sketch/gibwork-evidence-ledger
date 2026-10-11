import {createHash} from 'node:crypto';
import {readFile,realpath,stat,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
export const digest=x=>createHash('sha256').update(x).digest('hex');
const uuid=/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export function snapshot(envelope,source='imported-cli-output'){
  if(envelope?.ok!==true||!envelope.data)throw Error('Expected official CLI envelope {ok:true,data:...}');
  const t=envelope.data;
  if(!uuid.test(t.id)||typeof t.title!=='string'||typeof t.content!=='string'||typeof t.isOpen!=='boolean')throw Error('Incomplete official task response');
  if(t.deadline!=null&&(typeof t.deadline!=='string'||!Number.isFinite(Date.parse(t.deadline))))throw Error('Invalid deadline');
  const task={id:t.id,title:t.title,content:t.content,isOpen:t.isOpen,deadline:t.deadline??null,asset:t.asset??null,allowOnlyVerifiedSubmissions:t.allowOnlyVerifiedSubmissions??null,minSubmissionAmount:t.minSubmissionAmount??null};
  return {schema:'gibwork-evidence/v1',source,capturedAt:new Date().toISOString(),task,scopeSha256:digest(JSON.stringify(task))};
}
export function validateSnapshot(s){
  if(s?.schema!=='gibwork-evidence/v1'||!s.task)throw Error('Unknown snapshot schema');
  const checked=snapshot({ok:true,data:s.task},s.source);
  if(checked.scopeSha256!==s.scopeSha256)throw Error('Snapshot hash mismatch');
  return s;
}
export function compare(before,after){
  validateSnapshot(before);validateSnapshot(after);
  if(before.task.id!==after.task.id)throw Error('Cannot compare different tasks');
  return Object.keys(before.task).filter(k=>JSON.stringify(before.task[k])!==JSON.stringify(after.task[k])).map(field=>({field,before:before.task[field],after:after.task[field]}));
}
function within(root,file){const r=path.relative(root,file);return r!==''&&!r.startsWith('..'+path.sep)&&r!=='..'&&!path.isAbsolute(r);}
export async function evidence(root,relative){
  if(typeof relative!=='string'||!relative||path.isAbsolute(relative))throw Error('Evidence path must be relative');
  const parts=relative.split(/[\\/]/);
  if(parts.some(p=>p==='..'||/^\.env(?:\.|$)|^\.git$|keypair|^id_(rsa|ed25519)$|\.(pem|key)$/i.test(p)))throw Error('Unsafe evidence path');
  const base=await realpath(root), requested=path.resolve(base,relative);
  if(!within(base,requested))throw Error('Evidence outside project');
  const actual=await realpath(requested);
  if(!within(base,actual))throw Error('Symlink leaves project');
  const info=await stat(actual);
  if(!info.isFile()||info.size>10*1024*1024)throw Error('Evidence must be a file under 10 MiB');
  const data=await readFile(actual);
  if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bghp_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{30,}|\b(?:PRIVATE_KEY|SECRET_KEY|API_KEY)\s*[:=]\s*["']?[A-Za-z0-9_\[\]-]{16,}/i.test(data.toString('utf8')))throw Error('Possible secret in evidence; excluded');
  return {path:relative,bytes:data.length,sha256:digest(data)};
}
export async function inspect(manifest,root,baseline,current=baseline,now=Date.now()){
  validateSnapshot(baseline);validateSnapshot(current);
  if(!Array.isArray(manifest.requirements)||!manifest.requirements.length)throw Error('requirements must be nonempty');
  const ids=new Set(),results=[];
  for(const r of manifest.requirements){
    if(typeof r.id!=='string'||!r.id||ids.has(r.id)||typeof r.description!=='string'||!r.description)throw Error('Requirement IDs must be unique; descriptions required');
    ids.add(r.id);
    if(r.kind==='human'){
      results.push({id:r.id,description:r.description,status:'HUMAN_CHECK_REQUIRED',note:r.note??'Organizer confirmation or actual attendance is required.'});continue;
    }
    if(r.kind!=='files'||!Array.isArray(r.paths)||!r.paths.length)throw Error('Use kind files with paths, or kind human');
    const files=[],issues=[];
    for(const p of r.paths){try{files.push(await evidence(root,p));}catch(e){issues.push({path:p,error:e.code==='ENOENT'?'Missing file':e.message});}}
    results.push({id:r.id,description:r.description,status:issues.length?'MISSING_OR_REJECTED':'FILES_PRESENT',files,issues});
  }
  const changes=compare(baseline,current);
  const expired=current.task.deadline!==null&&Date.parse(current.task.deadline)<=now;
  const gate=!current.task.isOpen||expired||changes.length||results.some(r=>r.status==='MISSING_OR_REJECTED')?'BLOCKED':'HUMAN_REVIEW_REQUIRED';
  return {schema:'gibwork-evidence-report/v1',taskId:current.task.id,taskTitle:current.task.title,generatedAt:new Date(now).toISOString(),source:current.source,scopeSha256:current.scopeSha256,gate,taskOpen:current.task.isOpen,expired,scopeChanges:changes,requirements:results,notice:'File existence and hashes do not prove quality, attendance, originality, eligibility, or payout. No submission or payment has been made.'};
}
function text(s){return String(s).replace(/[\r\n]+/g,' ').replace(/[<>|`]/g,'');}
export function markdown(r){return '# Gibwork evidence report\n\n'+`Task: ${text(r.taskTitle)} (${r.taskId})\n\nGate: **${r.gate}**\n\nSource: ${text(r.source)}\n\nScope SHA-256: ${r.scopeSha256}\n\n`+r.requirements.map(x=>`## ${text(x.id)} — ${text(x.description)}\n\n${x.status}\n\n`+(x.files??[]).map(f=>`- ${text(f.path)}: ${f.bytes} bytes, SHA-256 ${f.sha256}`).join('\n')+'\n'+(x.issues??[]).map(i=>`- ${text(i.path)}: ${text(i.error)}`).join('\n')+(x.note?'\n'+text(x.note):'')).join('\n\n')+'\n\nScope changes: '+(r.scopeChanges.map(c=>c.field).join(', ')||'none')+'\n\n'+r.notice+'\n';}
export async function saveReport(dir,r){
  // New directory only: no silent overwrites or merging with prior evidence.
  await mkdir(dir,{recursive:false});
  await writeFile(path.join(dir,'report.json'),JSON.stringify(r,null,2)+'\n',{flag:'wx'});
  await writeFile(path.join(dir,'report.md'),markdown(r),{flag:'wx'});
}
