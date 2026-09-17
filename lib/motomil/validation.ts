export function required(value:string, label:string){ const v=value.trim(); if(!v) throw new Error(`${label} es obligatorio.`); return v; }
export function positiveNumber(value:string|number, label:string){ const n=Number(value); if(!Number.isFinite(n)||n<=0) throw new Error(`${label} debe ser mayor que cero.`); return n; }
export function nonNegativeNumber(value:string|number, label:string){ const n=Number(value); if(!Number.isFinite(n)||n<0) throw new Error(`${label} no puede ser negativo.`); return n; }
