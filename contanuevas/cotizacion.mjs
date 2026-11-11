import { download } from './fuentes.mjs';

export const paginaBcra='https://www.bcra.gob.ar/cierre-de-cotizaciones-resultado/?category=2';
const fuente={
  url:'https://www.bcra.gob.ar/api/endpoints/cierre-de-cotizaciones.php?category=2',
  accept:'application/json',type:/^application\/json\b/i
};
const key='cierre-usd-bcra-v1';
const argentina=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'});
// Últimos dos cierres cotejados con la serie del BCRA antes de publicar.
const referencia={
  fecha:'2026-11-05',comprador:1518.391,vendedor:1571.838,
  anterior:{fecha:'2026-11-04',comprador:1519.674,vendedor:1571.4}
};

function filaValida(fila,hasta) {
  const {fecha_iso:fecha,comprador,vendedor}=fila??{};
  if(typeof fecha!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
    || new Date(fecha).toJSON()?.slice(0,10)!==fecha || fecha>hasta
    || !Number.isFinite(comprador) || !Number.isFinite(vendedor) || comprador<=0 || vendedor<comprador) return;
  return {fecha,comprador,vendedor};
}

export function parseCierres(text,now=Date.now()) {
  const {success,data}=JSON.parse(text);
  if(success!==true || data?.codigo!=='DOLAR' || !Array.isArray(data.filas)) throw Error('Serie de cierre inválida');
  const hasta=argentina.format(now);
  let actual,anterior;
  for(const raw of data.filas) {
    const fila=filaValida(raw,hasta);
    if(!fila || fila.fecha===actual?.fecha) continue;
    if(!actual || fila.fecha>actual.fecha) {
      anterior=actual;
      actual=fila;
    } else if(!anterior || fila.fecha>anterior.fecha) anterior=fila;
  }
  if(!actual) throw Error('Serie de cierre sin observaciones');
  return {...actual,anterior:anterior??null};
}

export async function actualizarCierre(kv,now=Date.now(),fetcher=fetch) {
  const guardado=await kv.get(key,'json');
  if(guardado?.fecha===argentina.format(now)) return;
  const cierre=parseCierres(await download(fetcher,fuente),now);
  if(cierre.fecha<(guardado?.fecha??referencia.fecha)) return;
  if(JSON.stringify(cierre)!==JSON.stringify(guardado)) await kv.put(key,JSON.stringify(cierre));
}

export async function ultimoCierre(kv,now=Date.now()) {
  const saved=await kv?.get(key,'json').catch(()=>null);
  const cierre=saved??referencia;
  return {...cierre,moneda:'USD',unidad:'ARS por USD',fuente:'BCRA',
    url:paginaBcra,rezagado:now-Date.parse(cierre.fecha)>7*86_400_000};
}
