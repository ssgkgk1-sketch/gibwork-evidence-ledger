import http from 'node:http';
import {randomBytes} from 'node:crypto';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GibworkClient} from '@gibwork/sdk';
import {PublicKey} from '@solana/web3.js';
import {snapshot} from './ledger.mjs';

const taskId=process.argv[2],expectedAddress=process.argv[3];
if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(taskId??''))throw Error('Usage: node wallet-lookup.mjs TASK_UUID EXPECTED_SOLANA_ADDRESS');
let expectedKey;
try{expectedKey=new PublicKey(expectedAddress);}catch{throw Error('Invalid Solana address');}
if(expectedKey.toBase58()!==expectedAddress)throw Error('Non-canonical Solana address');

const here=path.dirname(fileURLToPath(import.meta.url));
const token=randomBytes(32).toString('hex');
let state={phase:'idle'};
let pending=null;
const securityHeaders={
  'cache-control':'no-store',
  'x-content-type-options':'nosniff',
  'referrer-policy':'no-referrer',
  'content-security-policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
};
function json(res,status,value){res.writeHead(status,{'content-type':'application/json; charset=utf-8',...securityHeaders});res.end(JSON.stringify(value));}
async function body(req){
  const parts=[];let size=0;
  for await(const part of req){size+=part.length;if(size>4096)throw Error('Request too large');parts.push(part);}
  return JSON.parse(Buffer.concat(parts).toString('utf8'));
}
function requireToken(req,res){
  const origin=req.headers.origin;
  const own=`http://127.0.0.1:${server.address().port}`;
  if((origin&&origin!==own)||req.headers['x-session-token']!==token){json(res,403,{error:'Forbidden'});return false;}
  return true;
}
async function lookup(){
  const signer={
    publicKey:expectedKey,
    signMessage(message){
      if(pending)throw Error('Only one authentication request is allowed');
      const safePrefix=`gibwork:view-task\nmethod:GET\npath:/v2/int/tasks/${taskId}\ntaskId:${taskId}\nwalletAddress:${expectedAddress}\n`;
      if(!new TextDecoder().decode(message).startsWith(safePrefix))throw Error('Unexpected wallet message; signing blocked');
      return new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{pending=null;reject(Error('Wallet signature timed out'));},120000);
        pending={bytes:Array.from(message),resolve(value){clearTimeout(timer);pending=null;resolve(value);},reject(error){clearTimeout(timer);pending=null;reject(error);}};
        state={phase:'awaiting-signature'};
      });
    },
    async signTransaction(){throw Error('Transactions are disabled in this read-only tool');},
  };
  try{
    const client=new GibworkClient({signer,production:true,timeoutMs:30000});
    const task=await client.tasks.get(taskId);
    const result=snapshot({ok:true,data:task},'official-sdk-live-wallet-message');
    if(result.task.id.toLowerCase()!==taskId.toLowerCase())throw Error('Server returned a different task');
    const dir=path.join(here,'captures');
    await mkdir(dir,{recursive:true});
    const file=path.join(dir,`${taskId}-${Date.now()}.json`);
    await writeFile(file,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
    state={phase:'done',title:result.task.title,source:result.source,scopeSha256:result.scopeSha256,file};
  }catch(error){
    state={phase:'error',error:error?.message?.slice(0,300)??'Lookup failed'};
  }
}
const server=http.createServer(async(req,res)=>{
  try{
    if(req.method==='GET'&&req.url==='/'){
      const page=(await readFile(path.join(here,'wallet-lookup.html'),'utf8'))
        .replaceAll('__TOKEN__',token).replaceAll('__ADDRESS__',expectedAddress).replaceAll('__TASK_ID__',taskId);
      res.writeHead(200,{'content-type':'text/html; charset=utf-8',...securityHeaders});res.end(page);return;
    }
    if(req.method==='GET'&&req.url==='/wallet-lookup-client.js'){
      res.writeHead(200,{'content-type':'text/javascript; charset=utf-8',...securityHeaders});res.end(await readFile(path.join(here,'wallet-lookup-client.js')));return;
    }
    if(req.method==='GET'&&req.url==='/wallet-lookup.css'){
      res.writeHead(200,{'content-type':'text/css; charset=utf-8',...securityHeaders});res.end(await readFile(path.join(here,'wallet-lookup.css')));return;
    }
    if(req.method==='GET'&&req.url==='/status'){
      if(!requireToken(req,res))return;
      json(res,200,{...state,challenge:pending?.bytes??null});return;
    }
    if(req.method==='POST'&&req.url==='/start'){
      if(!requireToken(req,res))return;
      if(state.phase!=='idle'){json(res,409,{error:'Lookup already started'});return;}
      const input=await body(req);
      if(input.address!==expectedAddress){json(res,400,{error:'Wrong wallet address'});return;}
      state={phase:'starting'};
      void lookup();
      json(res,202,{phase:'starting'});return;
    }
    if(req.method==='POST'&&req.url==='/signature'){
      if(!requireToken(req,res))return;
      const input=await body(req);
      if(!pending||!Array.isArray(input.signature)||input.signature.length!==64||input.signature.some(n=>!Number.isInteger(n)||n<0||n>255)){
        json(res,400,{error:'No valid pending signature'});return;
      }
      pending.resolve(new Uint8Array(input.signature));
      json(res,200,{phase:'signature-received'});return;
    }
    json(res,404,{error:'Not found'});
  }catch(error){json(res,400,{error:error?.message?.slice(0,120)??'Request failed'});}
});
server.listen(0,'127.0.0.1',()=>{
  console.log(`Open in the browser with the OKX extension: http://127.0.0.1:${server.address().port}/`);
  console.log(`Expected wallet: ${expectedAddress}`);
  console.log('Read-only: one task lookup, message signature only, no transaction signing or submission.');
});
