import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createDecipheriv, hkdfSync } from 'node:crypto';
import { AvisosDiarios, nextDelivery } from './avisos.mjs';
import { b64, encryptPush, pushEndpoint } from './webpush.mjs';
import worker from './worker.mjs';

test('Calcula el próximo horario en Argentina incluso después de medianoche UTC',()=>{
  const now=Date.parse('2026-11-12T00:30:00Z');
  assert.equal(new Date(nextDelivery('22:30',now)).toISOString(),'2026-11-12T01:30:00.000Z');
  assert.equal(new Date(nextDelivery('20:30',now)).toISOString(),'2026-11-12T23:30:00.000Z');
  assert.throws(()=>nextDelivery('24:00',now));
});

async function receiver() {
  const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const point=new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey));
  const auth=crypto.getRandomValues(new Uint8Array(16));
  return {pair,point,auth,keys:{p256dh:b64(point),auth:b64(auth)}};
}

test('El destinatario recupera el mensaje cifrado con su propia clave',async()=>{
  const {pair,point,auth,keys}=await receiver();
  const message={title:'Contanuevas',body:'Aviso laboral',category:'laboral'};
  const frame=await encryptPush(keys,message);
  assert.equal(new DataView(frame.buffer).getUint32(16),4096);
  assert.equal(frame[20],65);
  const remote=frame.slice(21,86);
  const sender=await crypto.subtle.importKey('raw',remote,{name:'ECDH',namedCurve:'P-256'},false,[]);
  const shared=await crypto.subtle.deriveBits({name:'ECDH',public:sender},pair.privateKey,256);
  const ikm=hkdfSync('sha256',Buffer.from(shared),auth,Buffer.concat([Buffer.from('WebPush: info\0'),point,remote]),32);
  const key=hkdfSync('sha256',ikm,frame.slice(0,16),'Content-Encoding: aes128gcm\0',16);
  const iv=hkdfSync('sha256',ikm,frame.slice(0,16),'Content-Encoding: nonce\0',12);
  const decipher=createDecipheriv('aes-128-gcm',Buffer.from(key),Buffer.from(iv));
  decipher.setAuthTag(frame.slice(-16));
  const decoded=Buffer.concat([decipher.update(frame.slice(86,-16)),decipher.final()]);
  assert.equal(decoded.at(-1),2);
  assert.deepEqual(JSON.parse(decoded.subarray(0,-1)),message);
});

test('Rutas de avisos limitan origen, método y destinos push',async()=>{
  assert.equal(pushEndpoint('https://fcm.googleapis.com.ejemplo.invalid/fcm/send/test'),undefined);
  assert.equal(pushEndpoint('https://fcm.googleapis.com/token'),undefined);
  assert.ok(pushEndpoint('https://fcm.googleapis.com/fcm/send/token-prueba'));
  const url='https://contanuevas.example/api/v1/avisos';
  assert.equal((await worker.fetch(new Request(url,{method:'POST',headers:{origin:'https://otra.example'}}),{})).status,403);
  assert.equal((await worker.fetch(new Request(url),{})).status,405);
});

test('El servidor guarda, entrega al vencer y elimina el aviso con la credencial del dispositivo',async t=>{
  const db=new DatabaseSync(':memory:');
  t.after(()=>db.close());
  const store=new Map();
  let alarm;
  const ctx={
    blockConcurrencyWhile:fn=>fn(),
    storage:{
      sql:{exec(query,...args){
        if(query.startsWith('CREATE')) {db.exec(query);return;}
        const statement=db.prepare(query);
        if(query.startsWith('SELECT')) return {toArray:()=>statement.all(...args),one:()=>statement.get(...args)};
        return {rowsWritten:statement.run(...args).changes};
      }},
      transactionSync:fn=>fn(),
      get:key=>store.get(key),put:(key,value)=>store.set(key,value),
      setAlarm:at=>{alarm=at;},deleteAlarm:()=>{alarm=undefined;}
    }
  };
  const object=new AvisosDiarios(ctx);
  const {keys}=await receiver();
  const url='https://test.invalid/api/v1/avisos';
  const endpoint='https://fcm.googleapis.com/fcm/send/token-de-prueba';
  const save=()=>object.fetch(new Request(url,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({hour:'09:30',category:'laboral',subscription:{endpoint,keys}})}));
  const config=await (await object.fetch(new Request(url+'/config'))).json();
  assert.equal(config.publicKey.length,87);
  assert.equal(config.privateKey,undefined);
  const saved=await (await save()).json();
  assert.equal(saved.enabled,true);
  assert.equal(alarm,Date.parse(saved.nextAt));
  assert.equal((await save()).status,409);

  const originalFetch=globalThis.fetch;
  let delivered=0;
  globalThis.fetch=async (dest,init)=>{
    assert.equal(dest,endpoint);
    assert.equal(init.headers['Content-Encoding'],'aes128gcm');
    assert.match(init.headers.Authorization,/^vapid t=/);
    delivered++;
    return new Response(null,{status:201});
  };
  t.mock.timers.enable({apis:['Date'],now:alarm});
  try { await object.alarm(); await object.alarm(); }
  finally {globalThis.fetch=originalFetch;t.mock.timers.reset();}
  assert.equal(delivered,1);
  assert.equal(alarm,Date.parse(saved.nextAt)+86_400_000);
  const deleted=await object.fetch(new Request(url,{method:'DELETE',headers:{Authorization:'Bearer '+saved.credential}}));
  assert.equal(deleted.status,200);
  assert.equal(alarm,undefined);
});
