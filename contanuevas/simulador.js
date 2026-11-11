const ars = new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'});
const monthName = new Intl.DateTimeFormat('es-AR',{month:'long',year:'numeric',timeZone:'UTC'});

export function estimateReceipt({scale, category, overnight, pay, hours, years, zone}) {
  const row = scale?.rows.find(row=>row[0]===category);
  if(!row || !['hora','mes'].includes(pay) || typeof overnight!=='boolean' || typeof zone!=='boolean') return;
  if(!Number.isInteger(years) || years<0 || years>60) return;
  if(pay==='hora' && (!Number.isFinite(hours) || hours<=0 || hours>744 || !Number.isInteger(hours*4))) return;

  const column = (pay==='hora'?1:3) + Number(overnight);
  const amount = row[column]?.match(/^\$\s*((?:\d{1,3}(?:\.\d{3})+|\d+)),(\d{2})$/);
  if(!amount) return;
  const rate = Number(amount[1].replaceAll('.',''))*100 + Number(amount[2]);
  if(!Number.isSafeInteger(rate) || rate<=0) return;
  const base = pay==='hora'?Math.round(rate*hours):rate;
  const zoneBonus = zone?Math.round(base*31/100):0;
  const seniority = Math.round((base+zoneBonus)*years/100);
  return {base,zoneBonus,seniority,total:base+zoneBonus+seniority};
}

function node(tag,text='') {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}

function select(options) {
  const field = node('select');
  for(const [value,label] of options) {
    const option = node('option',label);
    option.value = value;
    field.append(option);
  }
  return field;
}

function label(text,field) {
  const wrapper = node('label',text);
  wrapper.append(field);
  return wrapper;
}

function number(value,min,max,step) {
  const field = node('input');
  field.type = 'number';
  field.value = value;
  field.min = min;
  field.max = max;
  field.step = step;
  field.required = true;
  return field;
}

export function receiptView(tables) {
  const scales = tables.filter(table=>/^\d{4}-\d{2}$/.test(table.period??''));
  if(!scales.length) return;
  const section = node('details');
  section.id = 'simulador';
  section.className = 'simulador';
  section.append(node('summary','Simular recibo de sueldo'));
  section.append(node('p','Estimá el sueldo bruto sobre el mínimo de la categoría. Elegí un mes y completá los datos de la relación.'));

  const fields = node('div');
  fields.className = 'simulador-fields';
  const month = select(scales.map(scale=>[scale.period,monthName.format(new Date(scale.period+'-01T00:00:00Z'))]));
  const category = select(scales[0].rows.map(row=>[row[0],row[0]]));
  category.value = 'Tareas generales';
  const overnight = select([['no','Con retiro'],['yes','Sin retiro']]);
  const pay = select([['mes','Mes completo'],['hora','Por hora']]);
  const hours = number('40','0.25','744','0.25');
  const hoursLabel = label('Horas trabajadas en el mes',hours);
  const years = number('0','0','60','1');
  const zone = select([['no','No'],['yes','Sí, corresponde 31%']]);
  fields.append(label('Mes',month),label('Categoría',category),label('Modalidad de retiro',overnight),
    label('Forma de pago',pay),hoursLabel,label('Años de antigüedad computables',years),label('Zona desfavorable',zone));
  section.append(fields);

  const output = node('div');
  output.className = 'recibo';
  output.setAttribute('aria-live','polite');
  section.append(output);
  const note = node('p','Estimación bruta en pesos. El cálculo usa el mínimo publicado e incluye los adicionales que marcaste. SAC, horas extra, licencias, aportes, contribuciones y ART se liquidan por separado.');
  note.className = 'simulador-nota';
  const arca = node('a','Emitir el recibo en ARCA ↗');
  arca.href = 'https://www.arca.gob.ar/casasparticulares/';
  arca.target = '_blank';
  arca.rel = 'noopener noreferrer';
  section.append(note,arca);

  function render() {
    const hourly = pay.value==='hora';
    hours.disabled = !hourly;
    hoursLabel.hidden = !hourly;
    const scale = scales.find(scale=>scale.period===month.value);
    const row = scale.rows.find(row=>row[0]===category.value);
    const withRetirement = row?.[1]!=='—';
    overnight.options[0].disabled = !withRetirement;
    if(!withRetirement) overnight.value = 'yes';
    const result = estimateReceipt({scale,category:category.value,overnight:overnight.value==='yes',
      pay:pay.value,hours:hours.valueAsNumber,years:years.valueAsNumber,zone:zone.value==='yes'});
    if(!result) {
      output.replaceChildren(node('p','Revisá las horas y los años de antigüedad para calcular el importe.'));
      return;
    }
    const amounts = node('dl');
    for(const [text,value] of [['Básico mínimo',result.base],['Adicional por zona',result.zoneBonus],
      ['Antigüedad',result.seniority],['Total bruto estimado',result.total]]) {
      const line = node('div');
      line.append(node('dt',text),node('dd',ars.format(value/100)));
      amounts.append(line);
    }
    output.replaceChildren(amounts);
  }
  fields.addEventListener('input',render);
  render();
  return section;
}
