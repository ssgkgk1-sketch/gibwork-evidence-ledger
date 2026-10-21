import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {Connection, PublicKey} from '@solana/web3.js';
import {GibworkClient} from '@gibwork/sdk';

test('patched RPC dependency supports a real Solana HTTP request and SDK import', async t => {
  const requests=[];
  const server=http.createServer(async (req,res) => {
    const chunks=[];
    for await (const chunk of req) chunks.push(chunk);
    const request=JSON.parse(Buffer.concat(chunks).toString());
    requests.push(request);
    res.writeHead(200,{'content-type':'application/json'});
    res.end(JSON.stringify({jsonrpc:'2.0',id:request.id,result:{context:{slot:1},value:42}}));
  });
  t.after(() => {server.closeAllConnections();server.close();});
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  const connection=new Connection(`http://127.0.0.1:${server.address().port}`,'confirmed');
  assert.equal(await connection.getBalance(new PublicKey('11111111111111111111111111111111')),42);
  assert.equal(requests.length,1);
  assert.equal(requests[0].method,'getBalance');
  assert.equal(typeof requests[0].id,'string');
  assert.equal(typeof GibworkClient,'function');
});
