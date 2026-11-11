import { fuentes, valorar } from './catalogo-fuentes.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './server.mjs';

const compile=async()=>({summaries:[],status:{attempted:0,errors:0,count:0}});

test('API, interfaz, filtros, controles y continuidad ante fallo',async t=>{
  let call=0;
  const item={id:'fed-test',title:'Ejemplo de prueba',summary:'Contenido de prueba',category:'internacional',date:'2026-11-09',source:'Fed',url:'https://www.federalreserve.gov/newsevents/pressreleases/test.htm',mode:'automatico'};
  const {server,refresh}=createApp({live:true,compile,update:async()=>{
    if(++call>1)throw Error('Servicio no disponible');
    return {items:[item,item,{...item,id:'dominio-no-permitido',url:'https://example.org/'},{...item,id:'fecha-no-permitida',date:'2026-02-30'}],status:[{id:'reserva-federal',ok:true,count:2}]};
  }});
  await new Promise((ok,fail)=>server.listen(0,'127.0.0.1',ok).once('error',fail));
  t.after(()=>new Promise(ok=>server.close(ok)));
  const base=`http://127.0.0.1:${server.address().port}`;
  const req=(path,options)=>fetch(base+path,options),json=async(path)=>(await req(path)).json();
  assert.equal((await req('/api/v1/actualizacion')).status,503);
  const home=await req('/');assert.equal(home.status,200);assert.match(await home.text(),/Contanuevas/);
  assert.match(home.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  for(const p of ['/estilo.css','/app.js','/marca.svg','/icono.svg','/serif.woff2','/sans.woff2'])assert.equal((await req(p)).status,200,p);
  assert.equal((await json('/api/v1/novedades')).total,9);
  const editorial=await json('/api/v1/novedades?modo=editorial&categoria=laboral&q=casas-particulares-noviembre-2026');
  assert.equal(editorial.total,1);
  assert.equal(editorial.items[0].id,'casas-particulares-noviembre-2026');
  assert.ok(editorial.items[0].references.some(ref=>ref.label.includes('Anexo IV')));
  assert.equal(editorial.items[0].tables[0].rows.length,5);
  assert.equal(editorial.items[0].tables[1].rows.length,5);
  assert.equal((await json('/api/v1/novedades?categoria=contable')).total,1);
  assert.equal((await json('/api/v1/novedades?q=MODERNIZACION')).items[0].id,'ley-27742');
  assert.equal((await json('/api/v1/novedades?limite=1&desde_fila=1')).items.length,1);
  assert.equal((await json('/api/v1/novedades?desde=2025-01-01&hasta=2025-12-31')).total,1);
  for(const q of ['limite=101','categoria=ninguna','modo=otro','desde=2026-02-30','desde=2025-01-01&hasta=2024-01-01','limite=1&limite=2','campo=extra'])assert.equal((await req('/api/v1/novedades?'+q)).status,400,q);
  assert.equal((await req('/api/v1/novedades/inexistente')).status,404);
  assert.equal((await req('/api/v1/novedades/extra/ley-27742')).status,404);
  assert.equal((await req('/server.mjs')).status,404);
  assert.equal((await req('/',{method:'POST'})).status,405);
  assert.equal(await (await req('/',{method:'HEAD'})).text(),'');
  assert.equal((await json('/api/v1/fuentes')).items.length,fuentes.length);
  await Promise.all([refresh(),refresh()]);assert.equal(call,1);
  assert.deepEqual((await json('/api/v1/novedades?modo=automatico')).items,[valorar(item)]);
  assert.equal((await json('/api/v1/novedades/fed-test')).id,'fed-test');
  assert.equal((await json('/api/v1/salud')).sources[0].ok,true);
  assert.equal((await req('/api/v1/actualizacion')).status,200);
  await refresh();assert.equal((await json('/api/v1/salud')).sources[0].ok,false);
  const degraded=await req('/api/v1/actualizacion');
  assert.equal(degraded.status,503);
  assert.equal((await degraded.json()).estado,'degradada');
  assert.equal((await json('/api/v1/novedades?modo=automatico')).total,1);
});

test('recupera fichas importadas tras reiniciar con fuentes caídas',async t=>{
  const directory=await mkdtemp(fileURLToPath(new URL('.cache-test-',import.meta.url)));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const cacheFile=join(directory,'copia.json');
  const item={id:'fed-cache',title:'Ficha de prueba',summary:'Texto de prueba',category:'internacional',date:'2026-11-09',source:'Fed',url:'https://www.federalreserve.gov/newsevents/pressreleases/test.htm',mode:'automatico'};
  const original=createApp({live:true,compile,cacheFile,update:async()=>({items:[item],status:[{id:'fed',ok:true,count:1}]})});
  await original.refresh();

  const restarted=createApp({live:true,compile,cacheFile,update:async()=>({items:[],status:[{id:'fed',ok:false,count:0}]})});
  await restarted.refresh();
  await new Promise(ok=>restarted.server.listen(0,'127.0.0.1',ok));
  t.after(()=>new Promise(ok=>restarted.server.close(ok)));
  const base='http://127.0.0.1:'+restarted.server.address().port;
  const health=await (await fetch(base+'/api/v1/salud')).json();
  assert.equal(health.cache,'restaurada');
  assert.equal(health.sources[0].ok,false);
  assert.deepEqual(await (await fetch(base+'/api/v1/novedades/fed-cache')).json(),valorar(item));
});
