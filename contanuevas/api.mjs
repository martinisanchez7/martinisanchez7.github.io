import { archivo, categorias, editoriales } from './datos.mjs';
import { fuentes, valorar } from './catalogo-fuentes.mjs';

export const security = {
  'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'",
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
    const card=valorar(item);
    if(item.mode==='automatico') {
      const reviewedId=resumenPorAlerta.get(item.url);
      const summaryId=automaticByUrl.get(item.url);
      if(reviewedId) card.reviewedId=reviewedId;
      if(summaryId) card.summaryId=summaryId;
    }
    const searchable=norm(`${card.id} ${card.title} ${card.summary} ${card.source}`);
    return {card,searchable};
  });
  const index={summaries,ordered,byId:new Map(ordered.map(({card})=>[card.id,card]))};
  indices.set(items,index);
  return index;
}
export function updateStatus(health,lastCompleted) {
  if(health.mode!=='conectado') return 'archivo';
  if(health.cache==='no-disponible') return 'degradada';
  if(!health.lastAttempt||!health.sources.length) return 'pendiente';
  if(!health.sources.every(source=>source.ok) || health.synthesis?.errors>0) return 'degradada';
  return Date.now()-lastCompleted>DAY+RETRY?'atrasada':'al-dia';
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
    return send(200,{...health,entries:editoriales.length+archivo.length+items.length+automatic.length,actualizacion:updateStatus(health,lastCompleted)});
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
    const limit=p.get('limite')??'20',offset=p.get('desde_fila')??'0';
    const keys=['categoria','q','modo','desde','hasta','limite','desde_fila','respaldo','importancia','fuente'];
    const hasInvalidKey=[...p].length>keys.length || [...p.keys()].some(key=>!keys.includes(key)||p.getAll(key).length>1);
    if(hasInvalidKey || (respaldo!==null&&!['oficial','tecnico','periodistico','sin-clasificar'].includes(respaldo))
      || (importancia!==null&&!['alta','seguimiento'].includes(importancia)) || (fuente!==null&&!fuentesValidas.has(fuente))
      || (category!==null&&!categorias.includes(category)) || (mode!==null&&!['archivo','automatico','editorial','sintesis','resumen'].includes(mode))
      || q.length>100 || (desde!==null&&!date(desde)) || (hasta!==null&&!date(hasta)) || (desde&&hasta&&desde>hasta)
      || !/^\d{1,3}$/.test(limit) || +limit<1 || +limit>100 || !/^\d{1,4}$/.test(offset)) {
      return send(400,{error:'Filtros inválidos'});
    }
    const query=norm(q);
    const page=[];
    let total=0;
    for(const {card,searchable} of catalogIndex(items,summaries).ordered) {
      if(respaldo && card.sourceTier!==respaldo || importancia && card.importance!==importancia || fuente && card.sourceId!==fuente) continue;
      if(category && card.category!==category || desde && card.date<desde || hasta && card.date>hasta) continue;
      if(mode && card.mode!==mode && !(mode==='resumen' && ['editorial','sintesis'].includes(card.mode))) continue;
      if(query && !searchable.includes(query)) continue;
      if(total>=+offset && page.length<+limit) page.push(card);
      total++;
    }
    return send(200,{total,limite:+limit,desde_fila:+offset,items:page});
  }
  return send(404,{error:'Ruta no encontrada'});
}
