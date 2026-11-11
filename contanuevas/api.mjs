import { archivo, categorias, editoriales } from './datos.mjs';
import { fuentes, valorar } from './catalogo-fuentes.mjs';
import { ambitos, jurisdicciones, perfiles, coincideJurisdiccion } from './criterios.js';

export const security = {
  'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'",
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer',
  'X-Frame-Options':'DENY',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Resource-Policy':'same-origin',
  'Cache-Control':'no-store'
};
const norm = x => x.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const date = x => typeof x==='string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && new Date(x).toJSON()?.slice(0,10) === x;

export const DAY=24*60*60*1000;
export const RETRY=60*60*1000;
const order=(a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id);
const resumenPorAlerta = new Map(
  editoriales.flatMap(item => (item.alertUrls ?? []).map(url => [url, item.id]))
);
const idsLocales=new Set([...archivo,...editoriales].map(item=>item.id));
const hostsPermitidos=new Set(fuentes.map(source=>new URL(source.url).hostname.replace(/^www\./,'')));
const fuentesValidas=new Set(fuentes.map(source=>source.id));
const detalle=/^\/api\/v1\/novedades\/([a-z0-9-]+)$/;
const sinSintesis=[];
const indices=new WeakMap();
const perfilesPorSeccion={
  impositivo:['impuestos'], laboral:['payroll'], contable:['contabilidad'],
  economia:['finanzas'], internacional:['finanzas']
};
const alcancePorFuente={
  'reserva-federal':'internacional', 'boletin-caba':'caba', agip:'caba', arba:'buenos-aires', comarb:'interjurisdiccional', bcra:'nacional'
};
const alcancePorFicha={
  'casas-particulares-noviembre-2026':'nacional','arca-5918-ganancias-2025':'nacional',
  'srt-58-mopre-noviembre-2026':'nacional','arba-23-planes-2026':'buenos-aires'
};
const prioridad={alta:0,seguimiento:1};
export const boletinSnapshotKey='boletin-v1';

