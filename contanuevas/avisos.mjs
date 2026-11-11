import { categorias } from './datos.mjs';
import { b64, fromB64, hash, pushEndpoint, pushKeys, deliverPush } from './webpush.mjs';

const hourPattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const localZone = 'America/Argentina/Buenos_Aires';
const localClock = new Intl.DateTimeFormat('en-CA',{
  timeZone:localZone,year:'numeric',month:'2-digit',day:'2-digit'
});
const maxSubscriptions=200;
const sections={impositivo:'Impositivo',contable:'Contable',laboral:'Laboral',economia:'Economía y finanzas',internacional:'Mercados internacionales'};
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});

export function nextDelivery(hour,now=Date.now()) {
  if(typeof hour!=='string' || !hourPattern.test(hour)) throw Error('Horario inválido');
  const date=localClock.format(now);
  // Argentina currently uses UTC−03 year-round. Use the named zone to derive the offset.
  const wall=Date.parse(date+'T'+hour+':00Z');
  const offset=new Intl.DateTimeFormat('en',{timeZone:localZone,timeZoneName:'longOffset'})
    .formatToParts(wall).find(part=>part.type==='timeZoneName').value.slice(3);
  const local=Date.parse(date+'T'+hour+':00'+(offset||'+00:00'));
  return local>now?local:local+86_400_000;
}

async function requestBody(request) {
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')??'')) throw Error();
  if(Number(request.headers.get('Content-Length'))>4096 || !request.body) throw Error();
  const reader=request.body.getReader();
  const decoder=new TextDecoder();
  let size=0,body='';
  try {
    while(true) {
      const {done,value}=await reader.read();
      if(done) return JSON.parse(body+decoder.decode());
      size+=value.byteLength;
      if(size>4096) throw Error();
      body+=decoder.decode(value,{stream:true});
    }
  } finally {
    if(size>4096) await reader.cancel().catch(()=>{});
    reader.releaseLock();
  }
}

async function validSubscription(value) {
  const endpoint=pushEndpoint(value?.endpoint);
  const {p256dh,auth}=value?.keys??{};
  if(!endpoint || typeof p256dh!=='string' || !/^[A-Za-z0-9_-]{87}$/.test(p256dh) || typeof auth!=='string' || !/^[A-Za-z0-9_-]{22}$/.test(auth)) return;
  try {
    const point=fromB64(p256dh);
    if(point.length!==65 || point[0]!==4 || fromB64(auth).length!==16) return;
    await crypto.subtle.importKey('raw',point,{name:'ECDH',namedCurve:'P-256'},false,[]);
  } catch {return;}
  return {endpoint:endpoint.href,keys:{p256dh,auth}};
}

