export const perfiles = Object.freeze({
  impuestos:'Impuestos', payroll:'Payroll', contabilidad:'Contabilidad', auditoria:'Auditoría',
  finanzas:'Finanzas', 'precios-transferencia':'Precios de Transferencia', otros:'Otros'
});
export const provincias = Object.freeze({
  'buenos-aires':'Buenos Aires (provincia)', catamarca:'Catamarca', chaco:'Chaco', chubut:'Chubut',
  cordoba:'Córdoba', corrientes:'Corrientes', 'entre-rios':'Entre Ríos', formosa:'Formosa',
  jujuy:'Jujuy', 'la-pampa':'La Pampa', 'la-rioja':'La Rioja', mendoza:'Mendoza', misiones:'Misiones',
  neuquen:'Neuquén', 'rio-negro':'Río Negro', salta:'Salta', 'san-juan':'San Juan', 'san-luis':'San Luis',
  'santa-cruz':'Santa Cruz', 'santa-fe':'Santa Fe', 'santiago-del-estero':'Santiago del Estero',
  'tierra-del-fuego':'Tierra del Fuego', tucuman:'Tucumán'
});
export const jurisdicciones = Object.freeze({
  nacional:'Nacional', caba:'CABA', interjurisdiccional:'Convenio Multilateral y alcance interjurisdiccional',
  internacional:'Internacional', ...provincias, 'sin-clasificar':'Alcance pendiente de confirmar'
});
export const ambitos = Object.freeze({provincial:'Todas las provincias', ...jurisdicciones});

export function coincideJurisdiccion(card, filtro) {
  return !filtro || (filtro==='provincial'
    ? card.jurisdictions.some(code=>Object.hasOwn(provincias,code))
    : card.jurisdictions.includes(filtro));
}

export function cargarOpciones(select, opciones) {
  for(const [value,label] of Object.entries(opciones)) select.add(new Option(label,value));
}
