export function money(value:number|string|null|undefined){ return Number(value??0).toLocaleString('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}); }
export function dateTime(value:string|null|undefined){ return value ? new Date(value).toLocaleString('es-CO') : '—'; }
export function dateOnly(value:string|null|undefined){ return value ? new Date(value).toLocaleDateString('es-CO') : '—'; }
