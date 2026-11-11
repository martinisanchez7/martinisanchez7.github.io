import { receiptView } from './simulador.js';

const form = document.querySelector('#filtros');
const list = document.querySelector('#entradas');
const count = document.querySelector('#cantidad');
const more = document.querySelector('#mas');
const retry = document.querySelector('#reintentar');
const navigation = document.querySelector('#navegacion');
const sections = document.querySelector('#secciones');
const apiLink = document.querySelector('#api-novedades');
const menu = document.querySelector('.menu-toggle');
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
    detail.open = applied.get('q')===item.id && location.hash!=='#simulador';
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
    const receipt = receiptView(item.tables??[]);
    if(receipt) article.append(receipt);
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
  const validCategory = Object.hasOwn(categories,params.get('categoria'));
  const defaultMode = validCategory?'todos':'resumen';
  for(const name of filters) form.elements.namedItem(name).value = params.get(name)??(name==='modo'?defaultMode:'');
  if(!Object.hasOwn(categories,form.elements.categoria.value)) form.elements.categoria.value = '';
  if(!form.elements.modo.value) form.elements.modo.value = 'resumen';
  document.querySelector('.advanced').open = ['desde','hasta','respaldo','importancia'].some(name=>params.has(name))
    || ['todos','editorial','sintesis'].includes(params.get('modo'));
}

function formFilters() {
  const params = new URLSearchParams();
  for(const [name,value] of new FormData(form)) if(value.trim()) params.set(name,value.trim());
  return params;
}

function syncNavigation() {
  const mode = form.elements.modo.value;
  const category = form.elements.categoria.value;
  const selected = location.hash==='#fuentes'?'fuentes'
    : location.hash==='#simulador'?'simulador'
    : ['automatico','archivo'].includes(mode)?mode:'resumen';
  for(const link of navigation.querySelectorAll('a[data-view]')) {
    if(link.dataset.view===selected) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
    if(['resumen','automatico','archivo'].includes(link.dataset.view)) {
      const params = new URLSearchParams({modo:link.dataset.view});
      if(category) params.set('categoria',category);
      link.href = '/?'+params+'#boletin';
    }
  }
  for(const link of sections.querySelectorAll('a[data-category]')) {
    const next = link.dataset.category;
    const params = new URLSearchParams(applied);
    if(!new URLSearchParams(location.search).has('modo')) params.delete('modo');
    if(next) params.set('categoria',next);
    else params.delete('categoria');
    if(location.hash==='#simulador') params.delete('q');
    link.href = '/?'+params+'#boletin';
    if(next===category) link.setAttribute('aria-current','true');
    else link.removeAttribute('aria-current');
  }
  apiLink.href = '/api/v1/novedades'+(category?'?'+new URLSearchParams({categoria:category}):'');
}

function openAnchor() {
  const target = document.getElementById(location.hash.slice(1));
  if(!target) return;
  if(target.id==='simulador') {
    target.open = true;
    target.querySelector('summary').focus({preventScroll:true});
  } else {
    target.querySelector('h2')?.focus({preventScroll:true});
  }
  target.scrollIntoView({block:'start'});
}

async function load(append=false) {
  request?.abort();
  const next = new AbortController();
  request = next;
  if(!append) {
    offset = 0;
    applied = formFilters();
    list.replaceChildren();
    const heading = modes[applied.get('modo')]??'Boletín';
    const category = categories[applied.get('categoria')];
    document.querySelector('#boletin-title').textContent = category?heading+' · '+category:heading;
    syncNavigation();
  }
  more.hidden = true;
  retry.hidden = true;
  list.setAttribute('aria-busy','true');
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
    if(!data.total) {
      const message = element('p','No hay fichas con esos filtros. ');
      const category = applied.get('categoria');
      if(category && applied.get('modo')!=='todos') {
        const link = element('a','Ver todas las fichas de esta sección');
        link.href = '/?'+new URLSearchParams({modo:'todos',categoria:category})+'#boletin';
        message.append(link);
      } else message.append('Probá otra sección o ajustá los filtros.');
      list.append(message);
    }
  } catch(error) {
    if(error.name!=='AbortError' && !next.signal.aborted) {
      count.textContent = 'No se pudo cargar el boletín.';
      retry.hidden = false;
      retry.onclick = ()=>load(append);
    }
  } finally {
    if(request===next) list.setAttribute('aria-busy','false');
  }
}

form.addEventListener('submit',event=>{
  event.preventDefault();
  const target = '/?'+formFilters()+'#boletin';
  if(target!==location.pathname+location.search+location.hash) history.pushState(null,'',target);
  load().then(openAnchor);
});
addEventListener('popstate',()=>{restoreFilters();load().then(openAnchor);});
addEventListener('hashchange',syncNavigation);
more.addEventListener('click',()=>load(true));
menu.addEventListener('click',()=>{
  menu.setAttribute('aria-expanded',String(menu.getAttribute('aria-expanded')!=='true'));
});
document.querySelector('.sidebar').addEventListener('keydown',event=>{
  if(event.key==='Escape' && menu.getAttribute('aria-expanded')==='true') {
    menu.setAttribute('aria-expanded','false');
    menu.focus();
  }
});
function followFilterLink(event) {
  const link = event.target.closest('a[data-view],a[data-category]');
  if(!link || event.button!==0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
  event.preventDefault();
  menu.setAttribute('aria-expanded','false');
  const target = new URL(link.href);
  const changed = target.search!==location.search;
  history.pushState(null,'',target.pathname+target.search+target.hash);
  if(changed) {
    restoreFilters();
    load().then(openAnchor);
  } else {
    syncNavigation();
    openAnchor();
  }
}
navigation.addEventListener('click',followFilterLink);
sections.addEventListener('click',followFilterLink);

async function loadStatus() {
  const badge = document.querySelector('#salud');
  const details = document.querySelector('#estado-detalle');
  try {
    const response = await fetch('/api/v1/salud');
    if(!response.ok) throw Error();
    const data = await response.json();
    const labels = {'al-dia':'Actualización completa',degradada:'Actualización parcial',atrasada:'Actualización atrasada',archivo:'Modo archivo',pendiente:'Esperando actualización'};
    badge.textContent = labels[data.actualizacion]??'Estado de fuentes';
    const results = data.sources.map(source=>source.id+' · '+(source.ok?source.count+' detectadas':'sin respuesta'));
    if(data.lastAttempt) results.unshift('Última consulta '+dateTime.format(new Date(data.lastAttempt)));
    if(data.synthesis) results.push('Síntesis automáticas guardadas: '+data.synthesis.count);
    if(data.synthesis?.errors) results.push('Consultas de síntesis fallidas: '+data.synthesis.errors);
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
  } catch {
    list.textContent = 'El catálogo no está disponible. Cerralo y volvé a abrirlo para reintentar.';
    document.querySelector('#catalogo').dataset.loaded='false';
  }
}

restoreFilters();
load().then(()=>{if(location.hash==='#simulador') openAnchor();});
loadStatus();
const catalog = document.querySelector('#catalogo');
catalog.addEventListener('toggle',()=>{
  if(catalog.open && catalog.dataset.loaded!=='true') {
    catalog.dataset.loaded='true';
    loadCatalog();
  }
});
