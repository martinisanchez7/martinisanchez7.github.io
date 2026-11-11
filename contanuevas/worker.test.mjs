import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { actualizar } from './worker.mjs';
import { sourceIds } from './fuentes.mjs';

const compile=async()=>({summaries:[],status:{attempted:0,errors:0,count:0}});

test('Worker conserva fichas, reintenta fallos y mantiene los filtros',async()=>{
  const storage=new Map();
  const kv={
    async get(key){return JSON.parse(storage.get(key)??'null');},
    async put(key,value){storage.set(key,value);}
  };
  const env={BOLETIN:kv,ASSETS:{fetch:()=>new Response('Boletín')}};
  const request=(path,method='GET')=>worker.fetch(new Request('https://example.invalid'+path,{method}),env);
  const item={id:'fed-prueba',title:'Reserva Federal',summary:'Ejemplo',category:'internacional',date:'2026-11-09',source:'Fed',url:'https://www.federalreserve.gov/newsevents/pressreleases/test.htm',mode:'automatico'};
  const now=Date.now();
  assert.equal((await request('/api/v1/actualizacion')).status,503);
  assert.equal((await request('/')).headers.get('x-frame-options'),'DENY');
  assert.equal((await request('/worker.mjs')).status,404);
  assert.match((await request('/')).headers.get('permissions-policy'),/camera=\(\)/);
  assert.equal((await request('/api/v1/novedades','POST')).status,405);
  assert.equal((await request('/api/v1/novedades?modo=incorrecto')).status,400);
  await actualizar(kv,now,async()=>({items:[item],status:[{id:'fed',ok:false,count:0}]}),compile);
  assert.equal((await request('/api/v1/actualizacion')).status,503);
  assert.equal((await (await request('/api/v1/novedades?modo=automatico')).json()).total,1);
  let calls=0;
  const recovered=async()=>{calls++;return {items:[],status:[{id:'fed',ok:true,count:1}]};};
  await actualizar(kv,now,recovered,compile);
  await actualizar(kv,now,recovered,compile);
  assert.equal(calls,1);
  assert.equal((await request('/api/v1/actualizacion')).status,200);
  assert.equal((await (await request('/api/v1/novedades?categoria=laboral&modo=editorial&q=casas-particulares-noviembre-2026')).json()).total,1);
});

test('Reutiliza la copia pública, reintenta sólo la fuente fallida y descarta la copia después de escribir',async()=>{
  const storage=new Map();
  let reads=0;
  const kv={
    async get(key){reads++;return JSON.parse(storage.get(key)??'null');},
    async put(key,value){storage.set(key,value);}
  };
  const env={BOLETIN:kv};
  const get=(path,headers)=>worker.fetch(new Request('https://test.invalid'+path,{headers}),env);
  const now=Date.now();
  assert.equal((await get('/api/v1/desconocida')).status,404);
  assert.equal((await get('/api/v1/fuentes')).status,200);
  assert.equal(reads,0);
  const failed='ambito-finanzas';
  await actualizar(kv,now,async()=>({items:[],status:sourceIds.map(id=>({id,ok:id!==failed,count:0}))}),compile);
  const initialReads=reads;
  const list=await get('/api/v1/novedades?limite=1');
  assert.match(list.headers.get('cache-control'),/max-age=15/);
  assert.equal((await get('/api/v1/novedades?limite=2',{Authorization:'Bearer prueba'})).headers.get('cache-control'),'no-store');
  assert.equal((await get('/api/v1/novedades?limite=101')).headers.get('cache-control'),'no-store');
  assert.equal(reads,initialReads+1);
  await actualizar(kv,now+1000,async ids=>{
    assert.deepEqual(ids,[failed]);
    return {items:[],status:[{id:failed,ok:true,count:3}]};
  },compile);
  const afterWrite=reads;
  await get('/api/v1/novedades?limite=2');
  assert.equal(reads,afterWrite+1);
  const state=await get('/api/v1/actualizacion');
  assert.equal(state.headers.get('cache-control'),'no-store');
  const body=await state.json();
  assert.equal(body.estado,'al-dia');
  assert.equal(body.fuentes.length,sourceIds.length);
});
