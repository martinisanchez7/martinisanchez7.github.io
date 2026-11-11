const form = document.querySelector('#filtros');
const list = document.querySelector('#entradas');
const count = document.querySelector('#cantidad');
const more = document.querySelector('#mas');
const filters = ['q','categoria','modo','respaldo','importancia','desde','hasta'];
const categories = {impositivo:'Impositivo',contable:'Contable',laboral:'Laboral',internacional:'Mercados internacionales',economia:'Economía y finanzas'};
const modes = {resumen:'Resúmenes',todos:'Boletín',editorial:'Resúmenes revisados',sintesis:'Síntesis automáticas',automatico:'Alertas de fuentes',archivo:'Archivo'};
const types = {editorial:'Resumen revisado',sintesis:'Síntesis automática',automatico:'Alerta',archivo:'Documento histórico'};
const tiers = {oficial:'Fuente oficial',tecnico:'Referencia técnica',periodistico:'Prensa'};
const dateTime = new Intl.DateTimeFormat('es-AR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Argentina/Buenos_Aires'});

let request;
let offset = 0;
let applied = new URLSearchParams();

function element(tag,text='',cls) {
  const node = document.createElement(tag);
  node.textContent = text;
  if(cls) node.className = cls;
  return node;
}

function sourceLink(url,label) {
  const node = element('a',label);
  const target = URL.parse(url);
  if(target?.protocol==='https:' && !target.username && !target.password) {
    node.href = target.href;
    node.target = '_blank';
    node.rel = 'noopener noreferrer';
  }
  return node;
}

function tableView({caption,columns,rows}) {
  const container = element('div','','tabla-ficha');
  container.tabIndex = 0;
  container.setAttribute('role','region');
  container.setAttribute('aria-label',caption);
  const table = document.createElement('table');
  table.append(element('caption',caption));
  const header = table.createTHead().insertRow();
  for(const column of columns) {
    const cell = element('th',column);
    cell.scope = 'col';
    header.append(cell);
  }
  const body = table.createTBody();
  for(const values of rows) {
    const row = body.insertRow();
    const label = element('th',values[0]);
    label.scope = 'row';
    row.append(label,...values.slice(1).map(value=>element('td',value)));
  }
  container.append(table);
  return container;
}

function renderItem(item) {
  const article = element('article');
  const meta = element('div','','meta');
  meta.append(element('b',categories[item.category]),document.createTextNode(
    ' · '+item.date+(item.importance==='alta'?' · Prioridad alta':'')
  ));
  const kind = item.reviewedId?'Resumen revisado disponible':item.summaryId?'Síntesis disponible':types[item.mode];
  article.append(meta,element('h3',item.title),element('p',kind+' · '+(tiers[item.sourceTier]??'Respaldo sin clasificar'),'respaldo'));
  if(!item.reviewedId && !item.summaryId) article.append(element('p',item.summary));

  if(item.brief) {
    const detail = element('details');
    detail.open = applied.get('q')===item.id;
    detail.append(element('summary','Ver alcance, fechas y fuentes'));
    const labels = {whatChanged:'Qué cambió',who:'A quién alcanza',when:'Desde cuándo',action:'Qué hacer',limits:'Qué revisar'};
    for(const [key,label] of Object.entries(labels)) {
      if(!item.brief[key]) continue;
      const p = element('p');
      p.append(element('strong',label+'. '),document.createTextNode(item.brief[key]));
      detail.append(p);
    }
    const dateLabel = item.brief.reviewedAt?'Revisión '+item.brief.reviewedAt:'Consulta oficial '+item.brief.checkedAt;
    detail.append(element('p',dateLabel+' · '+item.brief.scope,'brief-meta'));
    for(const table of item.tables??[]) detail.append(tableView(table));
    for(const ref of item.references??[]) {
      const p = element('p','','referencias');
      p.append(sourceLink(ref.url,ref.label+' ↗'));
      detail.append(p);
    }
    article.append(detail);
  }
  if(item.reviewedId || item.summaryId) {
    const review = element('a',item.reviewedId?'Leer el resumen verificado':'Leer la síntesis automática');
    review.href = '/?'+new URLSearchParams({modo:item.reviewedId?'editorial':'sintesis',q:item.reviewedId??item.summaryId})+'#boletin';
    const p = element('p');
    p.append(review);
    article.append(p);
  }
  const source = element('p','','referencias');
  source.append(sourceLink(item.url,item.source+' ↗'));
  article.append(source);
  return article;
}

