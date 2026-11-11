import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { actualizar } from './worker.mjs';

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
