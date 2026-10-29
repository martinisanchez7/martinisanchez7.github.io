import {createStaticRequest} from './catalogo-estatico.mjs';
import {leerEnlace,armarEnlace} from './enlaces.mjs';
import {calcularReparto,verificarCuadre,anexosACrear,anexosDisponibles,fmtHoras,fmtPesos} from './ejemplos.mjs';
const $=id=>document.getElementById(id);
const types={'aplicacion':'Aplicación','papel-mensual':'Papel mensual','papel-anual':'Papel anual'};
// Referencia de papel de trabajo: prefijo por tipo y número según el orden del catálogo completo.
const prefixes={'aplicacion':'A','papel-mensual':'M','papel-anual':'AN'};
let tipo='',selected='',query='',listController,detailController,timer,refs=new Map(),nombres=new Map(),enlacePendiente;
const create=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
// Sitio publicado (meta modo=estatico): sin servidor; la misma búsqueda de la API corre sobre datos.json en el navegador.
const staticMode=document.querySelector('meta[name="modo"]')?.content==='estatico';
const staticRequest=createStaticRequest();
async function request(url,signal){if(staticMode)return staticRequest(url,signal);const res=await fetch(url,{signal,headers:{Accept:'application/json'}});if(!res.ok)throw new Error('No se pudo cargar');return res.json();}
const linkedin=document.querySelector('meta[name="linkedin"]')?.content||'';
if(/^https:\/\/(www\.)?linkedin\.com\/in\/[\w%-]+\/?$/.test(linkedin)){$('linkedin').href=linkedin;$('linkedin').hidden=false;}
async function loadRefs(signal){
 const {data}=await request('/api/v1/proyectos?limit=100',signal);const counts={};
 for(const p of data){counts[p.tipo]=(counts[p.tipo]||0)+1;refs.set(p.id,(prefixes[p.tipo]||'P')+'-'+String(counts[p.tipo]).padStart(2,'0'));nombres.set(p.id,p.nombre);}
 $('cifra-total').textContent=String(data.length);
 $('cifra-uso').textContent=String(data.filter(p=>p.estado==='En uso').length);
}
function setTipo(value){tipo=value;for(const b of document.querySelectorAll('[data-tipo]'))b.setAttribute('aria-pressed',String(b.dataset.tipo===value));load();}

// "Probalo en 10 segundos": una tarjeta por cada ficha cuyo ejemplo tiene un paso interactivo, en el orden del catálogo.
async function renderProbalo(){
 const box=$('casos');
 try{
  const data=await cargarEjemplos();
  const casos=[...refs.keys()].flatMap(id=>{const paso=data.ejemplos[id]?.pasos.find(p=>p.tipo==='interactivo');return paso&&widgets[paso.widget]?[[id,paso]]:[];});
  box.replaceChildren();
  for(const [id,paso] of casos){
   const card=create('article',undefined,'caso');
   const titulo=paso.titulo.replace(/^Probalo:\s*/,'');
   card.append(create('p',`${refs.get(id)} · ${nombres.get(id)}`,'caso-ref'),create('h3',titulo.replace(/^([¿¡]?)(\p{L})/u,(m,s,l)=>s+l.toUpperCase())),widgets[paso.widget]({compacto:true}));
   const link=create('a','Ver la ficha completa →','caso-link');link.href=armarEnlace(id,true);
   card.append(link);box.append(card);
  }
  $('cifra-casos').textContent=String(casos.length);
  if(!casos.length)$('probalo').hidden=true;
 }catch{box.replaceChildren(create('p','No pudimos cargar los casos. Recargá la página para volver a intentar.','placeholder'));}
}
const ref=p=>refs.get(p.id)||'—';
function renderDetail(p){
 const panel=$('detail');panel.replaceChildren();panel.dataset.projectId=p.id;panel.setAttribute('aria-busy','false');
 const header=create('dl',undefined,'paper-header');
 for(const [label,value,className] of [['Ref.',ref(p),'ref'],['Tipo',types[p.tipo]],['Área',p.area],['Estado',p.estado,p.estado==='En uso'?'':'manual']]){
  const cell=create('div',undefined,className);cell.append(create('dt',label),create('dd',value));header.append(cell);
 }
 panel.append(header,create('h2',p.nombre),create('p',p.objetivo,'detail-objective'));
 const process=create('div',undefined,'process');
 for(const [title,text,auto] of [['Qué recibe',p.entradas],['Qué hace',p.funcionalidad,true],['Qué devuelve',p.salidas]]){
  const heading=create('h3',title);if(auto)heading.prepend(create('span','','tick tick-auto'));
  const step=create('section');step.append(heading,create('p',text));process.append(step);
 }
 panel.append(process);
 const technologies=create('div',undefined,'technology-list');for(const t of p.tecnologias)technologies.append(create('span',t));panel.append(technologies);
 const status=create('section',undefined,'review-state');status.append(create('h3','Alcance'),create('p',p.limitaciones));
 panel.append(status);
 const role=create('section',undefined,'role');role.append(create('h3','Mi rol'),create('p',p.participacion));panel.append(role);
 panel.append(renderEjemploBox(p));
}

