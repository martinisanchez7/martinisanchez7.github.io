import { ambitos, perfiles, cargarOpciones } from './criterios.js';

const install=document.querySelector('#instalar-app');
const instructions=document.querySelector('#instrucciones-app');
const form=document.querySelector('#avisos-form');
cargarOpciones(form.elements.jurisdiction,ambitos);
cargarOpciones(form.elements.profile,perfiles);
const state=document.querySelector('#avisos-estado');
const stop=document.querySelector('#avisos-baja');
const storageKey='contanuevas-aviso-v1';
let prompt;
let config;
let registration;
let busy=false;
let initializing=false;
let local;
try { local=JSON.parse(localStorage.getItem(storageKey)??'null'); } catch {}

const ios=/iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints>1);
const installed=matchMedia('(display-mode: standalone)').matches || navigator.standalone===true;
if(installed) install.hidden=true;

window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  prompt=event;
});
window.addEventListener('appinstalled',()=>{
  install.hidden=true;
  instructions.hidden=false;
  instructions.textContent='Contanuevas ya está instalada en este dispositivo.';
});
install.addEventListener('click',async()=>{
  if(prompt) {
    const pending=prompt;
    prompt=undefined;
    try { await pending.prompt(); } catch {}
    return;
  }
  instructions.hidden=false;
  instructions.textContent=ios
    ? 'En Safari, tocá Compartir y elegí Agregar a inicio. Después abrí Contanuevas desde su ícono.'
    : 'En el menú del navegador, elegí Instalar aplicación o Agregar a pantalla de inicio.';
});

function setBusy(value) {
  busy=value;
  for(const control of form.elements) control.disabled=value;
  stop.disabled=value;
}

function showSettings() {
  stop.hidden=!local?.credential;
  form.querySelector('button').textContent=local?.credential?'Guardar cambios':'Activar aviso diario';
  if(!local?.credential) return;
  form.elements.hour.value=local.hour;
  form.elements.category.value=local.category;
  form.elements.jurisdiction.value=local.jurisdiction??'';
  form.elements.profile.value=local.profile??'';
  state.textContent='Aviso programado a las '+local.hour+' (hora argentina).';
}

function keyBytes(value) {
  return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
}

async function initialize() {
  if(initializing) return;
  if(ios && !installed) {
    state.textContent='En iPhone o iPad, instalá la app y abrila desde la pantalla de inicio para activar los avisos.';
    return;
  }
  if(!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    state.textContent='Este navegador no admite avisos de la app.';
    return;
  }
  initializing=true;
  try {
    const response=await fetch('/api/v1/avisos/config');
    config=await response.json();
    if(!response.ok || !config.enabled) throw Error();
    await navigator.serviceWorker.register('/service-worker.js');
    registration=await navigator.serviceWorker.ready;
    if(!local?.credential) {
      const params=new URLSearchParams(location.search);
      for(const [control,param] of [['category','categoria'],['jurisdiction','jurisdiccion'],['profile','perfil']]) {
        const select=form.elements[control];
        const value=params.get(param);
        if([...select.options].some(option=>option.value===value)) select.value=value;
      }
    }
    showSettings();
    form.hidden=false;
    if(!local?.credential) state.textContent='Elegí a qué hora querés recibir el aviso y qué novedades te interesan.';
  } catch {
    state.textContent='Los avisos no están disponibles en este momento.';
  } finally {initializing=false;}
}

form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(busy || !registration || !config || !form.reportValidity()) return;
  const hour=form.elements.hour.value;
  const category=form.elements.category.value;
  const jurisdiction=form.elements.jurisdiction.value;
  const profile=form.elements.profile.value;
  setBusy(true);
  let created;
  try {
    localStorage.setItem(storageKey,JSON.stringify(local??null));
    if(Notification.permission!=='granted' && await Notification.requestPermission()!=='granted') {
      state.textContent='Permití las notificaciones en la configuración del navegador o del teléfono.';
      return;
    }
    let subscription=await registration.pushManager.getSubscription();
    if(subscription && !local?.credential) {
      await subscription.unsubscribe();
      subscription=null;
    }
    if(!subscription) {
      created=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(config.publicKey)});
      subscription=created;
    }
    const headers={'Content-Type':'application/json'};
    if(local?.credential) headers.Authorization='Bearer '+local.credential;
    const response=await fetch('/api/v1/avisos',{
      method:'POST',headers,body:JSON.stringify({hour,category,jurisdiction,profile,subscription:subscription.toJSON()})
    });
    const saved=await response.json();
    if(!response.ok) throw Error(saved.error??'No se pudo programar el aviso.');
    local={credential:saved.credential,hour:saved.hour,category:saved.category,
      jurisdiction:saved.jurisdiction??'',profile:saved.profile??''};
    localStorage.setItem(storageKey,JSON.stringify(local));
    showSettings();
  } catch(error) {
    if(created && !local?.credential) await created.unsubscribe().catch(()=>{});
    state.textContent=error.message||'No se pudo programar el aviso. Volvé a intentar.';
  } finally {setBusy(false);}
});

stop.addEventListener('click',async()=>{
  if(!local?.credential || busy) return;
  setBusy(true);
  try {
    const response=await fetch('/api/v1/avisos',{method:'DELETE',headers:{Authorization:'Bearer '+local.credential}});
    if(!response.ok && response.status!==404) throw Error();
    const subscription=await registration.pushManager.getSubscription();
    if(subscription) await subscription.unsubscribe().catch(()=>{});
    localStorage.removeItem(storageKey);
    local=null;
    showSettings();
    state.textContent='Aviso desactivado en este dispositivo.';
  } catch {state.textContent='No se pudo desactivar el aviso. Volvé a intentar.';}
  finally {setBusy(false);}
});

// Register on mobile Safari too, so the installed app can take control on its first launch.
if('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js').catch(()=>{});
const panel=document.querySelector('#avisos-panel');
panel.addEventListener('toggle',()=>{
  if(panel.open && !registration) initialize();
});
if(location.hash==='#avisos') panel.open=true;
addEventListener('hashchange',()=>{if(location.hash==='#avisos') panel.open=true;});

