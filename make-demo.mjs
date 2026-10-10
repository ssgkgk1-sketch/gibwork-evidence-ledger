import {writeFile} from 'node:fs/promises';import {snapshot} from './ledger.mjs';
const s=snapshot({ok:true,data:{id:'00000000-0000-4000-8000-000000000001',title:'Synthetic Gibwork evidence demonstration',content:'Provide source, setup instructions, and attend two sessions.',isOpen:true,deadline:null}},'synthetic-fixture-not-live');
await writeFile(new URL('examples/snapshot.json',import.meta.url),JSON.stringify(s,null,2)+'\n',{flag:'wx'});
