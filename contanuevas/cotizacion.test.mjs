import test from 'node:test';
import assert from 'node:assert/strict';
import { actualizarCierre, parseCierres, ultimoCierre } from './cotizacion.mjs';

const now=Date.parse('2026-11-11T19:00:00Z');
const row=(fecha_iso,comprador=1518.391,vendedor=1571.838)=>({fecha_iso,comprador,vendedor});
const serie=filas=>JSON.stringify({success:true,data:{codigo:'DOLAR',filas}});
const respuesta=filas=>async()=>new Response(serie(filas),{headers:{'Content-Type':'application/json'}});

test('Cierre BCRA ordena fechas y descarta valores inválidos o futuros',()=>{
  const actual=parseCierres(serie([row('2026-11-05'),row('2026-11-20'),row('2026-11-06',99,80),
    row('2026-11-04',1519.674,1571.4),row('2026-11-02')]),now);
  assert.equal(actual.fecha,'2026-11-05');
  assert.equal(actual.anterior.fecha,'2026-11-04');
  assert.equal(actual.vendedor,1571.838);
  assert.throws(()=>parseCierres(serie([row('2026-11-31')]),now),/sin observaciones/);
});

test('Cierre BCRA conserva el último dato validado ante un dato anterior o un fallo',async()=>{
  let snapshot;
  const kv={get:async()=>snapshot,put:async(_,value)=>{snapshot=JSON.parse(value);}};
  await actualizarCierre(kv,now,respuesta([row('2026-11-10',1518,1570)]));
  await actualizarCierre(kv,now,respuesta([row('2026-11-05')]));
  await assert.rejects(actualizarCierre(kv,now,async()=>new Response('Sin servicio',{status:503})));
  assert.equal((await ultimoCierre(kv,now)).fecha,'2026-11-10');
});
