import { mergeItems, security, serveApi, updateStatus } from './api.mjs';
import { refresh } from './fuentes.mjs';
import { compileSummaries } from './sintesis.mjs';

const snapshotKey = 'boletin-v1';
const empty = () => ({
  health: { product:'contanuevas', mode:'conectado', lastAttempt:null, sources:[], cache:'sin-copia' },
  items: [],
  summaries: [],
  lastCompleted: 0
});

export async function actualizar(kv, now = Date.now(), update = refresh, compile = compileSummaries) {
  const previous = (await kv.get(snapshotKey,'json')) ?? empty();
  const lastAttempt = new Date(now).toISOString();
  const alreadyUpdated = previous.health.lastAttempt?.slice(0,10) === lastAttempt.slice(0,10)
    && previous.health.coverageVersion === 4
    && previous.health.synthesis?.errors === 0
    && previous.health.sources.length && previous.health.sources.every(source => source.ok);
  if(alreadyUpdated) return;
  let next;
  try { next = await update(); }
  catch { next = {items:[],status:[{id:'ingesta',ok:false,count:0}]}; }
  const items = mergeItems(previous.items,next.items);
  const sources = next.status.map(({id,ok,count}) => ({id,ok,count}));
  let summaries=previous.summaries??[];
  let synthesis={attempted:0,errors:1,count:summaries.length};
  try {
    const result = await compile(items,summaries,now);
    summaries = result.summaries;
    synthesis = result.status;
  } catch {
    // Keep the previous published summaries if the compilation step stops.
  }
  const health = {...previous.health,lastAttempt,sources,cache:'guardada',coverageVersion:4,synthesis};
  await kv.put(snapshotKey,JSON.stringify({health,items,summaries,lastCompleted:now}));
  console.log('Contanuevas:',updateStatus(health,now),sources.map(s=>[s.id,s.ok,s.count]));
}

export default {
  async fetch(request,env) {
    const url = new URL(request.url);
    const send = (status,body,type='application/json; charset=utf-8',extra={}) =>
      new Response(request.method==='HEAD'?null:JSON.stringify(body),{
        status,headers:{...security,'Strict-Transport-Security':'max-age=15552000','Content-Type':type,...extra}
      });
    if(!['GET','HEAD'].includes(request.method)) return send(405,{error:'Método no permitido'},undefined,{Allow:'GET, HEAD'});
    if(url.pathname.length+url.search.length>2048) return send(400,{error:'Ruta inválida'});
    if(!url.pathname.startsWith('/api/')) {
      if(!['/','/index.html','/estilo.css','/app.js','/simulador.js','/marca.svg','/icono.svg','/serif.woff2','/sans.woff2','/openapi.json'].includes(url.pathname)) {
        return send(404,{error:'Ruta no encontrada'});
      }
      const asset = await env.ASSETS.fetch(request);
      const headers = new Headers(asset.headers);
      for(const [name,value] of Object.entries(security)) headers.set(name,value);
      headers.set('Strict-Transport-Security','max-age=15552000');
      return new Response(request.method==='HEAD'?null:asset.body,{status:asset.status,headers});
    }
    let snapshot;
    try { snapshot = (await env.BOLETIN.get(snapshotKey,'json')) ?? empty(); }
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
