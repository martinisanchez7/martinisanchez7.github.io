import { createHash } from 'node:crypto';
import { fuentes } from './catalogo-fuentes.mjs';
import { provincias } from './criterios.js';

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 8_000;
const BORA = 'https://www.boletinoficial.gob.ar';
const FED = 'https://www.federalreserve.gov';
const CABA = 'https://api-restboletinoficial.buenosaires.gob.ar';
const normalizar=value=>value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const provinciaPorNombre=new Map(Object.entries(provincias).map(([code,label])=>[normalizar(label.replace(' (provincia)','')),code]));
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
  const text = normalizar(`${title} ${summary}`);
  if (/\b(?:normas? (?:profesionales )?contables?|normas? (?:internacionales? )?de informacion financiera|estados contables|estados financieros|auditoria contable|cencya|resolucion tecnica(?: n[o°.]?)? \d+|rt ?\d+)\b/.test(text)) return 'contable';
  if (/\b(?:agencia de recaudacion y control aduanero|administracion federal de ingresos publicos|monotributo|impuesto a las ganancias|impuesto al valor agregado|bienes personales|ingresos brutos|obligaciones tributarias|regimen de retencion|procedimiento tributario|sirtac|sircupa|sircip|sircreb|precios de transferencia)\b/.test(text)) return 'impositivo';
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

export function parseBoletinCaba(text) {
  const edition=JSON.parse(text);
  if(edition?.boletin===null && !edition.normas) return [];
  const {anio,mes,dia}=edition?.boletin??{};
  const date=validDay(`${anio}-${mes}-${dia}`);
  const branches=edition?.normas?.normas;
  if(!date || !branches || Array.isArray(branches) || typeof branches!=='object') throw Error('Edición de CABA inválida');
  const items=[];
  for(const power of Object.values(branches)) {
    for(const kind of Object.values(power??{})) {
      for(const [agency,records] of Object.entries(kind??{})) {
        if(!Array.isArray(records)) continue;
        for(const record of records) {
          const title=plain(String(record?.nombre??''),130);
          const summary=plain(String(record?.sumario??''),350);
          const category=classify('',summary) || (/ingresos publicos/.test(normalizar(agency))?'impositivo':'');
          const id=record?.id_norma;
          const url=URL.parse(record?.url_norma);
          if(!title || !summary || !category || !Number.isSafeInteger(id) || !url
            || url.hostname!==new URL(CABA).hostname || url.username || url.password || url.port
            || !/^\/download\/\d+$/.test(url.pathname)) continue;
          items.push({id:'bocaba-'+id,title:title+' · '+plain(agency,120),summary,date,category,
            url:CABA+url.pathname,source:'Boletín Oficial de CABA',mode:'automatico',jurisdictions:['caba']});
        }
      }
    }
  }
  return unique(items).slice(0,60);
}

function xmlField(item, key) {
  return item.match(new RegExp(`<${key}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${key}\\s*>`, 'i'))?.[1] ?? '';
}

