import { download, plain } from './fuentes.mjs';

const official = /^https:\/\/www\.boletinoficial\.gob\.ar\/detalleAviso\/primera\/(\d{1,12})\/(\d{8})$/;
const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const datePattern = '(\\d{1,2}) de (' + months.join('|') + ') de (\\d{4})';
const norm = value => value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const amountPattern = /\(\$\s*((?:\d{1,3}(?:\.\d{3})+|\d{1,6}),\d{2})\)/g;
const bootstrap = {
  id:'bora-349684',sourceId:'boletin-oficial',category:'laboral',date:'2026-10-28',
  title:'ADMINISTRACIÓN NACIONAL DE LA SEGURIDAD SOCIAL · Resolución 304/2026',
  url:'https://www.boletinoficial.gob.ar/detalleAviso/primera/349684/20261028'
};

function readDate(value) {
  const match = value.match(new RegExp('^'+datePattern+'$'));
  if (!match) return;
  const [,day,month,year] = match;
  const iso = year+'-'+String(months.indexOf(month)+1).padStart(2,'0')+'-'+day.padStart(2,'0');
  const parsed = new Date(iso+'T00:00:00Z');
  if (Number.isFinite(+parsed) && parsed.toISOString().slice(0,10)===iso) return {iso,label:value};
}

function officialAlert(item) {
  const match = official.exec(item.url);
  return item.sourceId==='boletin-oficial' && match && item.id==='bora-'+match[1]
    && match[2]===item.date.replaceAll('-','');
}

function srt(text, articles) {
  if (!/superintendencia de riesgos del trabajo/.test(text) || !/articulo 32.{0,60}ley n[°º ]*24\.557/.test(text)) return;
  const amount = articles[1]?.match(/\$\s*((?:\d{1,3}(?:\.\d{3})+|\d{1,6}),\d{2})\s*\) el importe que surge de aplicar la equivalencia/);
  const effective = articles[2]?.match(new RegExp('a partir del ('+datePattern+')'));
  if (!amount || !effective || Object.keys(articles).length!==3 || !articles[1].includes('decreto n° 1.694')) return;
  const date = readDate(effective[1]);
  if (!date || !articles[3].startsWith('comuniquese')) return;
  return {
    title:'Riesgos del trabajo: valor de referencia para multas',
    summary:'La SRT fijó en $ '+amount[1]+' la unidad de referencia aplicable desde el '+date.label+'.',
    whatChanged:'La equivalencia del artículo 15 del Decreto 1694/2009 quedó en $ '+amount[1]+'.',
    who:'ART, empleadores autoasegurados y compañías de seguros de retiro sujetos al artículo 32.1 de la Ley 24.557.',
    when:'Los efectos aplican desde el '+date.label+'.',
    action:'Para revisar una multa, cotejá el período y la cantidad de unidades que fija el acto sancionatorio.',
    limits:'El importe corresponde a una unidad de referencia. El expediente determina el importe de cada multa.',
    scope:'Argentina · riesgos del trabajo'
  };
}

function ganancias(text, articles) {
  if (!/agencia de recaudacion y control aduanero/.test(text) || !articles[1]?.includes('personas humanas y sucesiones indivisas')) return;
  const year = articles[1].match(/impuesto a las ganancias correspondientes al periodo fiscal (20\d{2})/);
  const deadlines = articles[1].match(new RegExp('vencimiento de presentacion vencimiento de pago ('+datePattern+') ('+datePattern+')'));
  const characterization = articles[2]?.match(new RegExp('al dia ('+datePattern+').{0,40}por la expresion.{0,16}al dia ('+datePattern+')'));
  if (!year || !deadlines || !characterization || Object.keys(articles).length!==4 || !articles[4].startsWith('comuniquese')) return;
  if (!articles[2].includes('5.902') || !articles[3].includes('vigencia el dia de su publicacion')) return;
  if (!articles[1].includes('regimen general') || !articles[1].includes('declaracion jurada simplificada') || !articles[1].includes('5.692')) return;
  const filing = readDate(deadlines[1]);
  const payment = readDate(deadlines[5]);
  const taxpayer = readDate(characterization[5]);
  if (!filing || !payment || !taxpayer || payment.iso>filing.iso || taxpayer.iso<filing.iso) return;
  return {
    title:'Ganancias '+year[1]+': fechas de presentación y pago',
    summary:'La presentación vence el '+filing.label+'. El vencimiento del saldo es el '+payment.label+'.',
    whatChanged:'La resolución fija el '+filing.label+' para presentar la declaración y el '+payment.label+' para el saldo. La caracterización de Pequeño Contribuyente pasa al '+taxpayer.label+'.',
    who:'Personas humanas y sucesiones indivisas comprendidas por la RG 5692 en el régimen general o simplificado.',
    when:'Rige desde su publicación y aplica al período fiscal '+year[1]+'.',
    action:'Revisá por separado el vencimiento de presentación y el saldo. Si hubo demora en el pago, verificá los intereses aplicables.',
    limits:'La ficha corresponde a Ganancias. Para otros impuestos o para adherir al régimen simplificado aplican sus propias condiciones.',
    scope:'Argentina · Ganancias'
  };
}