export class AvisosDiarios {
  constructor(state) {
    this.state=state;
    this.sql=state.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS suscripciones (
      id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, subscription TEXT NOT NULL,
      hour TEXT NOT NULL, category TEXT NOT NULL, next_at INTEGER NOT NULL,
      revision TEXT NOT NULL, retries INTEGER NOT NULL DEFAULT 0,
      failures INTEGER NOT NULL DEFAULT 0
    )`);
    this.sql.exec('CREATE INDEX IF NOT EXISTS suscripciones_proxima ON suscripciones(next_at)');
    this.ready=state.blockConcurrencyWhile(async()=>{
      this.vapid=await state.storage.get('vapid-v1');
      if(!this.vapid) {
        this.vapid=await pushKeys();
        await state.storage.put('vapid-v1',this.vapid);
      }
    });
  }

  async schedule() {
    const next=this.sql.exec('SELECT next_at FROM suscripciones ORDER BY next_at LIMIT 1').toArray()[0];
    if(next) await this.state.storage.setAlarm(Math.max(Date.now()+1000,next.next_at));
    else await this.state.storage.deleteAlarm();
  }

  async fetch(request) {
    await this.ready;
    const path=new URL(request.url).pathname;
    if(path==='/api/v1/avisos/config' && request.method==='GET') {
      return reply({enabled:true,publicKey:this.vapid.publicKey,timeZone:localZone});
    }
    if(path!=='/api/v1/avisos' || !['POST','DELETE'].includes(request.method)) return reply({error:'Ruta no disponible'},404);
    const bearer=/^Bearer ([A-Za-z0-9_-]{43})\.([A-Za-z0-9_-]{43})$/.exec(request.headers.get('authorization')??'');
    if(request.method==='DELETE') {
      if(!bearer) return reply({error:'Identificación del dispositivo inválida'},401);
      const changes=this.sql.exec('DELETE FROM suscripciones WHERE id=? AND token_hash=?',bearer[1],await hash(bearer[2])).rowsWritten;
      if(!changes) return reply({error:'El aviso ya no está registrado'},404);
      await this.schedule();
      return reply({enabled:false});
    }
    let input;
    try {input=await requestBody(request);} catch {return reply({error:'Solicitud inválida'},400);}
    const {hour,category}=input??{};
    const subscription=await validSubscription(input?.subscription);
    if(!subscription || typeof hour!=='string' || !hourPattern.test(hour) || typeof category!=='string' || !(category===''||categorias.includes(category))) {
      return reply({error:'Revisá el horario, la sección y los permisos del dispositivo'},400);
    }
    const id=await hash(subscription.endpoint);
    const saved=this.sql.exec('SELECT token_hash FROM suscripciones WHERE id=?',id).toArray()[0];
    if(saved && (!bearer || bearer[1]!==id || saved.token_hash!==await hash(bearer[2]))) {
      return reply({error:'Ya hay un aviso asociado a este dispositivo. Volvé a instalar la suscripción de avisos.'},409);
    }
    const token=saved?bearer[2]:b64(crypto.getRandomValues(new Uint8Array(32)));
    const tokenHash=await hash(token);
    const next=nextDelivery(hour);
    const revision=crypto.randomUUID();
    try {
      this.state.storage.transactionSync(()=>{
        const count=this.sql.exec('SELECT COUNT(*) AS n FROM suscripciones').one().n;
        if(!saved && count>=maxSubscriptions) throw Error('Capacidad');
        if(saved) {
          this.sql.exec('UPDATE suscripciones SET subscription=?, hour=?, category=?, next_at=?, revision=?, retries=0, failures=0 WHERE id=? AND token_hash=?',
            JSON.stringify(subscription),hour,category,next,revision,id,tokenHash);
        } else {
          this.sql.exec('INSERT INTO suscripciones (id,token_hash,subscription,hour,category,next_at,revision) VALUES (?,?,?,?,?,?,?)',
            id,tokenHash,JSON.stringify(subscription),hour,category,next,revision);
        }
      });
    } catch {return reply({error:'No pudimos guardar el aviso ahora. Volvé a intentar.'},503);}
    await this.schedule();
    return reply({enabled:true,credential:id+'.'+token,hour,category,nextAt:new Date(next).toISOString()});
  }

  async alarm() {
    await this.ready;
    const now=Date.now();
    const due=this.sql.exec('SELECT * FROM suscripciones WHERE next_at<=? ORDER BY next_at LIMIT 15',now).toArray();
    // Keep a future alarm even if the current invocation ends during a push request.
    await this.state.storage.setAlarm(now+60_000);
    for(const row of due) {
      const next=nextDelivery(row.hour,now);
      const moved=this.sql.exec('UPDATE suscripciones SET next_at=?, retries=0 WHERE id=? AND revision=? AND next_at=?',
        next,row.id,row.revision,row.next_at).rowsWritten;
      if(!moved || now-row.next_at>3_600_000) continue;
      let status=0;
      try {
        const label=sections[row.category];
        status=await deliverPush(JSON.parse(row.subscription),{
          title:label?'Contanuevas · '+label:'Contanuevas',
          body:label?'Ya podés consultar el boletín de '+label+'.':'Ya podés consultar el boletín de hoy.',
          category:row.category
        },this.vapid,'boletin-'+localClock.format(now));
      } catch { /* Errors are handled without recording endpoints or credentials. */ }
      if([404,410].includes(status)) this.sql.exec('DELETE FROM suscripciones WHERE id=? AND revision=?',row.id,row.revision);
      else if(status>=200 && status<300) this.sql.exec('UPDATE suscripciones SET failures=0 WHERE id=? AND revision=?',row.id,row.revision);
      else if((status===0 || status===429 || status>=500) && row.retries===0) {
        this.sql.exec('UPDATE suscripciones SET next_at=?, retries=1 WHERE id=? AND revision=?',now+600_000,row.id,row.revision);
      } else if(row.failures>=6) this.sql.exec('DELETE FROM suscripciones WHERE id=? AND revision=?',row.id,row.revision);
      else this.sql.exec('UPDATE suscripciones SET failures=failures+1 WHERE id=? AND revision=?',row.id,row.revision);
    }
    await this.schedule();
  }
}