function restoreFilters() {
  const params = new URLSearchParams(location.search);
  for(const name of filters) form.elements.namedItem(name).value = params.get(name)??(name==='modo'?'resumen':'');
  if(!form.elements.modo.value) form.elements.modo.value = 'resumen';
  document.querySelector('.advanced').open = ['desde','hasta','respaldo','importancia'].some(name=>params.has(name))
    || ['todos','editorial','sintesis'].includes(params.get('modo'));
}

function formFilters() {
  const params = new URLSearchParams();
  for(const [name,value] of new FormData(form)) if(value.trim()) params.set(name,value.trim());
  return params;
}

async function load(append=false) {
  request?.abort();
  const next = new AbortController();
  request = next;
  if(!append) {
    offset = 0;
    applied = formFilters();
    list.replaceChildren();
    document.querySelector('#boletin-title').textContent = modes[applied.get('modo')]??'Boletín';
    const mode = applied.get('modo');
    for(const link of document.querySelectorAll('.sidebar nav a')) {
      if(new URL(link.href).searchParams.get('modo')===mode) link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    }
  }
  more.hidden = true;
  count.textContent = 'Buscando…';
  const params = new URLSearchParams(applied);
  if(params.get('modo')==='todos') params.delete('modo');
  params.set('limite','12');
  params.set('desde_fila',String(offset));
  try {
    const response = await fetch('/api/v1/novedades?'+params,{signal:next.signal});
    if(response.status===400) {
      count.textContent = 'Revisá los filtros y el orden de las fechas.';
      return;
    }
    if(!response.ok) throw Error();
    const data = await response.json();
    if(next.signal.aborted) return;
    for(const item of data.items) list.append(renderItem(item));
    offset += data.items.length;
    count.textContent = data.total+(data.total===1?' ficha':' fichas');
    more.hidden = offset>=data.total;
    if(!data.total) list.append(element('p','No hay fichas con esos filtros. Probá otra sección o elegí Alertas de fuentes.'));
  } catch(error) {
    if(error.name!=='AbortError') count.textContent = 'No se pudo cargar el boletín. Volvé a buscar.';
  }
}

form.addEventListener('submit',event=>{
  event.preventDefault();
  const target = '/?'+formFilters()+'#boletin';
  if(target!==location.pathname+location.search+location.hash) history.pushState(null,'',target);
  load();
});
addEventListener('popstate',()=>{restoreFilters();load();});
more.addEventListener('click',()=>load(true));

async function loadStatus() {
  const badge = document.querySelector('#salud');
  const details = document.querySelector('#estado-detalle');
  try {
    const response = await fetch('/api/v1/salud');
    if(!response.ok) throw Error();
    const data = await response.json();
    const labels = {'al-dia':'Fuentes al día',degradada:'Actualización parcial',atrasada:'Actualización atrasada',archivo:'Modo archivo',pendiente:'Esperando actualización'};
    badge.textContent = labels[data.actualizacion]??'Estado de fuentes';
    const results = data.sources.map(source=>source.id+' · '+(source.ok?source.count+' detectadas':'sin respuesta'));
    if(data.lastAttempt) results.unshift('Última consulta '+dateTime.format(new Date(data.lastAttempt)));
    if(data.synthesis) results.push('Síntesis automáticas guardadas: '+data.synthesis.count);
    details.textContent = results.join(' / ') || 'Todavía no hay una consulta registrada.';
  } catch { badge.textContent = 'Estado no disponible'; }
}

async function loadCatalog() {
  const list = document.querySelector('#fuentes-lista');
  try {
    const response = await fetch('/api/v1/fuentes');
    if(!response.ok) throw Error();
    const {items} = await response.json();
    for(const source of items) {
      const row = element('li');
      row.append(sourceLink(source.url,source.name),document.createTextNode(' · '+(tiers[source.tier]??'Referencia')+' · '+source.role));
      list.append(row);
    }
  } catch { list.textContent = 'El catálogo no está disponible.'; }
}

restoreFilters();
load();
loadStatus();
loadCatalog();
