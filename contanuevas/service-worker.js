self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));

self.addEventListener('fetch',event=>{
  if(event.request.mode!=='navigate' || new URL(event.request.url).origin!==self.location.origin) return;
  event.respondWith(fetch(event.request).catch(()=>new Response(
    '<!doctype html><html lang="es-AR"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Contanuevas</title><h1>Contanuevas</h1><p>Conectate a Internet para consultar el boletín.</p><p><a href="/">Volver a intentar</a></p></html>',
    {status:503,headers:{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff'}}
  )));
});

const sections=new Set(['impositivo','contable','laboral','economia','internacional']);
self.addEventListener('push',event=>{
  let message;
  try {message=event.data?.json();} catch {}
  const category=sections.has(message?.category)?message.category:'';
  event.waitUntil(self.registration.showNotification(
    typeof message?.title==='string'?message.title.slice(0,90):'Contanuevas',
    {
      body:typeof message?.body==='string'?message.body.slice(0,200):'Ya podés consultar el boletín de hoy.',
      icon:'/app-192.png',
      tag:'contanuevas-diario',
      data:{category}
    }
  ));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const category=event.notification.data?.category;
  const path=sections.has(category)?'/?'+new URLSearchParams({categoria:category})+'#boletin':'/';
  event.waitUntil(self.clients.openWindow(new URL(path,self.location.origin).href));
});
