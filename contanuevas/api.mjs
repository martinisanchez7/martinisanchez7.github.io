import { archivo, catalogo, categorias, editoriales } from './datos.mjs';

export const security = {'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'",'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Cache-Control':'no-store'};
const norm = x => x.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const date = x => typeof x==='string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && new Date(x).toJSON()?.slice(0,10) === x;

export const DAY=24*60*60*1000;
export const RETRY=60*60*1000;
const order=(a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id);
export function updateStatus(health,lastCompleted) {
  if(health.mode!=='conectado') return 'archivo';
  if(health.cache==='no-disponible') return 'degradada';
  if(!health.lastAttempt||!health.sources.length) return 'pendiente';
  if(!health.sources.every(source=>source.ok)) return 'degradada';
  return Date.now()-lastCompleted>DAY+RETRY?'atrasada':'al-dia';
}
export function mergeItems(previous, incoming) {
  const current = new Map();
  for(const item of [...previous,...incoming]) {
      if(!item || typeof item.id!=='string' || !/^[a-z0-9-]+$/.test(item.id) || [...archivo,...editoriales].some(x=>x.id===item.id) || item.mode!=='automatico' || !categorias.includes(item.category) || !date(item.date) || !['title','summary','source','url'].every(key=>typeof item[key]==='string')) continue;
      const u = URL.parse(item.url);
      if(!u || u.protocol!=='https:' || u.username || u.password || u.port || !['www.boletinoficial.gob.ar','www.boletinoficial.gov.ar','www.federalreserve.gov'].includes(u.hostname)) continue;
    current.set(item.id,item);
  }
  return [...current.values()].sort(order).slice(0,1200);
}

export function serveApi({pathname,searchParams:p},send,health,items,lastCompleted) {
  if(!pathname.startsWith('/api/')) return undefined;
  const all=[...editoriales,...archivo,...items].sort(order);
  const actualizacion=updateStatus(health,lastCompleted);
  if(pathname==='/api/v1/salud') return send(200,{...health,entries:all.length,actualizacion});
  if(pathname==='/api/v1/actualizacion') {
    const estado=actualizacion;
    return send(estado==='al-dia'?200:503,{estado,ultimoIntento:health.lastAttempt,fuentes:health.sources});
  }
  if(pathname==='/api/v1/fuentes') return send(200,{items:catalogo.map(([name,url,role])=>({name,url,role}))});
  const detail=pathname.match(/^\/api\/v1\/novedades\/([a-z0-9-]+)$/);
  if(detail) {
    const id=detail[1];
    const item=all.find(x=>x.id===id);
    return item?send(200,item):send(404,{error:'No se encontró la ficha'});
  }
  if(pathname==='/api/v1/novedades') {
    const category=p.get('categoria'),q=(p.get('q')??'').trim(),mode=p.get('modo'),desde=p.get('desde'),hasta=p.get('hasta');
    const limit=p.get('limite')??'20',offset=p.get('desde_fila')??'0';
    if([...p.keys()].some(k=>!['categoria','q','modo','desde','hasta','limite','desde_fila'].includes(k)||p.getAll(k).length>1) || (category!==null&&!categorias.includes(category)) || (mode!==null&&!['archivo','automatico','editorial'].includes(mode)) || q.length>100 || (desde!==null&&!date(desde)) || (hasta!==null&&!date(hasta)) || (desde&&hasta&&desde>hasta) || !/^\d{1,3}$/.test(limit)||+limit<1||+limit>100||!/^\d{1,4}$/.test(offset)) return send(400,{error:'Filtros inválidos'});
    const matches=all.filter(x=>(!category||x.category===category)&&(!mode||x.mode===mode)&&(!desde||x.date>=desde)&&(!hasta||x.date<=hasta)&&(!q||norm(`${x.title} ${x.summary} ${x.source}`).includes(norm(q))));
    return send(200,{total:matches.length,limite:+limit,desde_fila:+offset,items:matches.slice(+offset,+offset+ +limit)});
  }
  return send(404,{error:'Ruta no encontrada'});
}
