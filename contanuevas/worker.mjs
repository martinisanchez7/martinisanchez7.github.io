import { mergeItems, rutaDeApi, security, serveApi, updateStatus } from './api.mjs';
import { refresh, sourceIds } from './fuentes.mjs';
import { compileSummaries } from './sintesis.mjs';
export { AvisosDiarios } from './avisos.mjs';

const snapshotKey = 'boletin-v1';
const coverageVersion = 5;
const readCache = new WeakMap();
const publicFiles = new Set(['/','/index.html','/estilo.css','/app.js','/simulador.js','/marca.svg','/icono.svg','/serif.woff2','/sans.woff2','/openapi.json',
  '/instalar.js','/manifest.webmanifest','/service-worker.js','/app-192.png','/app-512.png']);
const localTtl = 15_000;
const empty = () => ({
  health: { product:'contanuevas', mode:'conectado', lastAttempt:null, sources:[], cache:'sin-copia' },
  items: [],
  summaries: [],
  lastCompleted: 0
});

function validSnapshot(snapshot) {
  const validEntry = item=>item && ['id','title','summary','source','url','date'].every(key=>typeof item[key]==='string');
  return snapshot && snapshot.health && Array.isArray(snapshot.health.sources)
    && snapshot.health.sources.every(source=>source && typeof source.id==='string' && typeof source.ok==='boolean')
    && (snapshot.health.lastAttempt===null || typeof snapshot.health.lastAttempt==='string')
    && Array.isArray(snapshot.items) && snapshot.items.length<=1200 && snapshot.items.every(validEntry)
    && (snapshot.summaries===undefined || Array.isArray(snapshot.summaries) && snapshot.summaries.length<=100 && snapshot.summaries.every(validEntry))
    && Number.isFinite(snapshot.lastCompleted);
}

async function readSnapshot(kv, useCache) {
  const cached=readCache.get(kv);
  if(useCache && cached && cached.expiresAt>Date.now()) return cached.snapshot;
  const stored=await kv.get(snapshotKey,'json');
  if(stored===null) return empty();
  if(!validSnapshot(stored)) {
    const fallback=empty();
    fallback.health.cache='no-disponible';
    fallback.health.sources=[{id:'almacenamiento',ok:false,count:0}];
    return fallback;
  }
  if(useCache) readCache.set(kv,{snapshot:stored,expiresAt:Date.now()+localTtl});
  return stored;
}

export async function actualizar(kv, now = Date.now(), update = ids=>refresh(fetch,ids), compile = compileSummaries) {
  const previous = await readSnapshot(kv,false);
  const lastAttempt = new Date(now).toISOString();
  const sameDay = previous.health.lastAttempt?.slice(0,10) === lastAttempt.slice(0,10)
    && previous.health.coverageVersion === coverageVersion;
  const alreadyUpdated = sameDay
    && previous.health.synthesis?.errors === 0
    && previous.health.sources.length && previous.health.sources.every(source => source.ok);
  if(alreadyUpdated) return;
  const completeInventory = sourceIds.every(id=>previous.health.sources.some(source=>source.id===id));
  const retryIds = sameDay && completeInventory
    ? previous.health.sources.filter(source=>!source.ok).map(source=>source.id)
    : undefined;
  let next;
  try { next = await update(retryIds); }
  catch { next = {items:[],status:[{id:'ingesta',ok:false,count:0}]}; }
  const items = mergeItems(previous.items,next.items);
  const sourcesById = new Map((retryIds?previous.health.sources:[]).map(source=>[source.id,source]));
  for(const {id,ok,count} of next.status) sourcesById.set(id,{id,ok,count});
  const sources = [...sourcesById.values()];
  let summaries=previous.summaries??[];
  let synthesis={attempted:0,errors:1,count:summaries.length};
  try {
    const result = await compile(items,summaries,now);
    summaries = result.summaries;
    synthesis = result.status;
  } catch {
    // Keep the previous published summaries if the compilation step stops.
  }
  const health = {...previous.health,lastAttempt,sources,cache:'guardada',coverageVersion,synthesis};
  await kv.put(snapshotKey,JSON.stringify({health,items,summaries,lastCompleted:now}));
  readCache.delete(kv);
  console.log('Contanuevas:',updateStatus(health,now),sources.map(s=>[s.id,s.ok,s.count]));
}

