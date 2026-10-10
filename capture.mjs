import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createRequire} from 'node:module';
import path from 'node:path';
import {snapshot} from './ledger.mjs';
const exec=promisify(execFile),require=createRequire(import.meta.url);
export function cliArgs(id,profile){
  if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))throw Error('Task ID must be UUID');
  if(profile!==undefined&&!/^[a-zA-Z0-9_-]{1,64}$/.test(profile))throw Error('Invalid profile');
  return ['--json','--environment','production',...(profile?['--profile',profile]:[]),'task','get',id];
}
export async function capture(id,profile,runner=exec){
  const entry=path.join(path.dirname(require.resolve('@gibwork/cli/package.json')),'dist/bin.js');
  let output;
  try{output=await runner(process.execPath,[entry,...cliArgs(id,profile)],{timeout:30000,maxBuffer:2*1024*1024,windowsHide:true,env:process.env});}
  catch{throw Error('Official Gibwork CLI lookup failed. Check the configured profile/authentication in the official CLI; no snapshot saved. No retry or submission performed.');}
  const s=snapshot(JSON.parse(output.stdout),'official-cli-live');
  if(s.task.id.toLowerCase()!==id.toLowerCase())throw Error('CLI returned a different task');
  return s;
}
