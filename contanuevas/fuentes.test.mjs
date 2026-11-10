import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBoletin, parseFed, refresh } from './fuentes.mjs';

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
    assert.equal(init.redirect, 'error');
    assert.ok(init.signal instanceof AbortSignal);
    if (url.includes('boletinoficial')) return new Response('Error', { status: 503 });
    return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=UTF-8' } });
  });
  assert.deepEqual(targets, ['https://www.boletinoficial.gob.ar/seccion/primera', 'https://www.federalreserve.gov/feeds/press_all.xml']);
  assert.deepEqual(result.status.map(status => [status.ok, status.count]), [[false, 0], [true, 1]]);
  assert.equal(result.items[0].url, article);
});

test('refresh: combina ambas fuentes y conserva fecha descendente', async () => {
  const result = await refresh(async url => url.includes('boletinoficial') ? new Response(html, { headers: { 'content-type': 'text/html; charset=UTF-8' } }) : new Response(xml, { headers: { 'content-type': 'text/xml' } }));
  assert.deepEqual(result.status.map(status => [status.ok, status.count]), [[true, 3], [true, 1]]);
  assert.deepEqual(result.items.map(item => item.date), ['2026-11-10', '2026-11-10', '2026-11-09', '2026-11-09']);
});

test('refresh: rechaza formato incorrecto y corta cuerpo excesivo', async () => {
  let cancelled = false;
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(2 * 1024 * 1024 + 1)); }, cancel() { cancelled = true; } });
  const result = await refresh(async url => url.includes('boletinoficial') ? new Response(stream, { headers: { 'content-type': 'text/html' } }) : new Response(xml, { headers: { 'content-type': 'text/html' } }));
  assert.equal(cancelled, true);
  assert.deepEqual(result.items, []);
  assert.deepEqual(result.status.map(status => status.ok), [false, false]);
});
