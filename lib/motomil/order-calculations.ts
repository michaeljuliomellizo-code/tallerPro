import type {ServiceOrderItem} from "@/lib/motomil/types";
export function itemTotal(i:Pick<ServiceOrderItem,"quantity"|"unit_price">){return Number(i.quantity||0)*Number(i.unit_price||0)}
export function subtotal(items:ServiceOrderItem[]){return items.reduce((s,i)=>s+itemTotal(i),0)}
export function totals(items:ServiceOrderItem[],tax=0){const sub=subtotal(items);return{subtotal:sub,tax,total:sub+tax}}
