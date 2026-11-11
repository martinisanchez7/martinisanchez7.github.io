import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBoletin, parseBoletinCaba, parseBoletinJujuy, parseFed, parseNews, refresh, sourceIds } from './fuentes.mjs';
import { fuentes } from './catalogo-fuentes.mjs';

const notice = (id, date, authority, summary = '') => `<a class="avisos" href="/detalleAviso/primera/${id}/${date}"><div class="linea-aviso"><p class="item">${authority}</p><p><small>Resolución ${id}/2026</small><small>${summary}</small></p></div></a>`;
const html = `<!doctype html><main>${notice(123, '20261110', 'AGENCIA DE RECAUDACI&Oacute;N Y CONTROL ADUANERO', 'Monotributo')}${notice(124, '20261110', 'MINISTERIO DE CAPITAL HUMANO', 'Convenio Colectivo de Trabajo')}${notice(125, '20261109', 'INSPECCIÓN GENERAL DE JUSTICIA', 'Normas contables')}${notice(126, '20261110', 'MINISTERIO DE DEFENSA', 'Designación')}${notice(127, '20260230', 'AGENCIA DE RECAUDACIÓN Y CONTROL ADUANERO')}${notice(123, '20261110', 'AGENCIA DE RECAUDACIÓN Y CONTROL ADUANERO')}</main>`;
const fedItem = (link, date = 'Mon, 09 Nov 2026 21:30:00 -0500', title = 'FOMC &amp; Monetary Policy') => `<item><title><![CDATA[${title}]]></title><link>${link}</link><pubDate>${date}</pubDate></item>`;
const rss = items => `<?xml version="1.0"?><rss version="2.0"><channel>${items}</channel></rss>`;
const article = 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20261109a.htm';
const xml = rss(fedItem(article) + fedItem(`${article}?utm_source=feed`) + fedItem('https://www.federalreserve.gov.ejemplo.invalid/newsevents/pressreleases/falso') + fedItem('https://www.federalreserve.gov/newsevents/pressreleases/sinfecha.htm', 'inválida'));

test('BORA: categorías conservadoras, fechas de la edición y deduplicación', () => {
  const items = parseBoletin(html);
  assert.deepEqual(items.map(item => item.category), ['impositivo', 'laboral', 'contable']);
  assert.equal(items[0].date, '2026-11-10');
  assert.equal(items[0].url, 'https://www.boletinoficial.gob.ar/detalleAviso/primera/123/20261110');
  assert.ok(items.every(item => item.mode === 'automatico' && item.summary.includes('fuente oficial')));
  assert.throws(() => parseBoletin('<html>Acceso restringido</html>'), /no reconocido/);
  assert.deepEqual(parseBoletin('<p>No se encontraron avisos para la fecha</p>'), []);
});

test('Fed: restringe origen, exige fecha, quita seguimiento y deduplica', () => {
  const [item, extra] = parseFed(xml);
  assert.equal(extra, undefined);
  assert.equal(item.category, 'internacional');
  assert.equal(item.title, 'FOMC & Monetary Policy');
  assert.equal(item.url, article);
  assert.equal(item.date, '2026-11-09');
  assert.throws(() => parseFed(rss(fedItem('javascript:alert(1)'))), /no reconocidas/);
});

test('refresh: endpoints fijos y resultados parciales cuando falla una fuente', async () => {
  const targets = [];
  const result = await refresh(async (url, init) => {
    targets.push(url);
    assert.equal(init.redirect, 'manual');
    assert.ok(init.signal instanceof AbortSignal);
    if (url.includes('boletinoficial')) return new Response('Error', { status: 503 });
    return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=UTF-8' } });
  });
  assert.equal(targets.length, sourceIds.length); assert.equal(targets[0], 'https://www.boletinoficial.gob.ar/seccion/primera');
  assert.deepEqual(result.status.slice(0,2).map(status => [status.ok, status.count]), [[false, 0], [true, 1]]);
  assert.equal(result.items[0].url, article);
});

test('refresh: combina ambas fuentes y conserva fecha descendente', async () => {
  const result = await refresh(async url => url.includes('boletinoficial') ? new Response(html, { headers: { 'content-type': 'text/html; charset=UTF-8' } }) : new Response(xml, { headers: { 'content-type': 'text/xml' } }));
  assert.deepEqual(result.status.slice(0,2).map(status => [status.ok, status.count]), [[true, 3], [true, 1]]);
  assert.deepEqual(result.items.map(item => item.date), ['2026-11-10', '2026-11-10', '2026-11-09', '2026-11-09']);
});

