import { createHash } from 'node:crypto';
import { fuentes } from './catalogo-fuentes.mjs';

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 8_000;
const BORA = 'https://www.boletinoficial.gob.ar';
const FED = 'https://www.federalreserve.gov';
const dayOptions={year:'numeric',month:'2-digit',day:'2-digit'};
const argDay=new Intl.DateTimeFormat('en-CA',{...dayOptions,timeZone:'America/Argentina/Buenos_Aires'});
const fedDay=new Intl.DateTimeFormat('en-CA',{...dayOptions,timeZone:'America/New_York'});
const rssStart=/^\s*(?:<\?xml\s[^?]*\?>\s*)?<rss\b[^>]*>\s*<channel\b/i;

function checkRss(xml) {
  if(!rssStart.test(xml) || !/<\/channel\s*>\s*<\/rss\s*>\s*$/i.test(xml)) {
    throw new Error('Formato RSS no reconocido');
  }
}
const entities = Object.freeze({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', ntilde: 'ñ', Ntilde: 'Ñ', ordm: 'º', deg: '°' });

function decode(value) {
  return value.replace(/&(#x[0-9a-f]{1,6}|#[0-9]{1,7}|[A-Za-z]{2,10});/gi, (entity, key) => {
    if (key.startsWith('#')) {
      const hex = key[1]?.toLowerCase() === 'x';
      const point = Number.parseInt(key.slice(hex ? 2 : 1), hex ? 16 : 10);
      return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : '';
    }
    return Object.hasOwn(entities, key) ? entities[key] : entity;
  });
}

export function plain(value, limit = 320) {
  return decode(value.replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, ''))
    .replace(/<[^<>]*>/g, ' ').replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, limit);
}

function validDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value ? value : '';
}

function classify(title, summary) {
  const text = `${title} ${summary}`.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  if (/\b(?:normas? (?:profesionales )?contables?|normas? (?:internacionales? )?de informacion financiera|estados contables|estados financieros|auditoria contable|resolucion tecnica(?: n[o°.]?)? \d+)\b/.test(text)) return 'contable';
  if (/\b(?:agencia de recaudacion y control aduanero|administracion federal de ingresos publicos|monotributo|impuesto a las ganancias|impuesto al valor agregado|bienes personales|obligaciones tributarias|regimen de retencion|procedimiento tributario)\b/.test(text)) return 'impositivo';
  if (/administracion nacional de la seguridad social/.test(text) && /\b(haberes?|bases imponibles?|resolucion)\b/.test(text)) return 'laboral';
  if (/\b(?:convenios? colectivos? de trabajo|contrato de trabajo|acuerdos? salariales?|riesgos del trabajo|salario minimo|jornada laboral|relaciones laborales|negociacion colectiva|comision nacional de trabajo en casas particulares|casas particulares|reforma laboral|despidos?|indemnizaciones?|paritarias|sueldos?|salarios?)\b/.test(text)) return 'laboral';
  return '';
}

function unique(items) {
  return [...new Map(items.map(item => [item.id, item])).values()];
}

function* blocks(text, pattern, maxBody) {
  let open;
  for (const tag of text.matchAll(pattern)) {
    if (!tag[1]) open = tag;
    else if (open) {
      const start = open.index + open[0].length;
      if (tag.index - start <= maxBody) yield [open[2], text.slice(start, tag.index)];
      open = undefined;
    }
  }
}

