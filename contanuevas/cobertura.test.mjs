import test from 'node:test';
import assert from 'node:assert/strict';
import {parseNews, refresh} from './fuentes.mjs';
import {fuentes, valorar} from './catalogo-fuentes.mjs';
import {mergeItems,serveApi} from './api.mjs';

const source=fuentes.find(s=>s.id==='iprofesional-impuestos');
const xml=link=>`<rss><channel><item><title><![CDATA[Monotributo: nueva escala]]></title><link>${link}</link><pubDate>Tue, 10 Nov 2026 18:00:00 -0300</pubDate><description>Texto no autorizado<script>alert(1)</script></description></item></channel></rss>`;
test('Prensa: no copia HTML ni atribuye verificación a un titular',()=>{
 const items=parseNews(xml('https://www.iprofesional.com/impuestos/123-novedad'),source);
 assert.equal(items.length,1);assert.equal(items[0].category,'impositivo');
 assert.ok(!JSON.stringify(items).includes('alert(1)'));
 const ficha=valorar(items[0]);assert.equal(ficha.sourceTier,'periodistico');assert.equal(ficha.verification,'pendiente');assert.equal(ficha.importance,'alta');assert.equal(ficha.brief,undefined);
 assert.equal(mergeItems([],items).length,1);
 for(const url of ['https://www.iprofesional.com.evil.invalid/nota','https://usuario:clave@www.iprofesional.com/nota','http://www.iprofesional.com/nota']) assert.throws(()=>parseNews(xml(url),source));
});
test('Fallos de medios no borran las entradas válidas de otras fuentes',async()=>{
 const result=await refresh(async url=>new Response(url===source.feed?xml('https://www.iprofesional.com/impuestos/123-novedad'):'Forbidden',{status:url===source.feed?200:403,headers:{'content-type':'application/xml'}}));
 assert.equal(result.items.length,1);assert.equal(result.status.filter(s=>s.ok).length,1);
});
test('API: filtros combinados y resumen estructurado',()=>{
 const get=path=>serveApi(new URL('https://local.invalid'+path),(status,body)=>({status,body}),{mode:'archivo'},[],0);
 const ficha=get('/api/v1/novedades?modo=editorial&importancia=alta&respaldo=oficial&q=casas-particulares-noviembre-2026');
 assert.equal(ficha.status,200);assert.equal(ficha.body.total,1);assert.ok(ficha.body.items[0].brief.whatChanged);
 assert.equal(get('/api/v1/novedades?respaldo=garantizado').status,400);
 assert.equal(get('/api/v1/novedades?fuente=desconocida').status,400);
 const catalog=get('/api/v1/fuentes').body.items;assert.equal(catalog.length,24);assert.equal(catalog.find(s=>s.id==='errepar').connection,'manual');
});

test('Una alerta cotejada enlaza su ficha editorial sin cambiar su respaldo',()=>{
  const source=fuentes.find(source=>source.id==='ambito-fiscal');
  const url='https://www.ambito.com/novedades-fiscales/arba-deuda-deuda-y-plan-plan-como-gozar-los-mayores-beneficios-las-facilidades-pago-n6343333';
  const items=parseNews(xml(url),source);
  const get=path=>serveApi(new URL('https://local.invalid'+path),(status,body)=>({status,body}),{mode:'archivo'},items,0);
  const alert=get('/api/v1/novedades?modo=automatico&respaldo=periodistico').body.items[0];
  assert.equal(alert.reviewedId,'arba-23-planes-2026');
  assert.equal(alert.sourceTier,'periodistico');
  const review=get('/api/v1/novedades?modo=editorial&q='+alert.reviewedId).body.items[0];
  assert.equal(review.verification,'revisada');
  assert.deepEqual(review.tables[0].rows.map(row=>row[1]),['40%','35%','30%','30%']);
});
