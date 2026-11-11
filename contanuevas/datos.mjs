import { ampliacionNoviembre } from './novedades-noviembre.mjs';

export const categorias = ['impositivo', 'contable', 'laboral', 'internacional', 'economia'];
export const editoriales = [
  ...ampliacionNoviembre,
  {
    id:'caba-agip-atencion-11-noviembre-2026',category:'impositivo',jurisdictions:['caba'],
    date:'2026-11-11',title:'CABA: sin atención presencial de AGIP en la sede del Consejo el 11 de noviembre',
    summary:'El Consejo de CABA informó que su oficina de AGIP no atenderá al público el 11 de noviembre por el Día del Empleado Municipal.',
    source:'Consejo Profesional de Ciencias Económicas de CABA',
    url:'https://www.consejo.org.ar/servicios/oficinas-gubernamentales',mode:'editorial',
    brief:{whatChanged:'La oficina de AGIP en la sede del Consejo suspende la atención al público ese día.',
      who:'Quienes tenían previsto hacer un trámite presencial en esa sede.',
      when:'Miércoles 11 de noviembre de 2026.',
      action:'Para un trámite con plazo, consultá el calendario oficial de AGIP y el canal digital del trámite. El aviso del Consejo se refiere a atención presencial.',
      reviewedAt:'2026-11-11',scope:'Atención presencial en CABA'},
    references:[{label:'Calendario tributario de AGIP',url:'https://www.agip.gob.ar/vencimientos/'}]
  },
  {
    id:'caba-agip-339-transparencia-fiscal',category:'impositivo',jurisdictions:['caba'],
    date:'2026-09-08',title:'CABA: hasta el 1 de enero de 2027 para adaptar los comprobantes de Ingresos Brutos',
    summary:'La Resolución AGIP 339/2026 prorrogó hasta el 1 de enero de 2027 el plazo para adecuar sistemas y discriminar la incidencia de Ingresos Brutos en comprobantes a consumidores finales.',
    source:'Boletín Oficial de CABA · Resolución AGIP 339/2026',
    url:'https://boletinoficial.buenosaires.gob.ar/normativaba/norma/875535',mode:'editorial',
    brief:{whatChanged:'La fecha límite para adaptar los sistemas pasa del 30 de septiembre de 2026 al 1 de enero de 2027.',
      who:'Contribuyentes y responsables alcanzados por la Resolución AGIP 169/2026 para operaciones a consumidores finales en CABA.',
      when:'La prórroga se publicó el 8 de septiembre de 2026.',
      action:'Revisá cómo se muestra el impuesto en los comprobantes que emite tu sistema según la Resolución 169 y sus modificatorias.',
      reviewedAt:'2026-11-11',scope:'Ingresos Brutos · CABA'},
    references:[{label:'Resolución AGIP 169/2026 y normas relacionadas',url:'https://boletinoficial.buenosaires.gob.ar/normativaba/norma/851654'}]
  },
  {
    id:'comarb-11-vencimientos-noviembre-2026',category:'impositivo',jurisdictions:['interjurisdiccional'],
    date:'2026-10-19',title:'Convenio Multilateral: nuevos vencimientos de SIFERE, SIRCAR y SIRTAC',
    summary:'El anticipo de octubre por SIFERE vence del 17 al 20 de noviembre según CUIT. Los vencimientos alcanzados de SIRCAR y SIRTAC se trasladaron al 13 de noviembre.',
    source:'Comisión Arbitral · RG 11/2026',url:'https://www.ca.gob.ar/descargas/sifere/vencimientos/2026-11.pdf',mode:'editorial',
    brief:{whatChanged:'SIRCAR pasa del 9 o 10 al 13 de noviembre y SIRTAC pasa del 9 al 13, en ambos casos para la segunda quincena de octubre.',
      who:'Agentes alcanzados de SIRCAR y SIRTAC, y contribuyentes de Convenio Multilateral por el anticipo de octubre.',
      when:'13 de noviembre para los agentes alcanzados y del 17 al 20 de noviembre para el anticipo de octubre por SIFERE.',
      action:'Consultá la fecha asignada a la terminación de tu CUIT en el calendario de SIFERE y el sistema correspondiente para declarar y pagar.',
      reviewedAt:'2026-11-11',scope:'Convenio Multilateral'},
    references:[{label:'SIFERE · calendario oficial',url:'https://www.ca.gob.ar/sifere'}]
  },
  {
    id:'arca-5903-precios-transferencia',category:'impositivo',jurisdictions:['nacional'],
    profiles:['precios-transferencia'],date:'2026-09-30',title:'Precios de transferencia: ARCA sustituye el régimen de operaciones internacionales',
    summary:'La RG 5903/2026 actualiza la documentación y las declaraciones de operaciones internacionales en Ganancias para ejercicios iniciados desde el 1 de octubre de 2026.',
    source:'Boletín Oficial · RG ARCA 5903/2026',url:'https://www.boletinoficial.gob.ar/detalleAviso/primera/348243/20260930',
    mode:'editorial',importance:'alta',importanceReason:'Modifica el régimen de información y documentación.',
    brief:{whatChanged:'La resolución regula métodos de análisis, documentación y presentaciones. Para prestaciones financieras, el estudio debe justificar la calificación crediticia usada y cómo incide en el precio.',
      who:'Sujetos y operaciones internacionales comprendidos en los artículos 1 y 2 de la resolución.',
      when:'Se publicó el 30 de septiembre de 2026 y aplica a ejercicios iniciados desde el 1 de octubre. Para los ejercicios anteriores siguen aplicando las resoluciones previas.',
      action:'El estudio y el F. 2668, o el F. 2672 según el régimen, vencen en el séptimo mes posterior al cierre. El Informe Maestro o nota de ratificación, cuando corresponda, vence en el mes doce. El artículo 70 fija los días según CUIT.',
      reviewedAt:'2026-11-11',scope:'Impuesto a las Ganancias · Argentina'},
    references:[{label:'Infoleg · texto y anexos',url:'https://www.argentina.gob.ar/normativa/nacional/norma-430681/texto'}]
  },
  {
    id:'caba-comarb-9-padron-federal',category:'impositivo',jurisdictions:['caba','interjurisdiccional'],
    date:'2026-08-12',title:'Convenio Multilateral: CABA se incorpora al Padrón Federal',
    summary:'Desde el 1 de agosto de 2026, los contribuyentes de Ingresos Brutos de Convenio Multilateral con sede en CABA están incorporados al Registro Único Tributario.',
    source:'Comisión Arbitral · RG 9/2026',url:'https://www.ca.gob.ar/resoluciones-comarb/download/454-2026/8700-rg-09-ratifica-disposicion-de-presidencia-n-9-2026',
    mode:'editorial',
    brief:{who:'Contribuyentes de Convenio Multilateral con jurisdicción sede en CABA.',
      when:'La incorporación se aplica desde el 1 de agosto de 2026. La Comisión Arbitral la ratificó el 12 de agosto.',
      action:'Usá el Registro Único Tributario en ARCA para los trámites registrales incluidos, como altas, bajas y modificaciones.',
      reviewedAt:'2026-11-11',scope:'Convenio Multilateral · sede CABA'},
    references:[{label:'Comisión Arbitral · Padrón Federal',url:'https://www.ca.gob.ar/sistemas/padron-federal'}]
  },
  {
    id:'bcra-inversion-extranjera-segundo-trimestre-2026',category:'economia',jurisdictions:['nacional'],
    date:'2026-11-05',title:'BCRA: la cancelación de deuda comercial explicó la mayor parte de las salidas netas de IED',
    summary:'El BCRA informó egresos netos de inversión extranjera directa por USD 1.820 millones en el segundo trimestre de 2026. El principal factor fue la cancelación de deuda comercial entre vinculadas.',
    source:'BCRA · Informe de inversión extranjera directa',url:'https://www.bcra.gob.ar/publicaciones/informe-sobre-inversion-extranjera-directa-segundo-trimestre-2026/',
    mode:'editorial'
  },
  {
    id:'casas-particulares-noviembre-2026',
    category:'laboral',
    date:'2026-11-10',
    title:'Casas particulares: escalas de noviembre y diciembre de 2026',
    summary:'Las escalas mínimas suben 1,6% en noviembre y 1,6% en diciembre, sobre las bases del mes previo previstas por la norma. En noviembre se completa la incorporación al básico de la suma de agosto. Incluye los importes por hora y por mes, los tramos de la suma y los adicionales.',
    source:'Infoleg · Resolución 6/2026 actualizada',
    url:'https://www.argentina.gob.ar/normativa/nacional/norma-429627/texto',
    mode:'editorial',
    brief:{
      whatChanged:'Los aumentos de la Resolución 6/2026 fueron 1,9% en agosto, 1,8% en septiembre, 1,7% en octubre y 1,6% tanto en noviembre como en diciembre. La suma no remunerativa se pagó una vez con agosto y se incorporó al básico en tres etapas: 25% en septiembre, 50% en octubre y 25% en noviembre.',
      who:'Personal alcanzado por la Ley 26.844 en todo el país. Si realiza tareas de más de una categoría, corresponde la principal que desempeña habitualmente.',
      when:'La Resolución 6/2026 se publicó el 3 de septiembre. La 7/2026 rectificó los anexos de noviembre y diciembre el 18 de septiembre. Cada escala se aplica al mes que indica el cuadro.',
      action:'Usá el mínimo de la categoría, la modalidad de retiro y la forma de pago. Generá el recibo en Personal de Casas Particulares y liquidá aportes, contribuciones y ART por separado.',
      limits:'Aplicá el adicional del 31% sobre el mínimo en La Pampa, Río Negro, Chubut, Neuquén, Santa Cruz, Tierra del Fuego, Antártida e Islas del Atlántico Sur y el partido bonaerense de Patagones. La antigüedad suma 1% por año computable con el mismo empleador. Si corresponde zona desfavorable, se incorpora a la base de ese adicional.',
      reviewedAt:'2026-11-11',
      scope:'Argentina · casas particulares'
    },
    tables:[
      {
        period:'2026-11',
        caption:'Noviembre de 2026 · mínimos en pesos',
        columns:['Categoría','Hora con retiro','Hora sin retiro','Mes con retiro','Mes sin retiro'],
        rows:[
          ['Supervisión','$ 4.923,44','$ 5.339,08','$ 614.186,76','$ 677.369,70'],
          ['Tareas específicas','$ 4.695,59','$ 5.093,82','$ 574.828,75','$ 633.158,89'],
          ['Caseros','—','$ 4.447,11','—','$ 562.284,09'],
          ['Asistencia y cuidado','$ 4.447,11','$ 4.918,66','$ 562.284,09','$ 619.810,80'],
          ['Tareas generales','$ 4.170,52','$ 4.447,11','$ 511.639,37','$ 562.284,09']
        ]
      },
      {
        period:'2026-12',
        caption:'Diciembre de 2026 · mínimos en pesos',
        columns:['Categoría','Hora con retiro','Hora sin retiro','Mes con retiro','Mes sin retiro'],
        rows:[
          ['Supervisión','$ 5.002,21','$ 5.424,50','$ 624.013,75','$ 688.207,61'],
          ['Tareas específicas','$ 4.770,72','$ 5.175,33','$ 584.026,01','$ 643.289,43'],
          ['Caseros','—','$ 4.518,27','—','$ 571.280,64'],
          ['Asistencia y cuidado','$ 4.518,27','$ 4.997,36','$ 571.280,64','$ 629.727,77'],
          ['Tareas generales','$ 4.237,25','$ 4.518,27','$ 519.825,60','$ 571.280,64']
        ]
      },
      {
        caption:'Suma no remunerativa abonada con agosto de 2026',
        columns:['Horas por semana','Importe por única vez'],
        rows:[['Menos de 12','$ 8.000'],['De 12 a menos de 16','$ 11.500'],['16 o más','$ 20.000']]
      }
    ],
    references:[
      {label:'Escala oficial de noviembre · Anexo IV rectificado',url:'https://www.argentina.gob.ar/normativa/429627_res7-1_pdf/archivo'},
      {label:'Escala oficial de diciembre · Anexo V rectificado',url:'https://www.argentina.gob.ar/normativa/429627_res7-2_pdf/archivo'},
      {label:'CNTCP · Resolución 7/2026',url:'https://www.argentina.gob.ar/normativa/nacional/norma-430250'},
      {label:'ARCA · Antigüedad',url:'https://arca.gob.ar/casasparticulares/categorias-y-remuneraciones/antiguedad.asp'},
      {label:'ARCA · Recibo de sueldo',url:'https://www.arca.gob.ar/casasparticulares/categorias-y-remuneraciones/requisitos.asp'}
    ]
  },
  {
    id:'arca-5918-ganancias-2025',
    category:'impositivo',
    date:'2026-10-30',
    title:'Ganancias 2025: presentación hasta el 16 de noviembre',
    summary:'La RG 5918 extendió la presentación al 16 de noviembre de 2026. El vencimiento del saldo fue el 27 de julio. ARCA trasladó al 30 de noviembre el proceso de caracterización como Pequeño Contribuyente.',
    source:'Infoleg · RG ARCA 5918/2026',
    url:'https://www.argentina.gob.ar/normativa/nacional/norma-431808/texto',
    mode:'editorial',
    importance:'alta',
    importanceReason:'Cambia el plazo de presentación de Ganancias 2025.',
    alertUrls:['https://www.boletinoficial.gob.ar/detalleAviso/primera/349882/20261030'],
    brief:{
      whatChanged:'La presentación de Ganancias 2025 pasó del 30 de octubre al 16 de noviembre. La fecha del saldo sigue siendo el 27 de julio de 2026. ARCA trasladó del 16 al 30 de noviembre el proceso de caracterización como Pequeño Contribuyente para el régimen de la RG 5321.',
      who:'Personas humanas y sucesiones indivisas comprendidas en la RG 5692 y sus complementarias, tanto del régimen general como del simplificado.',
      when:'La RG 5918 rige desde su publicación el 30 de octubre de 2026 y alcanza el período fiscal 2025.',
      action:'Presentá la declaración pendiente hasta el 16 de noviembre. Si hay saldo pendiente, revisá los intereses y las reglas aplicables a tu caso.',
      limits:'La prórroga de presentación alcanza Ganancias 2025. Consultá por separado los plazos de Bienes Personales, Cedular y las condiciones de adhesión al régimen simplificado.',
      reviewedAt:'2026-11-11',
      scope:'Argentina · Ganancias de personas humanas y sucesiones indivisas'
    },
    references:[
      {label:'Infoleg · RG 5851 actualizada',url:'https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-5851-2026-426048/actualizacion'},
      {label:'Infoleg · RG 5902 actualizada',url:'https://www.argentina.gob.ar/normativa/nacional/norma-430653/actualizacion'},
      {label:'ARCA · Ganancias y Bienes Personales',url:'https://www.arca.gob.ar/gananciasYBienes/'}
    ]
  },
  {
    id:'arba-23-planes-2026',
    category:'impositivo',
    date:'2026-10-23',
    title:'ARBA: descuentos y cuotas para regularizar deudas',
    summary:'La RN 23/2026 agrega descuentos temporales a los planes permanentes. Hasta el 13 de noviembre, el descuento es de hasta 40% en un pago, 20% en tres cuotas o 15% en seis. Las cuotas bonificadas no tienen interés de financiación y las reducciones respetan el capital adeudado.',
    source:'Normativa bonaerense · RN ARBA 23/2026',
    sourceId:'arba',
    url:'https://normas.gba.gob.ar/ar-b/resolucion/2026/23/629712',
    mode:'editorial',
    importance:'alta',
    importanceReason:'El beneficio depende de la fecha de adhesión y cambia el 14 de noviembre.',
    alertUrls:['https://www.ambito.com/novedades-fiscales/arba-deuda-deuda-y-plan-plan-como-gozar-los-mayores-beneficios-las-facilidades-pago-n6343333'],
    brief:{
      whatChanged:'Se agregan descuentos temporales a los planes de las RN 7/2022 y 9/2025. Las opciones de tres y seis cuotas bonificadas son mensuales, iguales y sin interés de financiación.',
      who:'Contribuyentes y responsables solidarios con deudas elegibles de Inmobiliario básico o complementario, Automotores y embarcaciones, Ingresos Brutos o Sellos, según el plan. La RN 23 permite además incluir deudas de vehículos automotores en el régimen de la RN 9/2025 durante su vigencia.',
      when:'Publicada el 23 de octubre. Aplica a adhesiones del 26 de octubre al 31 de diciembre de 2026, con los tramos del cuadro.',
      action:'Consultá la deuda en ARBA y compará las modalidades disponibles. Si emitís una liquidación para cancelar al contado bajo el artículo 3, vence a los cinco días corridos de emitida.',
      limits:'La reducción se aplica al monto del acogimiento con el capital como piso. Para planes caducos también rigen los pisos del artículo 2, con deducción de los pagos previos. Las otras modalidades se rigen por las condiciones de cada plan.',
      reviewedAt:'2026-11-11',
      scope:'Provincia de Buenos Aires'
    },
    tables:[{
      caption:'Descuento sobre el monto del acogimiento · 2026',
      columns:['Fecha de adhesión inclusive','Un pago','3 cuotas','6 cuotas'],
      rows:[
        ['26 de octubre al 13 de noviembre','40%','20%','15%'],
        ['14 al 27 de noviembre','35%','15%','10%'],
        ['28 de noviembre al 11 de diciembre','30%','10%','5%'],
        ['12 al 31 de diciembre','30%','Sin descuento de esta RN','Sin descuento de esta RN']
      ]
    }],
    references:[
      {label:'RN 23/2026 · texto oficial, artículos 1 a 6',url:'https://normas.gba.gob.ar/documentos/xqGe8DCj.pdf'},
      {label:'ARBA · planes de pago',url:'https://www.arba.gov.ar/GuiaTramites/TramiteSeleccionado.asp?tramite=589'}
    ]
  },
  {
    id:'srt-58-mopre-noviembre-2026',
    category:'laboral',
    date:'2026-11-06',
    title:'Riesgos del trabajo: valor del MOPRE desde noviembre',
    summary:'La SRT fijó en $ 97.714,86 el valor de referencia para las multas del artículo 32.1 de la Ley 24.557. Equivale al 22% del haber mínimo garantizado de noviembre.',
    source:'Infoleg · Resolución SRT 58/2026',
    url:'https://www.argentina.gob.ar/normativa/nacional/norma-432057/texto',
    mode:'editorial',
    alertUrls:['https://www.boletinoficial.gob.ar/detalleAviso/primera/350121/20261106'],
    brief:{
      whatChanged:'El valor de referencia queda en $ 97.714,86. Resulta de aplicar el 22% al haber mínimo garantizado de noviembre, fijado por ANSES en $ 444.158,46.',
      who:'ART, empleadores autoasegurados y compañías de seguros de retiro sujetos a las sanciones del artículo 32, apartado 1, de la Ley 24.557.',
      when:'La resolución se publicó el 6 de noviembre y sus efectos aplican desde el 1 de noviembre de 2026.',
      action:'Para revisar una sanción alcanzada, cotejá la fecha de aplicación y la cantidad de unidades fijada en el expediente.',
      limits:'El importe es la unidad de referencia de la multa. Su aplicación depende del acto sancionatorio y del régimen aplicable.',
      reviewedAt:'2026-11-11',
      scope:'Argentina · sistema de riesgos del trabajo'
    },
    references:[
      {label:'Infoleg · ANSES 304/2026 y Decreto 1694/2009',url:'https://www.argentina.gob.ar/normativa/nacional/norma-432057/normas-modificadas'}
    ]
  }
];
export const archivo = [
  {id:'caba-auditoria-rt-37',category:'contable',jurisdictions:['caba'],profiles:['auditoria'],date:'2025-04-01',
    title:'Auditoría en CABA: qué fecha define la aplicación de la RT 37 modificada',
    summary:'Para informes de auditoría emitidos desde el 1 de abril de 2025, el Consejo de CABA exige la RT 37 modificada por la RT 53. La fecha del informe es la referencia indicada por la Res. M.D. 13/2025.',
    source:'Consejo de CABA · RT 37',url:'https://www.consejo.org.ar/micrositios-profesionales/rt-37-nueva-version',mode:'archivo'},
  {id:'caba-rt-54-adopcion',category:'contable',jurisdictions:['caba'],date:'2025-01-01',
    title:'RT 54 en CABA: desde qué ejercicios se aplica la Norma Unificada',
    summary:'El Consejo de CABA indica que la aplicación es obligatoria para ejercicios iniciados desde el 1 de enero de 2025. Exceptúa los períodos intermedios del primer ejercicio y reúne el texto actualizado y modelos de estados contables.',
    source:'Consejo de CABA · RT 54',url:'https://www.consejo.org.ar/micrositios-profesionales/rt-54-norma-unificada-argentina-de-contabilidad',mode:'archivo'},
  {id:'decreto-953-2024',category:'impositivo',date:'2024-10-25',title:'De AFIP a ARCA: qué dice el decreto de creación',summary:'El Decreto 953/2024 disolvió la AFIP y creó ARCA como su continuadora jurídica. La ficha enlaza al texto original; para trámites actuales, consultá también las disposiciones posteriores.',source:'Infoleg · Argentina.gob.ar',url:'https://www.argentina.gob.ar/normativa/nacional/decreto-953-2024-405666/texto',mode:'archivo'},
  {id:'ley-27743',category:'impositivo',date:'2024-07-08',title:'Ley 27.743: medidas fiscales en el texto original',summary:'La ley reúne medidas sobre regularización, bienes personales, ganancias y monotributo. Esta entrada es histórica: no indica que sus plazos sigan abiertos.',source:'Infoleg · Argentina.gob.ar',url:'https://www.argentina.gob.ar/normativa/nacional/ley-27743-401268/texto',mode:'archivo'},
  {id:'rt-54',category:'contable',date:'2022-07-01',title:'RT 54: el punto de partida de la Norma Unificada Argentina',summary:'La FACPCE publicó la resolución técnica original. Para aplicarla a un cierre, verificá el texto actualizado y las resoluciones de adopción del consejo profesional correspondiente.',source:'FACPCE · texto original',url:'https://www.facpce.org.ar/wp-content/uploads/2022/07/RT54.pdf',mode:'archivo',datePrecision:'month'},
  {id:'ley-27742',category:'laboral',date:'2024-07-08',title:'Ley 27.742: dónde leer el capítulo de modernización laboral',summary:'El título V del texto original agrupa cambios laborales. La reglamentación y las modificaciones posteriores deben verificarse antes de aplicarlo a una liquidación o a un caso.',source:'Infoleg · Argentina.gob.ar',url:'https://www.argentina.gob.ar/normativa/nacional/ley-27742-401266/texto',mode:'archivo'},
  {id:'fed-2025-01-29',category:'internacional',date:'2025-01-29',title:'Fed: cómo leer una decisión de tasas',summary:'En esta reunión histórica, el FOMC mantuvo el rango objetivo entre 4,25% y 4,50%. Para entender una reacción de mercado, compará el comunicado con las expectativas previas y observá tasas de los bonos y dólar. La decisión por sí sola no predice un movimiento de precios.',source:'Federal Reserve · FOMC',url:'https://www.federalreserve.gov/newsevents/pressreleases/monetary20250129a.htm',mode:'archivo'}
];

