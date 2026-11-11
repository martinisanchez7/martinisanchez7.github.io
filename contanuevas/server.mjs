import { createServer } from 'node:http';
import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { DAY, RETRY, security, mergeItems, serveApi, updateStatus } from './api.mjs';
import { compileSummaries } from './sintesis.mjs';

const files = new Map([['/','index.html'],['/estilo.css','estilo.css'],['/app.js','app.js'],['/simulador.js','simulador.js'],['/marca.svg','marca.svg'],['/icono.svg','icono.svg'],['/serif.woff2','serif.woff2'],['/sans.woff2','sans.woff2'],['/openapi.json','openapi.json']]);
files.set('/criterios.js','criterios.js');
for(const file of ['instalar.js','manifest.webmanifest','service-worker.js','app-192.png','app-512.png']) files.set('/'+file,file);
const types = {html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',svg:'image/svg+xml',woff2:'font/woff2',json:'application/json; charset=utf-8',webmanifest:'application/manifest+json',png:'image/png'};
export function createApp({live=false, update, cacheFile, compile=compileSummaries}={}) {
  let current = [];
  let summaries = [];
  let health = {product:'contanuevas',mode:live?'conectado':'archivo',lastAttempt:null,sources:[]};
  let lastCompleted = 0;
  if(cacheFile) health.cache = 'sin-copia';
  const ready = cacheFile ? (async()=>{
    try {
      const items = JSON.parse(await readFile(cacheFile,'utf8'));
      if(!Array.isArray(items)) throw Error('Copia inválida');
      current = mergeItems([],items);
      health.cache = 'restaurada';
    } catch(error) {
      if(error.code!=='ENOENT') health.cache = 'no-disponible';
    }
  })() : Promise.resolve();
  let pending;
  const refresh = () => pending ??= (async()=>{
    await ready;
    health.lastAttempt = new Date().toISOString();
    try {
      const run = update ?? (await import('./fuentes.mjs')).refresh;
      const next = await run();
      health.sources = next.status.map(({id,ok,count}) => ({id,ok,count}));
      current = mergeItems(current,next.items);
      const synthesis = await compile(current,summaries);
      summaries = synthesis.summaries;
      health.synthesis = synthesis.status;
      if(cacheFile && health.sources.some(source=>source.ok)) {
        const temporary = cacheFile+'.'+randomUUID()+'.tmp';
        try {
          await writeFile(temporary,JSON.stringify(current),{encoding:'utf8',flag:'wx'});
          await rename(temporary,cacheFile);
          health.cache = 'guardada';
        } catch {
          health.cache = 'no-disponible';
          await unlink(temporary).catch(()=>{});
        }
      }
    } catch { health.sources = [{id:'ingesta',ok:false,count:0}]; }
    lastCompleted = Date.now();
    return updateStatus(health,lastCompleted);
  })().finally(()=>{pending=undefined;});

  const server=createServer(async(req,res)=>{
    const send=(status,body,type='application/json; charset=utf-8',extra={})=>{
      res.writeHead(status,{...security,'Content-Type':type,...extra});
      res.end(req.method==='HEAD'?undefined:typeof body==='string'||Buffer.isBuffer(body)?body:JSON.stringify(body));
    };
    try {
      await ready;
      if(!['GET','HEAD'].includes(req.method)) return send(405,{error:'Método no permitido'},undefined,{Allow:'GET, HEAD'});
      if(!req.url?.startsWith('/') || req.url.startsWith('//') || req.url.length>2048) return send(400,{error:'Ruta inválida'});
      const url=new URL(req.url,'http://localhost');
      const result=serveApi(url,send,health,current,lastCompleted,summaries);
      if(url.pathname.startsWith('/api/')) return result;
      const {pathname}=url;
      const file=files.get(pathname);
      if(!file) return send(404,{error:'Ruta no encontrada'});
      return send(200,await readFile(new URL(file,import.meta.url)),types[file.split('.').at(-1)]);
    } catch { return send(500,{error:'No se pudo completar la solicitud'}); }
  });
  return {server,refresh};
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const live=process.argv.includes('--con-fuentes');
  const port=Number(process.env.PORT??4195);
  const {server,refresh}=createApp({live,cacheFile:live?(process.env.CONTANUEVAS_CACHE??'contanuevas-cache.json'):undefined});
  const host=process.env.CONTANUEVAS_HOST??'127.0.0.1';
  if(live) {
    const cycle=async()=>{
      const estado=await refresh();
      console.log(`[${new Date().toISOString()}] Actualización: ${estado}`);
      setTimeout(cycle,estado==='al-dia'?DAY:RETRY).unref();
    };
    await cycle();
  }
  server.listen(port,host,()=>console.log(`Contanuevas: http://${host}:${server.address().port}/`));
}