export default {
  async fetch(request,env) {
    const url = new URL(request.url);
    const route = rutaDeApi(url.pathname);
    let cachePublicData = false;
    const send = (status,body,type='application/json; charset=utf-8',extra={}) =>
      new Response(request.method==='HEAD'?null:JSON.stringify(body),{
        status,headers:{...security,'Strict-Transport-Security':'max-age=15552000','Content-Type':type,
          ...(cachePublicData&&status===200?{'Cache-Control':'public, max-age=15, must-revalidate'}:{}),...extra}
      });
    if(url.pathname.length+url.search.length>2048) return send(400,{error:'Ruta inválida'});
    if(url.pathname==='/api/v1/avisos' || url.pathname==='/api/v1/avisos/config') {
      const config=url.pathname.endsWith('/config');
      const methods=config?['GET']:['POST','DELETE'];
      if(!methods.includes(request.method)) return send(405,{error:'Método no permitido'},undefined,{Allow:methods.join(', ')});
      if(url.search) return send(400,{error:'Ruta inválida'});
      if(!config && (request.headers.get('origin')!==url.origin || request.headers.get('sec-fetch-site')==='cross-site')) {
        return send(403,{error:'Abrí la configuración desde Contanuevas'});
      }
      if(!env.AVISOS) return send(503,{error:'Avisos temporalmente no disponibles'});
      if(!config && env.LIMITE_AVISOS) {
        const ip=request.headers.get('CF-Connecting-IP')??'sin-ip';
        if(!(await env.LIMITE_AVISOS.limit({key:ip})).success) return send(429,{error:'Esperá un minuto y volvé a intentar'});
      }
      try {
        const stub=env.AVISOS.get(env.AVISOS.idFromName('avisos-contanuevas-v1'));
        const response=await stub.fetch(request);
        return send(response.status,await response.json());
      } catch { return send(503,{error:'Avisos temporalmente no disponibles'}); }
    }
    if(!['GET','HEAD'].includes(request.method)) return send(405,{error:'Método no permitido'},undefined,{Allow:'GET, HEAD'});
    if(!url.pathname.startsWith('/api/')) {
      if(!publicFiles.has(url.pathname)) {
        return send(404,{error:'Ruta no encontrada'});
      }
      const asset = await env.ASSETS.fetch(request);
      const headers = new Headers(asset.headers);
      for(const [name,value] of Object.entries(security)) {
        if(name!=='Cache-Control' || asset.status>=400) headers.set(name,value);
      }
      headers.set('Strict-Transport-Security','max-age=15552000');
      if(url.pathname==='/service-worker.js') headers.set('Cache-Control','no-cache');
      return new Response(request.method==='HEAD'?null:asset.body,{status:asset.status,headers});
    }
    if(!route) return send(404,{error:'Ruta no encontrada'});
    const anonymous = !request.headers.has('authorization') && !request.headers.has('cookie');
    if(route==='fuentes') {
      cachePublicData = anonymous;
      return serveApi(url,send,empty().health,[],0);
    }
    let snapshot;
    try {
      snapshot = await readSnapshot(env.BOLETIN,route==='boletin');
      cachePublicData = anonymous && route==='boletin' && snapshot.health.cache==='guardada';
    }
    catch {
      snapshot = empty();
      snapshot.health.cache = 'no-disponible';
      snapshot.health.sources = [{id:'almacenamiento',ok:false,count:0}];
    }
    const {health,items,lastCompleted,summaries} = snapshot;
    return serveApi(url,send,health,items,lastCompleted,summaries);
  },
  async scheduled(event,env) {
    await actualizar(env.BOLETIN,event.scheduledTime);
  }
};
