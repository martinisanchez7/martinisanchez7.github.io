import { mergeItems, security, serveApi, updateStatus } from './api.mjs';
import { refresh } from './fuentes.mjs';

const snapshotKey = 'boletin-v1';
const empty = () => ({
  health: { product:'contanuevas', mode:'conectado', lastAttempt:null, sources:[], cache:'sin-copia' },
  items: [],
  lastCompleted: 0
});

export async function actualizar(kv, now = Date.now(), update = refresh) {
  const previous = (await kv.get(snapshotKey,'json')) ?? empty();
  const lastAttempt = new Date(now).toISOString();
  const alreadyUpdated = previous.health.lastAttempt?.slice(0,10) === lastAttempt.slice(0,10)
    && previous.health.sources.length && previous.health.sources.every(source => source.ok);
  if(alreadyUpdated) return;
  let next;
  try { next = await update(); }
  catch { next = {items:[],status:[{id:'ingesta',ok:false,count:0}]}; }
  const items = mergeItems(previous.items,next.items);
  const sources = next.status.map(({id,ok,count}) => ({id,ok,count}));
  const health = {...previous.health,lastAttempt,sources,cache:'guardada'};
  await kv.put(snapshotKey,JSON.stringify({health,items,lastCompleted:now}));
  console.log('Contanuevas:',updateStatus(health,now),sources.map(s=>[s.id,s.ok,s.count]));
}

export default {
  async fetch(request,env) {
    const url = new URL(request.url);
    const send = (status,body,type='application/json; charset=utf-8',extra={}) =>
      new Response(request.method==='HEAD'?null:JSON.stringify(body),{
        status,headers:{...security,'Content-Type':type,...extra}
      });
    if(!['GET','HEAD'].includes(request.method)) return send(405,{error:'Método no permitido'},undefined,{Allow:'GET, HEAD'});
    if(url.pathname.length+url.search.length>2048) return send(400,{error:'Ruta inválida'});
    if(!url.pathname.startsWith('/api/')) {
      const asset = await env.ASSETS.fetch(request);
      const headers = new Headers(asset.headers);
      for(const [name,value] of Object.entries(security)) headers.set(name,value);
      return new Response(request.method==='HEAD'?null:asset.body,{status:asset.status,headers});
    }
    let snapshot;
    try { snapshot = (await env.BOLETIN.get(snapshotKey,'json')) ?? empty(); }
    catch {
      snapshot = empty();
      snapshot.health.cache = 'no-disponible';
      snapshot.health.sources = [{id:'almacenamiento',ok:false,count:0}];
    }
    const {health,items,lastCompleted} = snapshot;
    return serveApi(url,send,health,items,lastCompleted);
  },
  async scheduled(event,env) {
    await actualizar(env.BOLETIN,event.scheduledTime);
  }
};
