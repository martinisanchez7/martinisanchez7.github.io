// Respaldo documental, no una puntuación de veracidad del medio.
export const fuentes = [
  ['boletin-oficial','Boletín Oficial','https://www.boletinoficial.gob.ar/seccion/primera','oficial','Normas publicadas y anexos','automatico'],
  ['infoleg','Infoleg','https://www.argentina.gob.ar/normativa','oficial','Texto original y actualizado; verificar modificaciones','manual'],
  ['arca','ARCA','https://www.argentina.gob.ar/arca/noticias','oficial','Novedades tributarias y operativas; cotejar reglamentación','manual'],
  ['arca-biblioteca','ARCA · Biblioteca','https://biblioteca.arca.gob.ar/','oficial','Resoluciones, dictámenes y normativa tributaria','manual'],
  ['trabajo','Secretaría de Trabajo','https://www.argentina.gob.ar/trabajo','oficial','Salarios, convenios colectivos y casas particulares','manual'],
  ['anses','ANSES','https://www.anses.gob.ar/','oficial','Seguridad social y prestaciones','manual'],
  ['srt','SRT','https://www.argentina.gob.ar/srt','oficial','Riesgos del trabajo y ART','manual'],
  ['comarb','Comisión Arbitral','https://www.ca.gob.ar/','oficial','Convenio Multilateral y sistemas de recaudación','manual'],
  ['arba','ARBA','https://www.arba.gov.ar/','oficial','Tributos de provincia de Buenos Aires','manual'],
  ['agip','AGIP','https://www.agip.gob.ar/','oficial','Tributos de CABA','manual'],
  ['facpce','FACPCE','https://normasweb.facpce.org.ar/normas-huerfanas/resoluciones-tecnicas/','tecnico','Normas profesionales; verificar adopción jurisdiccional','manual'],
  ['cpcecaba','CPCECABA','https://www.consejo.org.ar/','tecnico','Adopción local, informes y herramientas profesionales','manual'],
  ['errepar','Errepar','https://www.errepar.com/','tecnico','Doctrina, legislación y jurisprudencia; sin acceso automatizado habilitado','manual'],
  ['iprofesional-impuestos','iProfesional · Impuestos','https://www.iprofesional.com/impuestos','periodistico','Alertas tributarias y contexto; pendiente de cotejo oficial','automatico','https://www.iprofesional.com/rss/impuestos'],
  ['iprofesional-legales','iProfesional · Legales','https://www.iprofesional.com/legales','periodistico','Selección laboral y tributaria por tema','automatico','https://www.iprofesional.com/rss/legales'],
  ['ambito-fiscal','Ámbito · Novedades Fiscales','https://www.ambito.com/','periodistico','Actualidad fiscal; puede rechazar consultas automáticas','automatico','https://www.ambito.com/rss/pages/novedades-fiscales.xml'],
  ['ambito-finanzas','Ámbito · Finanzas','https://www.ambito.com/finanzas','periodistico','Mercados y finanzas; puede rechazar consultas automáticas','automatico','https://www.ambito.com/rss/pages/finanzas.xml'],
  ['perfil-economia','Perfil · Economía','https://www.perfil.com/seccion/economia','periodistico','Economía y actualidad; pendiente de cotejo oficial','automatico','https://www.perfil.com/feed/economia'],
  ['bcra','BCRA','https://www.bcra.gob.ar/Noticias/','oficial','Comunicaciones monetarias, cambiarias y financieras','manual'],
  ['cnv','CNV','https://www.argentina.gob.ar/cnv','oficial','Regulación del mercado de capitales','manual'],
  ['indec','INDEC','https://www.indec.gob.ar/','oficial','Índices, inflación y actividad; distinguir publicación y período','manual'],
  ['reserva-federal','Reserva Federal (EE. UU.)','https://www.federalreserve.gov/newsevents/pressreleases.htm','oficial','Comunicados oficiales; no recomendaciones de inversión','automatico'],
  ['bce','Banco Central Europeo','https://www.ecb.europa.eu/','oficial','Política monetaria internacional','manual'],
  ['bls','BLS (EE. UU.)','https://www.bls.gov/','oficial','Empleo e inflación de Estados Unidos','manual'],
].map(([id,name,url,tier,role,connection,feed])=>({id,name,url,tier,role,connection,...(feed?{feed}:{})}));

export const niveles={oficial:'Fuente oficial',tecnico:'Referencia técnica',periodistico:'Cobertura periodística'};
export function fuenteDe(item) {
  if(item.sourceId) return fuentes.find(s=>s.id===item.sourceId);
  let host; try{host=new URL(item.url).hostname;}catch{return;}
  return fuentes.find(s=>new URL(s.url).hostname===host);
}
export function valorar(item) {
  const source=fuenteDe(item);
  const text=`${item.title} ${item.mode==='automatico'?'':item.summary}`.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
  const high=/\b(vencimientos?|prorroga|escalas? salariales?|salario minimo|casas particulares|monotributo|alicuotas?|retenciones?|moratoria|reforma laboral)\b/.test(text);
  const reviewedPriority=item.mode==='editorial' && item.importance && item.importanceReason;
  return {
    ...item,
    sourceId:source?.id??null,
    sourceTier:source?.tier??'sin-clasificar',
    verification:item.mode==='editorial'?'revisada':item.mode==='sintesis'?'extraccion':item.mode==='archivo'?'historica':'pendiente',
    importance:reviewedPriority?item.importance:high?'alta':'seguimiento',
    importanceReason:reviewedPriority?item.importanceReason:high?'Tema que puede modificar obligaciones, importes o plazos.':'Seguimiento temático.',
    importanceMethod:reviewedPriority?'revision-editorial':'reglas-tematicas-v1'
  };
}
