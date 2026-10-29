// Enlace directo a cada ficha: #<id> abre la ficha y #<id>/ejemplo abre además su caso de ejemplo.
// Se usa el identificador (estable) y no la referencia A-01, que cambia si se suma un proyecto.
export function leerEnlace(hash,ids){
 const m=/^#([a-z0-9-]+)(\/ejemplo)?$/.exec(String(hash||''));
 if(!m||!ids.includes(m[1]))return null;
 return {id:m[1],ejemplo:Boolean(m[2])};
}
export function armarEnlace(id,ejemplo=false){
 if(!/^[a-z0-9-]+$/.test(id))throw new Error('Identificador inválido');
 return '#'+id+(ejemplo?'/ejemplo':'');
}
