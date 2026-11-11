import test from 'node:test';
import assert from 'node:assert/strict';
import {parseNews, refresh} from './fuentes.mjs';
import {fuentes, valorar} from './catalogo-fuentes.mjs';
import {mergeItems,seleccionarAviso,serveApi} from './api.mjs';

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
 const catalog=get('/api/v1/fuentes').body.items;assert.ok(catalog.some(s=>s.id==='facpce-auditoria'));assert.equal(catalog.find(s=>s.id==='errepar').connection,'manual');
});

test('Jurisdicción y perfil se cruzan sin confundir CABA, provincia y Nación',()=>{
  const items=parseNews(xml('https://www.iprofesional.com/impuestos/123-novedad'),source);
  const get=query=>serveApi(new URL('https://local.invalid/api/v1/novedades?'+query),
    (status,body)=>({status,body}),{mode:'archivo'},items,0);
  const ids=query=>get(query).body.items.map(item=>item.id);
  assert.deepEqual(ids('categoria=impositivo&jurisdiccion=caba&orden=recientes'),[
    'caba-agip-atencion-11-noviembre-2026','caba-agip-431-sirtac-enero-2027','caba-agip-432-sircupa-enero-2027',
    'caba-agip-339-transparencia-fiscal','caba-comarb-9-padron-federal'
  ]);
  assert.ok(ids('categoria=impositivo&jurisdiccion=provincial').includes('arba-23-planes-2026'));
  assert.ok(ids('categoria=impositivo&jurisdiccion=provincial').includes('entre-rios-ater-385-401-planes'));
  assert.ok(!ids('categoria=impositivo&jurisdiccion=provincial').includes('caba-agip-431-sirtac-enero-2027'));
  assert.deepEqual(ids('jurisdiccion=caba&orden=perfil&perfil=auditoria'),['caba-auditoria-rt-37']);
  assert.deepEqual(ids('jurisdiccion=nacional&orden=perfil&perfil=precios-transferencia'),['arca-5903-precios-transferencia']);
  assert.deepEqual(ids('jurisdiccion=caba&orden=perfil&perfil=impuestos'),ids('jurisdiccion=caba&perfil=impuestos&orden=recientes'));
  assert.ok(get('orden=relevantes').body.items.findIndex(item=>item.importance==='seguimiento')>0);
  assert.equal(get('jurisdiccion=sin-clasificar&modo=automatico').body.total,1);
  for(const query of ['orden=perfil','orden=ranking','perfil=desconocido','jurisdiccion=desconocida','jurisdiccion=caba&jurisdiccion=nacional']) {
    assert.equal(get(query).status,400);
  }
});

test('Los avisos seleccionan un resumen reciente y respetan el sector, el alcance y la última ficha enviada',()=>{
  const preferences={category:'impositivo',jurisdiction:'caba',profile:'impuestos'};
  const date='2026-11-11';
  const item=seleccionarAviso([],[],preferences,'2026-11-10',date);
  assert.equal(item.id,'caba-agip-atencion-11-noviembre-2026');
  for(const changes of [{jurisdiction:'nacional'},{profile:'auditoria'},{last_item:item.id}]) {
    assert.equal(seleccionarAviso([],[],{...preferences,...changes},'2026-11-10',date),undefined);
  }
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
