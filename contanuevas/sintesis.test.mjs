import test from 'node:test';
import assert from 'node:assert/strict';
import { extractSummary } from './sintesis.mjs';
import { serveApi } from './api.mjs';

const alert = {
  id:'bora-123',sourceId:'boletin-oficial',source:'Boletín Oficial',
  title:'SUPERINTENDENCIA DE RIESGOS DEL TRABAJO · Resolución 58/2026',
  summary:'Aviso oficial',category:'laboral',date:'2026-11-06',mode:'automatico',
  url:'https://www.boletinoficial.gob.ar/detalleAviso/primera/123/20261106'
};
const doc = `<div id="cuerpoDetalleAviso">
<p>SUPERINTENDENCIA DE RIESGOS DEL TRABAJO</p><p>Artículo 32, apartado 1, de la Ley N° 24.557.</p>
<p>ARTÍCULO 1°.- Fíjase ($ 97.714,86) el importe que surge de aplicar la equivalencia del Decreto N° 1.694.</p>
<p>ARTÍCULO 2°.- Será aplicable a partir del 1 de noviembre de 2026.</p>
<p>ARTÍCULO 3°.- Comuníquese.</p><p>e. 06/11/2026 N° 83394/26</p></div>`;

test('La síntesis exige aviso oficial, cuerpo completo y fecha válida',()=>{
  const summary=extractSummary(alert,doc,'2026-11-11');
  assert.match(summary.summary,/97\.714,86/);
  assert.equal(summary.brief.checkedAt,'2026-11-11');
  assert.equal(extractSummary({...alert,url:'https://www.boletinoficial.gob.ar.example.org/detalleAviso/primera/123/20261106'},doc,'2026-11-11'),undefined);
  assert.equal(extractSummary(alert,doc.replace('1 de noviembre','31 de noviembre'),'2026-11-11'),undefined);
  assert.equal(extractSummary(alert,doc.replace('Será aplicable','Según el Anexo I será aplicable'),'2026-11-11'),undefined);
  assert.equal(extractSummary(alert,doc.replace('e. 06/11/2026','e. 05/11/2026'),'2026-11-11'),undefined);
});

test('La alerta enlaza a la síntesis y el resumen queda identificado como automático',()=>{
  const synthesis=extractSummary(alert,doc,'2026-11-11');
  const get=path=>serveApi(new URL('https://test.invalid'+path),(status,body)=>({status,body}),{mode:'archivo'},[alert],0,[synthesis]).body;
  const item=get('/api/v1/novedades/'+alert.id);
  assert.equal(item.summaryId,synthesis.id);
  assert.equal(get('/api/v1/novedades/'+item.summaryId).verification,'extraccion');
  assert.equal(get('/api/v1/novedades?modo=resumen&q='+synthesis.id).total,1);
  assert.equal(get('/api/v1/novedades?modo=editorial&q='+synthesis.id).total,0);
});
