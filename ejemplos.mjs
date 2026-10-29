// Casos de ejemplo con datos ficticios: validación del archivo ejemplos.json y la lógica de los
// ejemplos interactivos. Son ilustraciones de cómo trabaja cada herramienta, no las herramientas reales.
const marcas=new Set(['auto','manual','alerta','ok']);
const widgets=new Set(['reparto-horas','cuadre-sumas-saldos','anexos-tildados']);
const textoOk=s=>typeof s==='string'&&s.trim().length>0&&s.length<=600;
const celdaOk=c=>textoOk(String(c))&&(typeof c==='string'||typeof c==='number')||(c&&typeof c==='object'&&(typeof c.v==='string'||typeof c.v==='number')&&(!c.m||marcas.has(c.m)));

export function validarEjemplos(data,ids){
 if(!data||typeof data!=='object'||!data.ejemplos||typeof data.ejemplos!=='object')throw new Error('Archivo de ejemplos inválido');
 if(!textoOk(data.aviso))throw new Error('Falta el aviso de datos ficticios');
 for(const id of ids)if(!data.ejemplos[id])throw new Error('Falta el ejemplo de '+id);
 for(const [id,e] of Object.entries(data.ejemplos)){
  if(!ids.includes(id))throw new Error('Ejemplo sin ficha: '+id);
  if(!textoOk(e.cliente)||!textoOk(e.contexto)||!Array.isArray(e.pasos)||e.pasos.length<2)throw new Error('Ejemplo incompleto: '+id);
  for(const paso of e.pasos){
   if(!textoOk(paso.titulo))throw new Error('Paso sin título en '+id);
   if(paso.tipo==='tabla'){
    if(!Array.isArray(paso.columnas)||!paso.columnas.every(textoOk)||!Array.isArray(paso.filas)||!paso.filas.length)throw new Error('Tabla inválida en '+id);
    for(const fila of paso.filas)if(!Array.isArray(fila)||fila.length!==paso.columnas.length||!fila.every(celdaOk))throw new Error('Fila inválida en '+id);
   }else if(paso.tipo==='lista'){
    if(!Array.isArray(paso.items)||!paso.items.length||!paso.items.every(textoOk))throw new Error('Lista inválida en '+id);
   }else if(paso.tipo==='interactivo'){
    if(!widgets.has(paso.widget))throw new Error('Ejemplo interactivo desconocido en '+id);
   }else throw new Error('Tipo de paso desconocido en '+id);
   if(paso.nota!==undefined&&!textoOk(paso.nota))throw new Error('Nota inválida en '+id);
  }
 }
 return data;
}

// Reparto de horas (SigeSpeed): meta de 80 % facturable en cuartos de hora, siempre para el lado seguro.
const cuarto=x=>Math.round(x*4)/4;
export function calcularReparto(horasMes,noFacturables,facturables,meta=0.8){
 const total=Number(horasMes);
 if(!Number.isFinite(total)||total<=0||total>400||Math.round(total*4)!==total*4)return {ok:false,error:'Las horas del mes tienen que ser un número positivo en cuartos de hora.'};
 const minimoFacturable=Math.ceil(total*meta*4-1e-9)/4;
 const techoNoFacturable=total-minimoFacturable;
 const pedidoNoFact=noFacturables.reduce((a,p)=>a+p.horas,0);
 if(pedidoNoFact>techoNoFacturable)return {ok:false,error:`Lo no facturable pedido (${fmtHoras(pedidoNoFact)} h) supera el techo del mes (${fmtHoras(techoNoFacturable)} h). No se confirma: hay que bajar horas no facturables.`,minimoFacturable,techoNoFacturable};
 const aRepartir=total-pedidoNoFact;
 const pesos=facturables.reduce((a,p)=>a+p.peso,0);
 const lineas=facturables.map(p=>({proyecto:p.proyecto,horas:cuarto(aRepartir*p.peso/pesos),facturable:true}));
 // La diferencia de redondeo va al proyecto de mayor peso, así la suma cierra exacta.
 const mayor=lineas.reduce((m,l,i)=>facturables[i].peso>facturables[m].peso?i:m,0);
 lineas[mayor].horas=cuarto(lineas[mayor].horas+aRepartir-lineas.reduce((a,l)=>a+l.horas,0));
 const todas=[...lineas,...noFacturables.map(p=>({proyecto:p.proyecto,horas:p.horas,facturable:false}))];
 const facturadas=lineas.reduce((a,l)=>a+l.horas,0);
 return {ok:true,lineas:todas,total:todas.reduce((a,l)=>a+l.horas,0),facturadas,cargabilidad:facturadas/total,minimoFacturable,techoNoFacturable};
}
export const fmtHoras=h=>h.toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});

// Cuadre de sumas y saldos (Ganancias PJ): solo se importa si cada total coincide al centavo.
const centavos=x=>Math.round(Number(x)*100);
export function verificarCuadre(cuentas,totales){
 const problemas=[];
 const suma=rubro=>cuentas.filter(c=>c.rubro===rubro).reduce((a,c)=>a+centavos(c.saldo),0);
 for(const t of totales){
  const calculado=t.rubros.reduce((a,r)=>a+suma(r),0);
  const informado=centavos(t.informado);
  if(calculado!==informado)problemas.push({total:t.nombre,diferencia:(calculado-informado)/100});
 }
 const [activo,pasivoPN]=[totales.find(t=>t.nombre==='Total Activo'),totales.find(t=>t.nombre==='Total Pasivo + PN')];
 if(activo&&pasivoPN&&centavos(activo.informado)!==centavos(pasivoPN.informado))problemas.push({total:'Activo contra Pasivo + PN',diferencia:(centavos(activo.informado)-centavos(pasivoPN.informado))/100});
 return {importa:problemas.length===0,problemas};
}
export const fmtPesos=x=>Number(x).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2});

// Anexos tildados (Ganancias y BP PH): solo se crean los anexos de los bienes que tiene el cliente.
export const anexosDisponibles=[
 {bien:'Inmuebles en el país',anexo:'Anexo inmuebles (país)'},
 {bien:'Automotores en el país',anexo:'Anexo automotores (país)'},
 {bien:'Participaciones en sociedades',anexo:'Anexo participaciones'},
 {bien:'Créditos',anexo:'Anexo créditos'},
 {bien:'Cuentas bancarias en el país',anexo:'Anexo bancos (país)'},
 {bien:'Deudas en el país',anexo:'Anexo deudas (país)'},
 {bien:'Cuentas bancarias en el exterior',anexo:'Anexo bancos (exterior)'},
 {bien:'Deudas en el exterior',anexo:'Anexo deudas (exterior)'}
];
export function anexosACrear(tildados){
 const set=new Set(tildados);
 return anexosDisponibles.filter(a=>set.has(a.bien)).map(a=>({...a,enlazado:'Situación patrimonial'}));
}