// Caso de ejemplo con datos ficticios, dentro de la ficha. Se abre a pedido y tiene su propio enlace.
let ejemplosPromise;
function cargarEjemplos(){
 if(!ejemplosPromise){
  const attempt=fetch(new URL('./ejemplos.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('No se pudo cargar');return r.json();});
  ejemplosPromise=attempt;attempt.catch(()=>{if(ejemplosPromise===attempt)ejemplosPromise=undefined;});
 }
 return ejemplosPromise;
}
function renderEjemploBox(p){
 const box=create('details',undefined,'ejemplo');box.id='ejemplo';
 box.append(create('summary','Ver cómo funciona con un cliente de ejemplo'));
 const body=create('div',undefined,'ejemplo-body');body.append(create('p','Cargando el ejemplo…','placeholder'));box.append(body);
 const share=create('div',undefined,'compartir');
 const copy=create('button','Copiar enlace a esta ficha','copiar');copy.type='button';
 const status=create('span','','copiar-estado');status.setAttribute('role','status');
 copy.addEventListener('click',async()=>{
  const url=location.origin+location.pathname+armarEnlace(p.id,box.open);
  try{await navigator.clipboard.writeText(url);status.textContent='Enlace copiado.';}catch{status.textContent=url;}
 });
 share.append(copy,status);
 box.addEventListener('toggle',async()=>{
  history.replaceState(null,'',armarEnlace(p.id,box.open));
  if(!box.open||box.dataset.cargado)return;
  try{
   const data=await cargarEjemplos();const e=data.ejemplos[p.id];
   if(!e)throw new Error('Sin ejemplo');
   body.replaceChildren(create('p',data.aviso,'ejemplo-aviso'),renderEncabezadoEjemplo(e));
   e.pasos.forEach((paso,i)=>body.append(renderPaso(paso,i+1)));
   box.dataset.cargado='1';
  }catch{body.replaceChildren(create('p','No pudimos cargar el ejemplo. Cerralo y volvé a abrirlo.','placeholder'));}
 });
 const wrap=create('div',undefined,'ejemplo-wrap');wrap.append(box,share);
 return wrap;
}
function renderEncabezadoEjemplo(e){
 const dl=create('dl',undefined,'ejemplo-cliente');
 for(const [k,v] of [['Cliente ficticio',e.cliente],['Situación',e.contexto]]){const d=create('div');d.append(create('dt',k),create('dd',v));dl.append(d);}
 return dl;
}
const etiquetaMarca={auto:'Lo hizo la herramienta',manual:'Pendiente o manual',alerta:'Requiere atención',ok:'Correcto'};
function celda(tag,c){
 const value=typeof c==='object'&&c!==null?c.v:c;const node=create(tag,String(value));
 if(c&&c.m){node.className='c-'+c.m;node.title=etiquetaMarca[c.m];}
 return node;
}
function tabla(columnas,filas){
 const wrap=create('div',undefined,'tabla-scroll');const t=create('table');
 const head=create('tr');for(const c of columnas)head.append(create('th',c));
 const thead=create('thead');thead.append(head);const tbody=create('tbody');
 for(const f of filas){const tr=create('tr');for(const c of f)tr.append(celda('td',c));tbody.append(tr);}
 t.append(thead,tbody);wrap.append(t);return wrap;
}
function renderPaso(paso,n){
 const s=create('section',undefined,'paso');
 const h=create('h4');h.append(create('span',String(n),'paso-n'),document.createTextNode(paso.titulo));s.append(h);
 if(paso.tipo==='tabla')s.append(tabla(paso.columnas,paso.filas));
 else if(paso.tipo==='lista'){const ul=create('ul');for(const i of paso.items)ul.append(create('li',i));s.append(ul);}
 else if(paso.tipo==='interactivo')s.append((widgets[paso.widget]||(()=>create('p','Ejemplo no disponible.')))());
 if(paso.nota)s.append(create('p',paso.nota,'paso-nota'));
 return s;
}
const widgets={
 'reparto-horas'(){
  const fact=[{proyecto:'Cliente A · IVA y CM03',peso:3},{proyecto:'Cliente B · DDJJ anual',peso:2},{proyecto:'Cliente C · Consultas',peso:1}];
  const nf=[{proyecto:'Capacitación',horas:8},{proyecto:'Administración interna',horas:12}];
  const box=create('div',undefined,'widget');
  const label=create('label',undefined,'campo');const input=create('input');Object.assign(input,{type:'number',min:'8',max:'400',step:'0.25',value:'176'});
  label.append(create('span','Horas requeridas del mes'),input);
  const out=create('div',undefined,'widget-resultado');out.setAttribute('aria-live','polite');
  const run=()=>{
   const r=calcularReparto(Number(input.value),nf,fact);
   if(!r.ok){out.replaceChildren(create('p',r.error,'resultado-alerta'));return;}
   out.replaceChildren(tabla(['Proyecto','Tipo','Horas'],[...r.lineas.map(l=>[l.proyecto,l.facturable?'Facturable':'No facturable',{v:fmtHoras(l.horas),m:l.facturable?'auto':'manual'}]),[{v:'Total del mes'},'—',{v:fmtHoras(r.total),m:'ok'}]]),
    create('p',`Cargabilidad ${(r.cargabilidad*100).toLocaleString('es-AR',{maximumFractionDigits:2})} % · mínimo facturable ${fmtHoras(r.minimoFacturable)} h · techo no facturable ${fmtHoras(r.techoNoFacturable)} h`,'resultado-ok'));
  };
  input.addEventListener('input',run);run();
  box.append(label,out);return box;
 },
 'cuadre-sumas-saldos'({compacto=false}={}){
  const cuentas=[
   {cuenta:'Caja y bancos',rubro:'activo',saldo:1500000},{cuenta:'Créditos por ventas',rubro:'activo',saldo:2300000},{cuenta:'Bienes de uso',rubro:'activo',saldo:4200000},
   {cuenta:'Deudas comerciales',rubro:'pasivo',saldo:1800000},{cuenta:'Deudas fiscales',rubro:'pasivo',saldo:700000},{cuenta:'Capital y resultados',rubro:'pn',saldo:5500000}
  ];
  const totales=[{nombre:'Total Activo',rubros:['activo'],informado:8000000},{nombre:'Total Pasivo + PN',rubros:['pasivo','pn'],informado:8000000}];
  const box=create('div',undefined,'widget');
  const grid=create('div',undefined,'cuentas');
  for(const c of cuentas){
   const label=create('label',undefined,'campo');const input=create('input');Object.assign(input,{type:'number',step:'0.01',value:String(c.saldo)});
   input.addEventListener('input',()=>{c.saldo=Number(input.value);run();});
   label.append(create('span',c.cuenta),input);grid.append(label);
  }
  const fijos=create('p','Totales del reporte: Total Activo $ 8.000.000,00 · Total Pasivo + PN $ 8.000.000,00','paso-nota');
  const out=create('div',undefined,'widget-resultado');out.setAttribute('aria-live','polite');
  const run=()=>{
   if(cuentas.some(c=>!Number.isFinite(c.saldo))){out.replaceChildren(create('p','Hay un saldo que no se puede leer: la importación no adivina, se detiene y pregunta.','resultado-alerta'));return;}
   const r=verificarCuadre(cuentas,totales);
   if(r.importa){
    out.replaceChildren(create('p','Todo cuadra al centavo: se importa al papel. Lo que trajo la herramienta queda en rojo.','resultado-ok'));
    if(!compacto)out.append(tabla(['Cuenta','Saldo importado'],cuentas.map(c=>[c.cuenta,{v:'$ '+fmtPesos(c.saldo),m:'auto'}])));
   }
   else out.replaceChildren(create('p','Se detiene y no escribe nada en el papel:','resultado-alerta'),tabla(['Control','Diferencia'],r.problemas.map(p=>[p.total,{v:'$ '+fmtPesos(p.diferencia),m:'alerta'}])));
  };
  run();box.append(grid,fijos,out);return box;
 },
 'anexos-tildados'(){
  const box=create('div',undefined,'widget');const fs=create('fieldset',undefined,'tildes');fs.append(create('legend','Bienes de la clienta'));
  const inicial=new Set(['Inmuebles en el país','Cuentas bancarias en el país','Cuentas bancarias en el exterior']);
  const checks=anexosDisponibles.map(a=>{const l=create('label');const c=create('input');c.type='checkbox';c.value=a.bien;c.checked=inicial.has(a.bien);l.append(c,document.createTextNode(' '+a.bien));fs.append(l);return c;});
  const btn=create('button','Crear anexos tildados','accion');btn.type='button';
  const out=create('div',undefined,'widget-resultado');out.setAttribute('aria-live','polite');
  btn.addEventListener('click',()=>{
   const r=anexosACrear(checks.filter(c=>c.checked).map(c=>c.value));
   if(!r.length){out.replaceChildren(create('p','No hay bienes tildados: no se crea ningún anexo.','resultado-alerta'));return;}
   out.replaceChildren(create('p',`Se crearon ${r.length} ${r.length===1?'anexo':'anexos'}; los demás no se agregan al papel.`,'resultado-ok'),tabla(['Anexo creado','Saldo enlazado a'],r.map(a=>[{v:a.anexo,m:'auto'},a.enlazado])));
  });
  box.append(fs,btn,out);return box;
 }
};
async function select(id,focus=false,ejemplo=false,desdeUsuario=false){
 selected=id;
 for(const button of document.querySelectorAll('.project-button'))button.setAttribute('aria-pressed',String(button.dataset.id===id));
 if(detailController)detailController.abort();detailController=new AbortController();
 $('detail').setAttribute('aria-busy','true');
 try{
  const {data}=await request('/api/v1/proyectos/'+encodeURIComponent(id),detailController.signal);if(selected!==id)return;renderDetail(data);
  if(desdeUsuario)history.replaceState(null,'',armarEnlace(id));
  const behavior=matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
  // Al ejemplo se salta sin animación: suele estar lejos (por ejemplo, desde una tarjeta de la portada).
  if(ejemplo){const box=$('ejemplo');box.open=true;box.scrollIntoView({behavior:'instant',block:'start'});}
  else if(focus&&matchMedia('(max-width: 800px)').matches)$('detail').scrollIntoView({behavior,block:'start'});
 }
 catch(e){if(e.name!=='AbortError'){$('detail').setAttribute('aria-busy','false');$('detail').replaceChildren(create('p','No pudimos cargar la ficha. Elegí el proyecto nuevamente.'));}}
}
async function load(){
 if(listController)listController.abort();listController=new AbortController();
 $('error').hidden=true;$('total').textContent='Buscando proyectos…';
 const params=new URLSearchParams({limit:'100'});if(tipo)params.set('tipo',tipo);if(query)params.set('q',query);
 try{
  if(!refs.size){
   await loadRefs(listController.signal).catch(e=>{if(e.name==='AbortError')throw e;});
   if(enlacePendiente===undefined)enlacePendiente=leerEnlace(location.hash,[...refs.keys()]);
   if(refs.size)renderProbalo();
  }
  const {data,meta}=await request('/api/v1/proyectos?'+params,listController.signal);
  $('total').textContent=meta.total+' '+(meta.total===1?'proyecto':'proyectos');
  $('project-list').replaceChildren();$('empty').hidden=meta.total!==0;
  for(const p of data){
   const button=create('button',undefined,'project-button');button.type='button';button.dataset.id=p.id;button.setAttribute('aria-pressed',String(p.id===selected));
   const name=create('span',undefined,'project-title');name.append(create('strong',p.nombre),create('small',types[p.tipo]));
   button.append(create('span',ref(p),'project-ref'),name,create('span',p.area,'project-area'));button.addEventListener('click',()=>select(p.id,true,false,true));$('project-list').append(button);
  }
  if(!data.length){selected='';if(detailController)detailController.abort();$('detail').removeAttribute('data-project-id');$('detail').setAttribute('aria-busy','false');$('detail').replaceChildren(create('p','Probá otra búsqueda para encontrar un proyecto.','placeholder'));return;}
  // Enlace directo (#id o #id/ejemplo): manda en la primera carga, si la ficha está en la lista.
  const enlace=enlacePendiente&&data.some(p=>p.id===enlacePendiente.id)?enlacePendiente:null;enlacePendiente=null;
  const current=enlace?enlace.id:data.some(p=>p.id===selected)?selected:data[0].id;
  await select(current,Boolean(enlace),Boolean(enlace?.ejemplo));
 }catch(e){if(e.name!=='AbortError'){$('error').hidden=false;$('total').textContent='Catálogo no disponible';$('project-list').replaceChildren();$('empty').hidden=true;selected='';if(detailController)detailController.abort();$('detail').removeAttribute('data-project-id');$('detail').setAttribute('aria-busy','false');$('detail').replaceChildren(create('p','Volvé a intentar para recuperar el catálogo.','placeholder'));}}
}
for(const button of document.querySelectorAll('[data-tipo]'))button.addEventListener('click',()=>setTipo(button.dataset.tipo));
$('search').addEventListener('input',()=>{clearTimeout(timer);query=$('search').value.trim();timer=setTimeout(load,180);});
$('retry').addEventListener('click',load);
// Atrás/adelante del navegador o un enlace pegado en la misma pestaña.
addEventListener('hashchange',()=>{
 const enlace=leerEnlace(location.hash,[...refs.keys()]);
 if(!enlace)return;
 if(enlace.id!==selected||enlace.ejemplo!==Boolean($('ejemplo')?.open)){
  if(!document.querySelector(`.project-button[data-id="${enlace.id}"]`)){tipo='';query='';$('search').value='';for(const b of document.querySelectorAll('[data-tipo]'))b.setAttribute('aria-pressed',String(!b.dataset.tipo));enlacePendiente=enlace;load();return;}
  select(enlace.id,true,enlace.ejemplo);
 }
});
$('clear').addEventListener('click',()=>{tipo='';query='';$('search').value='';for(const b of document.querySelectorAll('[data-tipo]'))b.setAttribute('aria-pressed',String(!b.dataset.tipo));load();});
load();

