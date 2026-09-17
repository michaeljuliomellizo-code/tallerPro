export function moneyCOP(v:number|string|null|undefined){return Number(v??0).toLocaleString("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0})}
export function dateCO(v:string|null|undefined){if(!v)return"—";const d=new Date(v);return Number.isNaN(d.getTime())?"—":d.toLocaleDateString("es-CO")}
export function dateTimeCO(v:string|null|undefined){if(!v)return"—";const d=new Date(v);return Number.isNaN(d.getTime())?"—":d.toLocaleString("es-CO")}