export function parseBoletinJujuy(xml,source) {
  checkRss(xml);
  const items=[];
  let examined=0,recognized=0;
  for(const [,entry] of blocks(xml,/<(\/?)item\b([^<>]{0,512})>/gi,65_536)) {
    if(++examined>80) break;
    const dateText=plain(xmlField(entry,'title')).match(/(\d{2})\/(\d{2})\/(\d{4})$/);
    const date=dateText?validDay(`${dateText[3]}-${dateText[2]}-${dateText[1]}`):'';
    const detail=plain(xmlField(entry,'description'),550);
    const rule=normalizar(detail).match(/^resolucion general n[º°o.]?\s*(\d+)-dpr\/(\d{4})\b/);
    const url=URL.parse(plain(xmlField(entry,'link'),500));
    if(!date || !url || url.origin!==new URL(source.url).origin || url.username || url.password
      || url.pathname!=='/' || !/^\?p=\d+$/.test(url.search) || url.hash) continue;
    recognized++;
    if(!rule) continue;
    items.push({id:'bojujuy-'+url.searchParams.get('p'),title:`Jujuy · RG DPR ${rule[1]}/${rule[2]}`,
      summary:'Resolución general de Rentas publicada en el Boletín Oficial de Jujuy. El enlace lleva al texto original.',
      date,category:'impositivo',url:url.href,source:source.name,mode:'automatico',jurisdictions:['jujuy']});
  }
  if(/<item\b/i.test(xml) && !recognized) throw Error('Ediciones de Jujuy no reconocidas');
  return unique(items);
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
  { id: 'boletin-caba', url: `${CABA}/obtenerBoletin/0/true`, accept: 'application/json', type: /^application\/json\b/i, parse: parseBoletinCaba },
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
    const key=normalizar(title);
    const tags=[...entry.matchAll(/<category\b[^>]*>([\s\S]*?)<\/category>/gi)].map(m=>normalizar(plain(m[1],100)));
    const prefix=key.match(/^([a-z ]{3,30}?)\s*(?:[.:]|\s+(?:rg?|resolucion|dec|decreto|ley|dgr|ater|api|arba|atp|aref|atm|agip)\b)/)?.[1];
    const provincia=provinciaPorNombre.get(prefix)??(source.id==='contadores-en-red'?tags.map(tag=>provinciaPorNombre.get(tag)).find(Boolean):undefined);
    const local=provincia??(prefix==='caba'||prefix==='ciudad de buenos aires'?'caba':undefined);
    const profiles=/\b(auditoria|aseguramiento|cencya|rt (37|53))\b/.test(key)?['auditoria']:undefined;
    let category=classify(title,'');
    if(!category && source.id==='contadores-en-red') category='impositivo';
    if(!category && (profiles || source.id==='cpce-cordoba')) category='contable';
    if(!category && source.id==='facpce-novedades' && /\b(sisa|arca|aranceles?|monotributo)\b/.test(key)) category='impositivo';
    if(!category && source.id==='facpce-novedades') continue;
    if(!category&&/impuestos|fiscal/.test(source.id)) category='impositivo';
    if(!category&&source.id==='iprofesional-legales') continue;
    if(!category) category=/\b(fed|estados unidos|wall street|china|bce|europa|paraguay)\b/i.test(title)?'internacional':'economia';
    link.search='';link.hash='';
    const id=createHash('sha256').update(link.href).digest('hex').slice(0,16);
    const date=argDay.format(published);
    const summary=source.tier==='tecnico'?'Alerta técnica. Abrí la publicación para consultar el documento y su alcance.':'Alerta periodística pendiente de cotejo con el documento original. Todavía no hay un resumen normativo verificado.';
    items.push({id:`prensa-${id}`,title,summary,date,category,url:link.href,source:source.name,sourceId:source.id,mode:'automatico',
      ...(local?{jurisdictions:[local]}:{}),...(profiles?{profiles}:{})});
  }
  if(/<item\b/i.test(xml)&&!recognized) throw new Error('Entradas RSS no reconocidas');
  return unique(items);
}

for(const source of fuentes.filter(s=>s.feed)) {
  const parser=source.id==='boletin-jujuy'?parseBoletinJujuy:parseNews;
  sources.push({id:source.id,url:source.feed,accept:'application/rss+xml, application/xml, text/xml',
    type:/^(?:text\/xml|application\/(?:rss\+xml|xml))\b/i,parse:xml=>parser(xml,source)});
}
export const sourceIds=sources.map(s=>s.id);

export async function refresh(fetcher = fetch, ids, { now=Date.now(), lookback=0, provincialPages=1 }={}) {
  const active=ids? sources.filter(source=>ids.includes(source.id)):sources;
  const fetchSource=async source => {
    try {
      const items = source.parse(await download(fetcher, source));
      let historicoIncompleto=0;
      const history=[];
      if(lookback && ['boletin-oficial','boletin-caba'].includes(source.id)) {
        for(let days=1;days<=Math.min(lookback,7);days++) {
          const day=argDay.format(now-days*86_400_000);
          if([0,6].includes(new Date(day).getUTCDay())) continue;
          const dateUrl=source.id==='boletin-oficial'?`${source.url}/${day.replaceAll('-','')}`:
            `${CABA}/obtenerBoletin/${day.split('-').reverse().join('-')}/true`;
          history.push({url:dateUrl,day});
        }
      }
      if(source.id==='contadores-en-red') {
        for(let page=2;page<=Math.min(provincialPages,8);page++) history.push({url:source.url+'?paged='+page});
      }
      for(const {url,day} of history) {
        try {
          const extra=source.parse(await download(fetcher,{...source,url}));
          items.push(...extra.filter(item=>!day || item.date===day));
        } catch { historicoIncompleto++; }
      }
      const found=unique(items).map(item=>({...item,sourceId:source.id}));
      return {items:found,status:{id:source.id,ok:true,count:found.length,
        latest:found.reduce((day,item)=>item.date>day?item.date:day,''),historicoIncompleto}};
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
