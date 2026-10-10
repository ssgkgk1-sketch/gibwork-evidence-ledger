import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {capture} from './capture.mjs';
import {snapshot,inspect,compare,saveReport} from './ledger.mjs';
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const [command,...args]=process.argv.slice(2);
try{
  if(command==='capture'&&(args.length===2||args.length===3)){
    const s=await capture(args[0],args[2]);await writeFile(args[1],JSON.stringify(s,null,2)+'\n',{flag:'wx'});console.log('Captured official task snapshot: '+args[1]);
  }else if(command==='import'&&args.length===2){
    const s=snapshot(await json(args[0]));await writeFile(args[1],JSON.stringify(s,null,2)+'\n',{flag:'wx'});console.log('Imported CLI output (not authenticated by this tool): '+args[1]);
  }else if(command==='check'&&args.length===3&&args[1]==='--out'){
    const m=await json(args[0]),base=path.dirname(path.resolve(args[0])),root=path.resolve(base,m.projectRoot??'.');
    const s=await json(path.resolve(base,m.snapshot)),c=m.currentSnapshot?await json(path.resolve(base,m.currentSnapshot)):s;
    const report=await inspect(m,root,s,c);await saveReport(path.resolve(args[2]),report);
    console.log(JSON.stringify({gate:report.gate,requirements:report.requirements.map(r=>({id:r.id,status:r.status})),report:path.resolve(args[2],'report.md')},null,2));if(report.gate==='BLOCKED')process.exitCode=2;
  }else if(command==='diff'&&args.length===2){console.log(JSON.stringify(compare(await json(args[0]),await json(args[1])),null,2));}
  else throw Error('Usage:\n node cli.mjs capture TASK_UUID NEW_SNAPSHOT.json [PROFILE]\n node cli.mjs import CLI_OUTPUT.json NEW_SNAPSHOT.json\n node cli.mjs check MANIFEST.json --out NEW_REPORT_DIR\n node cli.mjs diff BASELINE.json CURRENT.json');
}catch(e){console.error('Evidence Ledger: '+e.message);process.exitCode=1;}