test('refresh: rechaza formato incorrecto y corta cuerpo excesivo', async () => {
  let cancelled = false;
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(2 * 1024 * 1024 + 1)); }, cancel() { cancelled = true; } });
  const result = await refresh(async url => url.includes('boletinoficial') ? new Response(stream, { headers: { 'content-type': 'text/html' } }) : new Response(xml, { headers: { 'content-type': 'text/html' } }));
  assert.equal(cancelled, true);
  assert.deepEqual(result.items, []);
  assert.deepEqual(result.status.slice(0,2).map(status => status.ok), [false, false]);
});

test('Finanzas acepta la etiqueta binaria sólo para un RSS válido en su URL oficial',async()=>{
  const feed = 'https://www.ambito.com/rss/pages/finanzas.xml';
  const article = 'https://www.ambito.com/finanzas/noticia-n123';
  const payload = rss(fedItem(article));
  const attempt = async body => refresh(async url=>new Response(url===feed?body:payload,{
    headers:{'content-type':'application/octet-stream'}
  }));
  const valid = await attempt(payload);
  assert.deepEqual(valid.status.filter(source=>source.ok).map(source=>source.id),['ambito-finanzas']);
  assert.equal(valid.items[0].url,article);
  assert.ok((await attempt('<html>'+payload+'</html>')).status.every(source=>!source.ok));
});

test('CABA conserva sumarios y jurisdicción con enlaces del boletín oficial',()=>{
  const norma={id_norma:1015356,nombre:'Resolución N° 431/AGIP/26',
    sumario:'Adhiere al Sistema SIRTAC',url_norma:'http://api-restboletinoficial.buenosaires.gob.ar/download/5398821'};
  const edition=JSON.stringify({boletin:{anio:'2026',mes:'11',dia:'06'},normas:{normas:{
    'Poder Ejecutivo':{'Resolución':{'AGIP':[norma,{...norma,id_norma:1015357,url_norma:'https://example.invalid/download/5398822'}]}}
  }}});
  const [item,...rest]=parseBoletinCaba(edition);
  assert.equal(rest.length,0);
  assert.deepEqual(item.jurisdictions,['caba']);
  assert.equal(item.date,'2026-11-06');
  assert.equal(item.url,'https://api-restboletinoficial.buenosaires.gob.ar/download/5398821');
});

test('El índice provincial aplica el alcance explícito y la paginación del RSS',async()=>{
  const source=fuentes.find(source=>source.id==='contadores-en-red');
  const item=(name,url,tag)=>rss(`<item><title>${name}</title><link>${url}</link><pubDate>Wed, 11 Nov 2026 14:42:12 +0000</pubDate><category>${tag}</category></item>`);
  const origin=new URL(source.url).origin;
  const result=await refresh(async url=>new Response(url===source.feed
    ?item('Corrientes R. 313/2026 DGR Prorrogan vencimientos',origin+'/corrientes/','Recorrido por provincias')
    :item('Medidas de alivio fiscal',origin+'/tucuman/','Tucumán'),{headers:{'Content-Type':'application/rss+xml'}}),
  [source.id],{provincialPages:2});
  assert.deepEqual(new Set(result.items.flatMap(row=>row.jurisdictions)),new Set(['corrientes','tucuman']));
  assert.equal(result.status[0].latest,'2026-11-11');
});

test('Jujuy conserva el identificador de la publicación y selecciona resoluciones generales',()=>{
  const source=fuentes.find(item=>item.id==='boletin-jujuy');
  const item=(id,description)=>`<item><title>BOLETIN OFICIAL N° 133 – 06/11/2026</title><link>https://boletinoficial.jujuy.gob.ar/?p=${id}</link><description>${description}</description></item>`;
  const entries=parseBoletinJujuy(rss(item(437597,'RESOLUCION GENERAL Nº 1774-DPR/2026')+
    item(437478,'RESOLUCION Nº 1648-DPR/2026')),source);
  assert.deepEqual(entries.map(entry=>[entry.url,entry.date,entry.jurisdictions]),[
    ['https://boletinoficial.jujuy.gob.ar/?p=437597','2026-11-06',['jujuy']]
  ]);
});
