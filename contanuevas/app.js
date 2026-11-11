const form=document.querySelector('#filtros'),list=document.querySelector('#entradas'),count=document.querySelector('#cantidad'),more=document.querySelector('#mas');
const labels={impositivo:'Impositivo',contable:'Contable',laboral:'Laboral',internacional:'Mercados internacionales',economia:'Economía y finanzas'};
let controller,offset=0,applied=new URLSearchParams();
const pageFilters=['q','categoria','modo','desde','hasta','respaldo','importancia'];
function restoreFilters(){
  const params=new URLSearchParams(location.search);
  for(const name of pageFilters) form.elements.namedItem(name).value=params.get(name)??'';
}
const el=(tag,text,cls)=>{const node=document.createElement(tag);node.textContent=text;if(cls)node.className=cls;return node;};
function link(url,label){const a=el('a',label);const target=URL.parse(url);if(target?.protocol==='https:'){a.href=target.href;a.target='_blank';a.rel='noopener noreferrer';}return a;}
function tablaDeFicha({caption,columns,rows}) {
  const container=el('div','','tabla-ficha');
  container.tabIndex=0;
  container.setAttribute('role','region');
  container.setAttribute('aria-label',caption);
  const table=document.createElement('table');
  table.append(el('caption',caption));
  const header=table.createTHead().insertRow();
  for(const column of columns) {
    const cell=el('th',column);
    cell.scope='col';
    header.append(cell);
  }
  const body=table.createTBody();
  for(const values of rows) {
    const row=body.insertRow();
    const label=el('th',values[0]);
    label.scope='row';
    row.append(label,...values.slice(1).map(value=>el('td',value)));
  }
  container.append(table);
  return container;
}
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
      a.append(meta,el('h3',item.title));
      const reviewLabel=item.reviewedId?'Resumen disponible':item.verification==='pendiente'?'Pendiente de cotejo documental':item.verification==='historica'?'Documento histórico':'Resumen revisado';
      a.append(el('p',`${({oficial:'Fuente oficial',tecnico:'Referencia técnica',periodistico:'Prensa'})[item.sourceTier]??'Respaldo sin clasificar'} · ${item.importance==='alta'?'Prioridad alta':'Seguimiento'} · ${reviewLabel}`,'respaldo'));
      if(item.brief){for(const [key,label] of Object.entries({whatChanged:'Qué cambió',who:'A quién alcanza',when:'Desde cuándo',action:'Qué hacer',limits:'Qué revisar'})){if(item.brief[key]){const p=el('p','');p.append(el('strong',label+': '),document.createTextNode(item.brief[key]));a.append(p);}}a.append(el('p',`Revisión: ${item.brief.reviewedAt} · ${item.brief.scope}`));}else if(!item.reviewedId) a.append(el('p',item.summary));
      for(const table of item.tables??[]) a.append(tablaDeFicha(table));
      if(item.reviewedId) {
        const review=el('a','Leer el resumen verificado');
        review.href='/?'+new URLSearchParams({modo:'editorial',q:item.reviewedId})+'#boletin';
        const paragraph=el('p','');
        paragraph.append(review);
        a.append(paragraph);
      }
      a.append(link(item.url,`${item.source} ↗`));for(const ref of item.references??[]) { const p=el("p","");p.append(link(ref.url,ref.label+" ↗"));a.append(p); } list.append(a);
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
fetch('/api/v1/fuentes').then(r=>r.json()).then(({items})=>{for(const s of items){const li=el('li','');li.append(link(s.url,s.name),document.createTextNode(` — ${s.tier==='oficial'?'Oficial':s.tier==='tecnico'?'Técnica':'Prensa'} · ${s.connection==='automatico'?'Consulta automática (ver estado arriba)':'Referencia manual, sin importación'} · ${s.role}`));document.querySelector('#fuentes-lista').append(li);}}).catch(()=>{document.querySelector('#fuentes-lista').textContent='El catálogo no está disponible.';});
restoreFilters();
cargar();
