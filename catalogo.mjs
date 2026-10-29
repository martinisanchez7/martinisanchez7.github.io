const types=new Set(['aplicacion','papel-mensual','papel-anual']);
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-AR');
export class QueryError extends Error {}
export function validateCatalog(catalog){
 if(!catalog||!Array.isArray(catalog.proyectos))throw new Error('Catálogo inválido');
 const ids=new Set();
 const fields=new Set(['id','tipo','nombre','area','resumen','objetivo','entradas','funcionalidad','salidas','tecnologias','estado','limitaciones','participacion','ahorro','publicacion']);
 for(const p of catalog.proyectos){
  for(const key of Object.keys(p))if(!fields.has(key))throw new Error('Campo no admitido en el catálogo seleccionado');
  if(Object.keys(p).length!==fields.size)throw new Error('Ficha incompleta');
  for(const key of fields)if(!['tecnologias','ahorro'].includes(key)&&typeof p[key]!=='string')throw new Error('Texto inválido');
  if(!Array.isArray(p.tecnologias)||!p.tecnologias.every(t=>typeof t==='string')||p.publicacion!=='borrador')throw new Error('Ficha inválida');
  if(!/^[a-z0-9-]+$/.test(p.id)||ids.has(p.id)||!types.has(p.tipo))throw new Error('Entrada inválida');
  ids.add(p.id);
  if(p.ahorro?.estado!=='pendiente'||p.ahorro.horasMensuales!==null)throw new Error('La versión inicial requiere ahorro pendiente');
 }
 return catalog;
}
export function selectProjects(catalog,params){
 const allowed=new Set(['q','tipo','area','offset','limit']);
 for(const key of params.keys())if(!allowed.has(key)||params.getAll(key).length!==1)throw new QueryError('Filtro desconocido o repetido.');
 const q=(params.get('q')||'').trim();
 const type=params.get('tipo')||'';
 const area=params.get('area')||'';
 if(q.length>120||area.length>80)throw new QueryError('El texto de búsqueda es demasiado largo.');
 if(type&&!types.has(type))throw new QueryError('Tipo de proyecto inválido.');
 const number=(name,initial,max)=>{
  const raw=params.get(name);
  if(raw===null)return initial;
  if(!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))||Number(raw)>max)throw new QueryError('Paginación inválida.');
  return Number(raw);
 };
 const offset=number('offset',0,10000),limit=number('limit',24,100);
 if(limit<1)throw new QueryError('El límite debe ser al menos uno.');
 const term=normalize(q);
 const filtered=catalog.proyectos.filter(p=>(!type||p.tipo===type)&&(!area||p.area===area)&&(!term||normalize([p.nombre,p.objetivo,p.resumen,...p.tecnologias].join(' ')).includes(term)));
 return {data:filtered.slice(offset,offset+limit),meta:{total:filtered.length,offset,limit,fecha:catalog.fecha,publicacion:'borrador'}};
}
export function catalogSummary(catalog){
 return {fecha:catalog.fecha,estado:catalog.estado,aviso:catalog.aviso,total:catalog.proyectos.length,tipos:[...types].map(tipo=>({tipo,total:catalog.proyectos.filter(p=>p.tipo===tipo).length})),areas:[...new Set(catalog.proyectos.map(p=>p.area))].sort((a,b)=>a.localeCompare(b,'es'))};
}

