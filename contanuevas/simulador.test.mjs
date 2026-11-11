import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateReceipt } from './simulador.js';
import { editoriales } from './datos.mjs';

const scales = editoriales.find(item=>item.id==='casas-particulares-noviembre-2026').tables;
const input = {category:'Tareas generales',overnight:false,pay:'mes',hours:40,years:0,zone:false};

test('Usa la escala rectificada de cada mes y aplica la antigüedad sobre básico más zona',()=>{
  assert.equal(estimateReceipt({...input,scale:scales[0]}).total,51163937);
  assert.equal(estimateReceipt({...input,scale:scales[1]}).total,51982560);
  assert.deepEqual(estimateReceipt({...input,scale:scales[0],pay:'hora',hours:40,zone:true,years:3}),{
    base:16682080,zoneBonus:5171445,seniority:655606,total:22509131
  });
});

test('Impide liquidar caseros con retiro o usar horas y antigüedad inválidas',()=>{
  const scale=scales[0];
  assert.equal(estimateReceipt({...input,scale,category:'Caseros'}),undefined);
  assert.equal(estimateReceipt({...input,scale,category:'Caseros',overnight:true}).base,56228409);
  assert.equal(estimateReceipt({...input,scale,pay:'hora',hours:-1}),undefined);
  assert.equal(estimateReceipt({...input,scale,years:1.5}),undefined);
});