export function parseBoletin(html) {
  const items = [];
  let recognized = 0;
  // Process complete anchors only: a link to anexos is not a new notice.
  for (const [attributes, body] of blocks(html, /<(\/?)a\b([^<>]{0,2048})>/gi, 16_384)) {
    const href = attributes.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    if (!href) continue;
    const raw = decode(href[1] ?? href[2]);
    const match = raw.match(/^(?:https:\/\/www\.boletinoficial\.(?:gob|gov)\.ar)?\/detalleAviso\/primera\/(\d{1,12})\/(\d{4})(\d{2})(\d{2})\/?$/i);
    if (!match) continue;
    const [, notice, year, month, day] = match;
    const date = validDay(`${year}-${month}-${day}`);
    const heading = [...body.matchAll(/<p\b[^>]*\bclass\s*=\s*["'][^"']*\bitem\b[^"']*["'][^>]*>([\s\S]*?)<\/p\s*>/gi)].map(m => plain(m[1], 140));
    const small = [...body.matchAll(/<small\b[^>]*>([\s\S]*?)<\/small\s*>/gi)].map(m => plain(m[1], 280));
    const title = [heading[0], small[0]].filter(Boolean).join(' · ').slice(0, 260);
    if (!date || !heading[0] || !small[0]) continue;
    recognized++;
    const category = classify(title, small[1] ?? '');
    if (!category) continue;
    // Catalog metadata only. We do not republish the notice or infer its effect.
    items.push({ id: `bora-${notice}`, title, summary: 'Aviso de la Primera Sección. Consultá la norma, sus anexos y su vigencia en la fuente oficial.', category, date, url: `${BORA}/detalleAviso/primera/${notice}/${year}${month}${day}`, source: 'Boletín Oficial', mode: 'automatico' });
    if (items.length >= 60) break;
  }
  if (!recognized && !/no se encontraron (?:avisos|publicaciones)|no hay avisos (?:para|en)/i.test(plain(html, MAX_BYTES))) throw new Error('Formato de edición no reconocido');
  return unique(items);
}

function xmlField(item, key) {
  return item.match(new RegExp(`<${key}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${key}\\s*>`, 'i'))?.[1] ?? '';
}

export function parseFed(xml) {
  checkRss(xml);
  const entries = blocks(xml, /<(\/?)item\b([^<>]{0,512})>/gi, 65_536);
  const items = [];
  let examined = 0;
  for (const [, entry] of entries) {
    if (++examined > 80) break;
    const title = plain(xmlField(entry, 'title'), 260);
    const published = new Date(plain(xmlField(entry, 'pubDate'), 100));
    if (!title || !Number.isFinite(published.valueOf())) continue;
    let link;
    try { link = new URL(plain(xmlField(entry, 'link'), 500)); } catch { continue; }
    if (link.origin !== FED || link.username || link.password || !link.pathname.startsWith('/newsevents/pressreleases/')) continue;
    link.search = '';
    link.hash = '';
    const date = validDay(fedDay.format(published));
    if (!date) continue;
    const id = createHash('sha256').update(link.href).digest('hex').slice(0, 16);
    items.push({ id: `fed-${id}`, title, summary: 'Comunicado de la Reserva Federal. Consultá la publicación original para conocer su alcance.', category: 'internacional', date, url: link.href, source: 'Reserva Federal (EE. UU.)', mode: 'automatico' });
  }
  if (/<item\b/i.test(xml) && items.length === 0) throw new Error('Entradas RSS no reconocidas');
  return unique(items);
}

export async function download(fetcher, source) {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const response = await fetcher(source.url, { signal, redirect: 'manual', headers: { accept: source.accept, 'user-agent': 'Contanuevas/0.1 (lector de fuentes publicas)' } });
  const kind = response.headers.get('content-type') ?? '';
  const mislabeledFinanceFeed = source.url==='https://www.ambito.com/rss/pages/finanzas.xml'
    && /^application\/octet-stream(?:\s*;|\s*$)/i.test(kind);
  let rejection;
  if (!response.ok) rejection=`HTTP ${response.status}`;
  else if (response.redirected || (response.url && response.url !== source.url)) rejection='Origen inesperado';
  else if (!source.type.test(kind) && !mislabeledFinanceFeed) rejection='Tipo de contenido inesperado';
  else if (Number(response.headers.get('content-length')) > MAX_BYTES) rejection='Respuesta demasiado grande';
  if(rejection) {
    await response.body?.cancel().catch(()=>{});
    throw new Error(rejection);
  }
  if (!response.body) throw new Error('Respuesta sin contenido');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) throw new Error('Respuesta demasiado grande');
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    if(mislabeledFinanceFeed) checkRss(body);
    return body;
  } finally {
    if (bytes > MAX_BYTES) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

const sources = [
  { id: 'boletin-oficial', url: `${BORA}/seccion/primera`, accept: 'text/html', type: /^text\/html\b/i, parse: parseBoletin },
  { id: 'reserva-federal', url: `${FED}/feeds/press_all.xml`, accept: 'application/rss+xml, application/xml, text/xml', type: /^(?:text\/xml|application\/(?:rss\+xml|xml))\b/i, parse: parseFed },
];

export function parseNews(xml, source) {
  checkRss(xml);
  const origin=new URL(source.url).hostname.replace(/^www\./,'');
  const items=[];
  let examined=0,recognized=0;
  for(const [,entry] of blocks(xml, /<(\/?)item\b([^<>]{0,512})>/gi, 65_536)) {
    if(++examined>80) break;
    const title=plain(xmlField(entry,'title'),260);
    const published=new Date(plain(xmlField(entry,'pubDate'),100));
    let link;try{link=new URL(plain(xmlField(entry,'link'),1000));}catch{continue;}
    if(!title||!Number.isFinite(published.valueOf())||link.protocol!=='https:'||link.username||link.password||link.port||link.hostname.replace(/^www\./,'')!==origin) continue;
    recognized++;
    // Se conserva sólo el titular y enlace. No se copia la nota ni se ejecuta su HTML.
    let category=classify(title,'');
    if(!category&&/impuestos|fiscal/.test(source.id)) category='impositivo';
    if(!category&&source.id==='iprofesional-legales') continue;
    if(!category) category=/\b(fed|estados unidos|wall street|china|bce|europa|paraguay)\b/i.test(title)?'internacional':'economia';
    link.search='';link.hash='';
    const id=createHash('sha256').update(link.href).digest('hex').slice(0,16);
    const date=argDay.format(published);
    items.push({id:`prensa-${id}`,title,summary:'Alerta periodística pendiente de cotejo con el documento original. Todavía no hay un resumen normativo verificado.',date,category,url:link.href,source:source.name,sourceId:source.id,mode:'automatico'});
  }
  if(/<item\b/i.test(xml)&&!recognized) throw new Error('Entradas RSS no reconocidas');
  return unique(items);
}

for(const source of fuentes.filter(s=>s.feed)) sources.push({id:source.id,url:source.feed,accept:'application/rss+xml, application/xml, text/xml',type:/^(?:text\/xml|application\/(?:rss\+xml|xml))\b/i,parse:xml=>parseNews(xml,source)});
export const sourceIds=sources.map(s=>s.id);

export async function refresh(fetcher = fetch, ids) {
  const active=ids? sources.filter(source=>ids.includes(source.id)):sources;
  const fetchSource=async source => {
    try {
      const items = source.parse(await download(fetcher, source)).map(item=>({...item,sourceId:source.id}));
      return { items, status: { id: source.id, ok: true, count: items.length } };
    } catch (error) {
      const message = error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'Tiempo de espera agotado' : 'No se pudo leer o validar la fuente';
      return { items: [], status: { id: source.id, ok: false, count: 0, error: message } };
    }
  };
  const result=[];
  for(let i=0;i<active.length;i+=4) {
    result.push(...await Promise.all(active.slice(i,i+4).map(fetchSource)));
  }
  return { items: unique(result.flatMap(source => source.items)).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)), status: result.map(source => source.status) };
}
