const form=document.querySelector('#filtros'),list=document.querySelector('#entradas'),count=document.querySelector('#cantidad'),more=document.querySelector('#mas');
const labels={impositivo:'Impositivo',contable:'Contable',laboral:'Laboral',internacional:'Mercados internacionales'};
let controller,offset=0,applied=new URLSearchParams();
const pageFilters=['q','categoria','modo','desde','hasta'];
function restoreFilters(){
  const params=new URLSearchParams(location.search);
  for(const name of pageFilters) form.elements.namedItem(name).value=params.get(name)??'';
}
const el=(tag,text,cls)=>{const node=document.createElement(tag);node.textContent=text;if(cls)node.className=cls;return node;};
function link(url,label){const a=el('a',label);const target=URL.parse(url);if(target?.protocol==='https:'){a.href=target.href;a.target='_blank';a.rel='noopener noreferrer';}return a;}
async function cargar(append=false){
  controller?.abort();const request=new AbortController();controller=request;
  if(!append){offset=0;list.replaceChildren();applied=new URLSearchParams();for(const [key,value] of new FormData(form))if(value.trim())applied.set(key,value.trim());}more.hidden=true;
  const params=new URLSearchParams(applied);params.set('limite','12');params.set('desde_fila',String(offset));
  count.textContent='Buscando…';
  try{
    const res=await fetch('/api/v1/novedades?'+params,{signal:request.signal});
    if(res.status===400){count.textContent='Revisá los filtros. La fecha Hasta debe ser igual o posterior a Desde.';return;}
    if(!res.ok)throw Error();
    const data=await res.json();if(request.signal.aborted)return;
    for(const item of data.items){
      const a=el('article','');const meta=el('div','','meta');
      meta.append(el('b',labels[item.category]),document.createTextNode(` · ${item.datePrecision==='month'?item.date.slice(0,7):item.date} · ${item.mode==='editorial'?'Ficha revisada':item.mode==='archivo'?'Archivo histórico':'Importación sin revisión editorial'}`));
      a.append(meta,el('h3',item.title),el('p',item.summary),link(item.url,`${item.source} ↗`));for(const ref of item.references??[]) { const p=el("p","");p.append(link(ref.url,ref.label+" ↗"));a.append(p); } list.append(a);
    }
    offset+=data.items.length;count.textContent=`${data.total} ${data.total===1?'ficha':'fichas'}`;more.hidden=offset>=data.total;
    if(!data.total)list.append(el('p','No hay fichas con esos filtros. Probá otra sección o una búsqueda más corta.'));
  }catch(e){if(e.name!=='AbortError')count.textContent='No se pudo cargar el boletín. Volvé a probar con Filtrar.';}
}
form.addEventListener('submit',e=>{
  e.preventDefault();
  const params=new URLSearchParams();
  for(const [name,value] of new FormData(form)) if(value.trim())params.set(name,value.trim());
  const query=params.toString();
  const target=location.pathname+(query?'?'+query:'')+location.hash;
  if(target!==location.pathname+location.search+location.hash)history.pushState(null,'',target);
  cargar();
});
addEventListener('popstate',()=>{restoreFilters();cargar();});
more.addEventListener('click',()=>cargar(true));
fetch('/api/v1/salud').then(r=>r.json()).then(data=>{
  const state=data.mode==='archivo'?'Modo archivo · sin actualización en vivo':data.sources.length===0?'Conectores habilitados · sin consulta completada':data.sources.map(s=>`${s.id}: ${s.ok?`${s.count} detectadas`:'no disponible'}`).join(' · ');
  const cache={guardada:'Copia local guardada',restaurada:'Mostrando fichas recuperadas de la copia local','no-disponible':'Copia local no disponible'}[data.cache];
  const warning={degradada:'Actualización incompleta',atrasada:'Actualización atrasada'}[data.actualizacion];
  document.querySelector('#salud').textContent=[warning,state,data.lastAttempt?`Último intento: ${new Date(data.lastAttempt).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})}`:null,cache].filter(Boolean).join(' · ');
}).catch(()=>{document.querySelector('#salud').textContent='Estado de fuentes no disponible.';});
fetch('/api/v1/fuentes').then(r=>r.json()).then(({items})=>{for(const s of items){const li=el('li','');li.append(link(s.url,s.name),document.createTextNode(' — '+s.role));document.querySelector('#fuentes-lista').append(li);}}).catch(()=>{document.querySelector('#fuentes-lista').textContent='El catálogo no está disponible.';});
restoreFilters();
cargar();
