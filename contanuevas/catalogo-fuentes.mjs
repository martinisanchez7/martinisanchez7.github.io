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
  ['boletin-caba','Boletín Oficial de CABA','https://api-restboletinoficial.buenosaires.gob.ar/obtenerBoletin/0/true','oficial','Sumario oficial y textos de normas de la Ciudad','automatico'],
  ['comarb-gaceta','Comisión Arbitral · Gaceta Tributaria Provincial','https://www.ca.gob.ar/servicios/gacetilla-tributaria-provincial','oficial','Relevamiento mensual con enlaces a normas por provincia','manual'],
  ['comarb-jurisdicciones','Comisión Arbitral · Organismos tributarios','https://www.ca.gob.ar/datos-jurisdicciones','oficial','Directorio de administraciones tributarias de CABA y las provincias','manual'],
  ['facpce','FACPCE','https://normasweb.facpce.org.ar/normas-huerfanas/resoluciones-tecnicas/','tecnico','Normas profesionales; verificar adopción jurisdiccional','manual'],
  ['facpce-novedades','FACPCE · Novedades','https://www.facpce.org.ar/','tecnico','Pronunciamientos, normas profesionales y gestiones fiscales','automatico','https://www.facpce.org.ar/feed/'],
  ['cpce-cordoba','Consejo de Córdoba · Contabilidad y Auditoría','https://web.cpcecba.org.ar/area/contabilidad-y-auditoria/','tecnico','Novedades contables y de auditoría. Alcance a verificar en la publicación','automatico','https://web.cpcecba.org.ar/area/contabilidad-y-auditoria/feed/'],
  ['contadores-en-red','Contadores en Red · Provincias','https://contadoresenred.forumjuridicofiscal.com.ar/category/recorrido-por-provincias/','tecnico','Titulares fiscales provinciales. Verificar el texto de la norma','automatico','https://contadoresenred.forumjuridicofiscal.com.ar/category/recorrido-por-provincias/feed/'],
  ['ater','ATER','https://www.ater.gob.ar/','oficial','Normativa tributaria y planes de pago de Entre Ríos','manual'],
  ['atp-chaco','ATP Chaco','https://atp.chaco.gob.ar/','oficial','Resoluciones y calendarios tributarios de Chaco','manual'],
  ['boletin-jujuy','Boletín Oficial de Jujuy','https://boletinoficial.jujuy.gob.ar/','oficial','Publicación de normas de Jujuy','manual'],
  ['cpcecaba','CPCECABA','https://www.consejo.org.ar/','tecnico','Adopción local, informes y herramientas profesionales','manual'],
  ['cpcecaba-auditoria','CPCECABA · Auditoría','https://www.consejo.org.ar/herramientas-profesionales/normas-profesionales/actuacion-profesional-del-contador-publico/auditoria','tecnico','Textos ordenados, resoluciones locales de adopción e informes de auditoría','manual'],
  ['facpce-auditoria','FACPCE · Auditoría','https://www.facpce.org.ar/nueva-resolucion-tecnica-n-37/','tecnico','RT 37, RT 53 y pronunciamientos CENCyA; verificar adopción local','manual'],
  ['arca-precios-transferencia','ARCA · Precios de transferencia','https://www.argentina.gob.ar/normativa/nacional/norma-430681/texto','oficial','Régimen de operaciones internacionales, documentación y anexos','manual'],
  ['santafe-api','Santa Fe · Administración Provincial de Impuestos','https://www.santafe.gov.ar/api','oficial','Calendario, tributos provinciales y trámites de Santa Fe','manual'],
  ['errepar','Errepar','https://www.errepar.com/','tecnico','Seguimiento editorial de novedades públicas y cotejo con la norma original','manual'],
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
const fuentesPorId=new Map(fuentes.map(source=>[source.id,source]));
const fuentesPorHost=new Map();
for(const source of fuentes) {
  const host=new URL(source.url).hostname;
  if(!fuentesPorHost.has(host)) fuentesPorHost.set(host,source);
}
export function fuenteDe(item) {
  if(item.sourceId) return fuentesPorId.get(item.sourceId);
  const host=URL.parse(item.url)?.hostname;
  return fuentesPorHost.get(host);
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
