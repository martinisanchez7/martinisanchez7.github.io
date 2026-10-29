// Comparte la descarga de datos sin atarla a los cambios de filtro.
export function createStaticRequest({
 loadSearch=()=>import('./catalogo.mjs'),
 fetchCatalog=()=>fetch(new URL('./datos.json',import.meta.url)).then(response=>{
  if(!response.ok)throw new Error('No se pudo cargar');
  return response.json();
 }),
 origin=()=>location.origin
}={}){
 let sharedData;
 function getData(){
  if(!sharedData){
   const attempt=Promise.all([loadSearch(),fetchCatalog()]);
   sharedData=attempt;
   attempt.catch(()=>{if(sharedData===attempt)sharedData=undefined;});
  }
  return sharedData;
 }
 function waitForData(promise,signal){
  if(!signal)return promise;
  return new Promise((resolve,reject)=>{
   const cancel=()=>{cleanup();reject(new DOMException('Consulta cancelada','AbortError'));};
   const cleanup=()=>signal.removeEventListener('abort',cancel);
   signal.addEventListener('abort',cancel,{once:true});
   promise.then(value=>{cleanup();resolve(value);},error=>{cleanup();reject(error);});
   if(signal.aborted)cancel();
  });
 }
 return async function staticRequest(url,signal){
  if(signal?.aborted)throw new DOMException('Consulta cancelada','AbortError');
  const [{selectProjects},catalog]=await waitForData(getData(),signal);
  if(signal?.aborted)throw new DOMException('Consulta cancelada','AbortError');
  const parsed=new URL(url,origin());
  if(parsed.pathname==='/api/v1/proyectos')return selectProjects(catalog,parsed.searchParams);
  const found=catalog.proyectos.find(p=>'/api/v1/proyectos/'+p.id===parsed.pathname);
  if(!found)throw new Error('No se pudo cargar');
  return {data:found};
 };
}

