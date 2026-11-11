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
      if(!item || typeof item.id!=='string' || !/^[a-z0-9-]+$/.test(item.id) || [...archivo,...editoriales].some(x=>x.id===item.id) || item.mode!=='automatico' || !categorias.includes(item.category) || !date(item.date) || !['title','summary','source','url'].every(key=>typeof item[key]==='string')) continue;
      const u = URL.parse(item.url);
      if(!u || u.protocol!=='https:' || u.username || u.password || u.port || !fuentes.some(s=>new URL(s.url).hostname.replace(/^www\./,'')===u.hostname.replace(/^www\./,''))) continue;
    current.set(item.id,item);
  }
  return [...current.values()].sort(order).slice(0,1200);
}

export function serveApi({pathname,searchParams:p},send,health,items,lastCompleted,summaries=[]) {
  if(!pathname.startsWith('/api/')) return undefined;
  const automatic = summaries.filter(item=>!resumenPorAlerta.has(item.url));
  const actualizacion=updateStatus(health,lastCompleted);
  if(pathname==='/api/v1/salud') return send(200,{...health,entries:editoriales.length+archivo.length+items.length+automatic.length,actualizacion});
  if(pathname==='/api/v1/actualizacion') {
    const estado=actualizacion;
    return send(estado==='al-dia'?200:503,{estado,ultimoIntento:health.lastAttempt,fuentes:health.sources});
  }
  if(pathname==='/api/v1/fuentes') return send(200,{items:fuentes});
  const automaticByUrl = new Map(automatic.map(item=>[item.url,item.id]));
  const all=[...editoriales,...archivo,...items,...automatic].map(item => {
    const ficha=valorar(item);
    const reviewedId=item.mode==='automatico' && resumenPorAlerta.get(item.url);
    const summaryId=item.mode==='automatico' && automaticByUrl.get(item.url);
    return {...ficha,...(reviewedId?{reviewedId}:{}),...(summaryId?{summaryId}:{})};
  }).sort(order);
  const detail=pathname.match(/^\/api\/v1\/novedades\/([a-z0-9-]+)$/);
  if(detail) {
    const id=detail[1];
    const item=all.find(x=>x.id===id);
    return item?send(200,item):send(404,{error:'No se encontró la ficha'});
  }
  if(pathname==='/api/v1/novedades') {
    const category=p.get('categoria'),q=(p.get('q')??'').trim(),mode=p.get('modo'),desde=p.get('desde'),hasta=p.get('hasta');
    const respaldo=p.get('respaldo'),importancia=p.get('importancia'),fuente=p.get('fuente');
    const limit=p.get('limite')??'20',offset=p.get('desde_fila')??'0';
    if([...p.keys()].some(k=>!['categoria','q','modo','desde','hasta','limite','desde_fila','respaldo','importancia','fuente'].includes(k)||p.getAll(k).length>1) || (respaldo!==null&&!['oficial','tecnico','periodistico','sin-clasificar'].includes(respaldo)) || (importancia!==null&&!['alta','seguimiento'].includes(importancia)) || (fuente!==null&&!fuentes.some(s=>s.id===fuente)) || (category!==null&&!categorias.includes(category)) || (mode!==null&&!['archivo','automatico','editorial','sintesis','resumen'].includes(mode)) || q.length>100 || (desde!==null&&!date(desde)) || (hasta!==null&&!date(hasta)) || (desde&&hasta&&desde>hasta) || !/^\d{1,3}$/.test(limit)||+limit<1||+limit>100||!/^\d{1,4}$/.test(offset)) return send(400,{error:'Filtros inválidos'});
    const modeMatches=x=>!mode || x.mode===mode || (mode==='resumen'&&['editorial','sintesis'].includes(x.mode));
    const matches=all.filter(x=>(!respaldo||x.sourceTier===respaldo)&&(!importancia||x.importance===importancia)&&(!fuente||x.sourceId===fuente)&&(!category||x.category===category)&&modeMatches(x)&&(!desde||x.date>=desde)&&(!hasta||x.date<=hasta)&&(!q||norm(`${x.id} ${x.title} ${x.summary} ${x.source}`).includes(norm(q))));
    return send(200,{total:matches.length,limite:+limit,desde_fila:+offset,items:matches.slice(+offset,+offset+ +limit)});
  }
  return send(404,{error:'Ruta no encontrada'});
}