function haberes(text, articles) {
  if (!text.includes('administracion nacional de la seguridad social') || Object.keys(articles).length!==8) return;
  const fields = [
    [1,'haber minimo garantizado',['Haber mínimo']],
    [2,'haber maximo',['Haber máximo']],
    [3,'bases imponibles minima y maxima',['Base imponible mínima','Base imponible máxima']],
    [4,'prestacion basica universal',['Prestación Básica Universal']],
    [5,'pension universal para el adulto mayor',['Pensión Universal para el Adulto Mayor']]
  ];
  const period = articles[1]?.match(new RegExp('mes de (('+months.join('|')+') de 20\\d{2})'))?.[1];
  if (!period || !articles[6]?.includes('indices de actualizacion aprobados') || !articles[8]?.startsWith('comuniquese')) return;
  const rows = [];
  for (const [number,phrase,labels] of fields) {
    const article = articles[number];
    if (!article?.includes(phrase) || !article.includes(period)) return;
    const amounts = [...article.matchAll(amountPattern)].map(match=>match[1]);
    if (amounts.length!==labels.length) return;
    rows.push(...labels.map((label,index)=>[label,'$ '+amounts[index]]));
  }
  const dates = [...articles[6].matchAll(new RegExp('a partir del ('+datePattern.replace('(\\d{1,2})','(\\d{1,2})°?')+')','g'))]
    .map(match=>readDate(match[1].replace('°','')));
  if (dates.length!==2 || dates.some(date=>!date)) return;
  return {
    title:'ANSES: haberes y bases imponibles de '+period,
    summary:'El haber mínimo es de '+rows[0][1]+' y el máximo, de '+rows[1][1]+'. La resolución actualiza las bases imponibles, la PBU y la PUAM.',
    whatChanged:'Se fijan los valores del cuadro para el haber mínimo y máximo, los límites de la remuneración imponible, la PBU y la PUAM.',
    who:'Titulares y afiliados del SIPA. Las bases imponibles también se usan en la liquidación de aportes previsionales.',
    when:'Los valores corresponden a '+period+'.',
    action:'Usá las bases del período devengado. Para actualizar remuneraciones al calcular la prestación, el artículo 6 remite a los índices de la Subsecretaría de Seguridad Social.',
    limits:'Los índices del artículo 6 alcanzan a quienes cesan desde el '+dates[0].label+' y a quienes continúan en actividad bajo la compatibilidad del artículo 34 y solicitan la prestación desde el '+dates[1].label+'.',
    scope:'Argentina · seguridad social',
    tables:[{caption:'Importes para '+period,columns:['Concepto','Importe'],rows}]
  };
}

export function extractSummary(item, html, checkedAt) {
  if (!officialAlert(item)) return;
  const start = html.search(/\bid=["']cuerpoDetalleAviso["']/i);
  if (start<0) return;
  const content = plain(html.slice(start,start+50_000)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' '),35_000);
  // The publication marker delimits the signed notice and excludes related news.
  const marker = /\be\.\s+(\d{2}\/\d{2}\/\d{4})\s+n[°º]\s*\d+\/\d{2}/i.exec(content);
  if (!marker || marker[1]!==item.date.split('-').reverse().join('/')) return;
  const text = norm(content.slice(0,marker.index));
  if (/\brectifica(?:se|cion)\b/.test(text)) return;
  const parts = text.split(/(?<![“"«])\barticulo\s+(\d{1,2})\s*[°º]?\s*\.\s*[-–—]\s*/);
  const articles = {};
  for (let i=1;i<parts.length;i+=2) {
    if (articles[parts[i]]) return;
    articles[parts[i]]=parts[i+1].trim();
  }
  const hasAnnex = /\banexos?\b/.test(text);
  const hasOwnAnnex = /\banexos?\b/.test(Object.values(articles).filter(article=>!article.includes('forma parte integrante de la referida disposicion')).join(' '));
  const parsed = item.category==='laboral'
    ? (!hasAnnex && srt(text,articles)) || (!hasOwnAnnex && haberes(text,articles))
    : !hasAnnex && ganancias(text,articles);
  if (!parsed) return;
  const {title,summary,tables,...brief} = parsed;
  return {
    id:'sintesis-'+item.id,title,summary,category:item.category,date:item.date,url:item.url,
    source:'Boletín Oficial',sourceId:'boletin-oficial',mode:'sintesis',
    brief:{...brief,checkedAt},alertUrls:[item.url],...(tables?{tables}:{})
  };
}

export async function compileSummaries(items, previous=[], now=Date.now(), fetcher=fetch) {
  const date = new Date(now).toISOString().slice(0,10);
  const byUrl = new Map(previous.filter(item=>item.mode==='sintesis' && official.test(item.url)).map(item=>[item.url,item]));
  const candidates = new Map([bootstrap,...items].map(item=>[item.url,item]));
  const attempted = [...candidates.values()].filter(item=>officialAlert(item)
    && /^(?:ADMINISTRACIÓN NACIONAL DE LA SEGURIDAD SOCIAL · Resolución |SUPERINTENDENCIA DE RIESGOS DEL TRABAJO · Resolución |AGENCIA DE RECAUDACIÓN Y CONTROL ADUANERO · Resolución General )/u.test(item.title)
    && item.date<=date && now-Date.parse(item.date)<45*86400000)
    .sort((a,b)=>Number(byUrl.has(a.url))-Number(byUrl.has(b.url)))
    .slice(0,3);
  let errors=0;
  for (const item of attempted) {
    try {
      const html = await download(fetcher,{url:item.url,accept:'text/html',type:/^text\/html\b/i});
      const summary = extractSummary(item,html,date);
      if (summary) byUrl.set(item.url,summary);
      else byUrl.delete(item.url);
    } catch { errors++; }
  }
  const summaries = [...byUrl.values()].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,100);
  return {summaries,status:{attempted:attempted.length,errors,count:summaries.length}};
}