function clasificar(card) {
  const territorial=card.jurisdictions?.filter(code=>Object.hasOwn(jurisdicciones,code));
  const title=norm(card.title);
  const organismoNacional=card.sourceId==='boletin-oficial'
    && /^(agencia de recaudacion y control aduanero|administracion nacional de la seguridad social|superintendencia de riesgos del trabajo|comision nacional de trabajo en casas particulares) ·/.test(title);
  const inferred=alcancePorFicha[card.id]??alcancePorFuente[card.sourceId]
    ?? (organismoNacional || card.mode==='sintesis' || /^https:\/\/www\.argentina\.gob\.ar\/normativa\/nacional\//.test(card.url) ? 'nacional' : 'sin-clasificar');
  card.jurisdictions=territorial?.length?territorial:[inferred];
  const subjects=new Set([...(perfilesPorSeccion[card.category]??[]),...(card.profiles??[])]);
  if(/\bprecios de transferencia\b/.test(title)) subjects.add('precios-transferencia');
  if(/\b(auditoria|aseguramiento|rt (37|53)|rt n[°º]? (37|53))\b/.test(title)) subjects.add('auditoria');
  card.profiles=[...subjects];
  return card;
}

const coincidePerfil=(card,profile)=>!profile || profile==='otros' || card.profiles.includes(profile);

export function rutaDeApi(path) {
  if(path==='/api/v1/fuentes') return 'fuentes';
  if(path==='/api/v1/salud' || path==='/api/v1/actualizacion') return 'estado';
  if(path==='/api/v1/novedades' || detalle.test(path)) return 'boletin';
}

function catalogIndex(items,summaries) {
  const saved=indices.get(items);
  if(saved?.summaries===summaries) return saved;
  const automatic=summaries.filter(item=>!resumenPorAlerta.has(item.url));
  const automaticByUrl=new Map(automatic.map(item=>[item.url,item.id]));
  const ordered=[...editoriales,...archivo,...items,...automatic].sort(order).map(item=>{
    const card=clasificar(valorar(item));
    if(item.mode==='automatico') {
      const reviewedId=resumenPorAlerta.get(item.url);
      const summaryId=automaticByUrl.get(item.url);
      if(reviewedId) card.reviewedId=reviewedId;
      if(summaryId) card.summaryId=summaryId;
    }
    const searchable=norm(`${card.id} ${card.title} ${card.summary} ${card.source}`);
    return {card,searchable};
  });
  const relevant=[...ordered].sort((a,b)=>prioridad[a.card.importance]-prioridad[b.card.importance]);
  const index={summaries,ordered,relevant,byId:new Map(ordered.map(({card})=>[card.id,card]))};
  indices.set(items,index);
  return index;
}
export function seleccionarAviso(items,summaries,{category,jurisdiction,profile,last_item},from,through) {
  const matches=({card})=>card.id!==last_item && card.date>=from && card.date<=through
    && (!category || card.category===category) && coincideJurisdiccion(card,jurisdiction)
    && coincidePerfil(card,profile);
  const {ordered}=catalogIndex(items,summaries);
  const summary=ordered.find(row=>(row.card.mode==='editorial' || row.card.mode==='sintesis') && matches(row));
  if(summary) return summary.card;
  return ordered.find(row=>row.card.sourceId==='boletin-caba' && row.card.mode==='automatico'
    && !row.card.reviewedId && matches(row))?.card;
}
export function updateStatus(health,lastCompleted) {
  if(health.mode!=='conectado') return 'archivo';
  if(health.cache==='no-disponible') return 'degradada';
  if(!health.lastAttempt||!health.sources.length) return 'pendiente';
  if(!health.sources.every(source=>source.ok) || health.synthesis?.errors>0) return 'degradada';
  return Date.now()-lastCompleted>DAY+RETRY?'atrasada':'al-dia';
}

function cobertura(items,summaries,now=Date.now()) {
  const since=new Date(now-29*DAY).toISOString().slice(0,10);
  const through=new Date(now).toISOString().slice(0,10);
  const rows=new Map(Object.keys(jurisdicciones).map(code=>[code,{jurisdiccion:code,fichas:0,resumenes:0,ultima:null}]));
  for(const {card} of catalogIndex(items,summaries).ordered) {
    if(card.mode==='archivo' || card.date>through || card.date<since || card.reviewedId || card.summaryId) continue;
    for(const code of card.jurisdictions) {
      const row=rows.get(code);
      row.fichas++;
      if(card.mode==='editorial' || card.mode==='sintesis') row.resumenes++;
      row.ultima??=card.date;
    }
  }
  return {desde:since,hasta:through,items:[...rows.values()]};
}
export function mergeItems(previous, incoming) {
  const current = new Map();
  for(const item of [...previous,...incoming]) {
      if(!item || typeof item.id!=='string' || !/^[a-z0-9-]+$/.test(item.id) || idsLocales.has(item.id) || item.mode!=='automatico' || !categorias.includes(item.category) || !date(item.date) || !['title','summary','source','url'].every(key=>typeof item[key]==='string')) continue;
      const u = URL.parse(item.url);
      if(!u || u.protocol!=='https:' || u.username || u.password || u.port || !hostsPermitidos.has(u.hostname.replace(/^www\./,''))) continue;
    current.set(item.id,item);
  }
  return [...current.values()].sort(order).slice(0,1200);
}

export function serveApi({pathname,searchParams:p},send,health,items,lastCompleted,summaries=sinSintesis) {
  if(!pathname.startsWith('/api/')) return undefined;
  if(pathname==='/api/v1/salud') {
    const automatic=summaries.filter(item=>!resumenPorAlerta.has(item.url));
    return send(200,{...health,entries:editoriales.length+archivo.length+items.length+automatic.length,
      actualizacion:updateStatus(health,lastCompleted),cobertura:cobertura(items,summaries)});
  }
  if(pathname==='/api/v1/actualizacion') {
    const estado=updateStatus(health,lastCompleted);
    return send(estado==='al-dia'?200:503,{estado,ultimoIntento:health.lastAttempt,fuentes:health.sources});
  }
  if(pathname==='/api/v1/fuentes') return send(200,{items:fuentes});
  const detail=pathname.match(detalle);
  if(detail) {
    const item=catalogIndex(items,summaries).byId.get(detail[1]);
    return item?send(200,item):send(404,{error:'No se encontró la ficha'});
  }
  if(pathname==='/api/v1/novedades') {
    const category=p.get('categoria'),q=(p.get('q')??'').trim(),mode=p.get('modo'),desde=p.get('desde'),hasta=p.get('hasta');
    const respaldo=p.get('respaldo'),importancia=p.get('importancia'),fuente=p.get('fuente');
    const jurisdiction=p.get('jurisdiccion'),sort=p.get('orden')??'recientes',profile=p.get('perfil');
    const limit=p.get('limite')??'20',offset=p.get('desde_fila')??'0';
    const keys=['categoria','q','modo','desde','hasta','limite','desde_fila','respaldo','importancia','fuente','jurisdiccion','orden','perfil'];
    const hasInvalidKey=[...p].length>keys.length || [...p.keys()].some(key=>!keys.includes(key)||p.getAll(key).length>1);
    if(hasInvalidKey || (respaldo!==null&&!['oficial','tecnico','periodistico','sin-clasificar'].includes(respaldo))
      || (importancia!==null&&!['alta','seguimiento'].includes(importancia)) || (fuente!==null&&!fuentesValidas.has(fuente))
      || (category!==null&&!categorias.includes(category)) || (mode!==null&&!['archivo','automatico','editorial','sintesis','resumen'].includes(mode))
      || (jurisdiction!==null&&!Object.hasOwn(ambitos,jurisdiction)) || (profile!==null&&!Object.hasOwn(perfiles,profile))
      || !['recientes','relevantes','perfil'].includes(sort) || (sort==='perfil'&&!profile)
      || q.length>100 || (desde!==null&&!date(desde)) || (hasta!==null&&!date(hasta)) || (desde&&hasta&&desde>hasta)
      || !/^\d{1,3}$/.test(limit) || +limit<1 || +limit>100 || !/^\d{1,4}$/.test(offset)) {
      return send(400,{error:'Filtros inválidos'});
    }
    const query=norm(q);
    const page=[];
    let total=0;
    const index=catalogIndex(items,summaries);
    for(const {card,searchable} of sort==='relevantes'?index.relevant:index.ordered) {
      if(respaldo && card.sourceTier!==respaldo || importancia && card.importance!==importancia || fuente && card.sourceId!==fuente) continue;
      if(category && card.category!==category || desde && card.date<desde || hasta && card.date>hasta) continue;
      if(!coincideJurisdiccion(card,jurisdiction) || !coincidePerfil(card,profile)) continue;
      if(mode && card.mode!==mode && !(mode==='resumen' && ['editorial','sintesis'].includes(card.mode))) continue;
      if(query && !searchable.includes(query)) continue;
      if(total>=+offset && page.length<+limit) page.push(card);
      total++;
    }
    return send(200,{total,limite:+limit,desde_fila:+offset,items:page});
  }
  return send(404,{error:'Ruta no encontrada'});
}
