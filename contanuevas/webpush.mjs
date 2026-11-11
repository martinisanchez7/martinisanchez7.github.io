const encoder = new TextEncoder();
const text = value => encoder.encode(value);
const apple = /^[a-z0-9-]+\.push\.apple\.com$/;

export function pushEndpoint(value) {
  if(typeof value!=='string' || value.length>1800) return;
  const url=URL.parse(value);
  if(!url || url.protocol!=='https:' || url.username || url.password || url.port || url.hash || url.pathname.length<10) return;
  if(url.hostname==='fcm.googleapis.com' && /^\/(?:fcm\/send|wp)\/[\w:.-]+$/.test(url.pathname)) return url;
  if(url.hostname==='updates.push.services.mozilla.com' && /^\/wpush\/v[12]\/[\w.-]+$/.test(url.pathname)) return url;
  if(apple.test(url.hostname) && /^\/[\w./-]+$/.test(url.pathname)) return url;
}

export const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
export const fromB64 = value => Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
export const hash = async value => b64(await crypto.subtle.digest('SHA-256',text(value)));
function join(...arrays) {
  const bytes = new Uint8Array(arrays.reduce((total,value)=>total+value.length,0));
  let offset=0;
  for(const value of arrays) {
    bytes.set(value,offset);
    offset+=value.length;
  }
  return bytes;
}

export async function pushKeys() {
  const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  return {
    publicKey:b64(await crypto.subtle.exportKey('raw',pair.publicKey)),
    privateKey:await crypto.subtle.exportKey('jwk',pair.privateKey)
  };
}

async function hkdf(ikm,salt,info,bits) {
  const key=await crypto.subtle.importKey('raw',ikm,'HKDF',false,['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},key,bits));
}

export async function encryptPush(keys,message) {
  const plain=text(JSON.stringify(message));
  if(plain.length>1024) throw Error('Notificación demasiado larga');
  const ua=fromB64(keys.p256dh);
  const auth=fromB64(keys.auth);
  const receiver=await crypto.subtle.importKey('raw',ua,{name:'ECDH',namedCurve:'P-256'},false,[]);
  const sender=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const publicKey=new Uint8Array(await crypto.subtle.exportKey('raw',sender.publicKey));
  const secret=await crypto.subtle.deriveBits({name:'ECDH',public:receiver},sender.privateKey,256);
  const ikm=await hkdf(secret,auth,join(text('WebPush: info\0'),ua,publicKey),256);
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const key=await crypto.subtle.importKey('raw',await hkdf(ikm,salt,text('Content-Encoding: aes128gcm\0'),128),'AES-GCM',false,['encrypt']);
  const iv=await hkdf(ikm,salt,text('Content-Encoding: nonce\0'),96);
  const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,join(plain,Uint8Array.of(2))));
  // RFC 8188: salt, record size 4096, key ID length, ECDH public key, encrypted record.
  return join(salt,Uint8Array.of(0,0,16,0,65),publicKey,encrypted);
}

export async function deliverPush(subscription,message,vapid,topic,fetcher=fetch) {
  const endpoint=pushEndpoint(subscription.endpoint);
  if(!endpoint) return 410;
  const header=b64(text(JSON.stringify({typ:'JWT',alg:'ES256'})));
  const claims=b64(text(JSON.stringify({aud:endpoint.origin,exp:Math.floor(Date.now()/1000)+43_200,sub:'mailto:contacto.msimpuestos@gmail.com'})));
  const signing=await crypto.subtle.importKey('jwk',vapid.privateKey,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
  const signature=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},signing,text(header+'.'+claims));
  const response=await fetcher(endpoint.href,{
    method:'POST',redirect:'manual',signal:AbortSignal.timeout(9000),
    headers:{
      Authorization:'vapid t='+header+'.'+claims+'.'+b64(signature)+', k='+vapid.publicKey,
      'Content-Encoding':'aes128gcm','Content-Type':'application/octet-stream',
      TTL:'3600',Urgency:'normal',Topic:topic
    },
    body:await encryptPush(subscription.keys,message)
  });
  await response.body?.cancel().catch(()=>{});
  return response.status;
}
