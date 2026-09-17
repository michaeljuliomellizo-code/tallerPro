import type {OrderStatus} from "@/lib/motomil/types";
export const isClosed=(s:OrderStatus)=>s==="delivered"||s==="cancelled";
export const canQuote=(s:OrderStatus)=>s==="received"||s==="diagnosis";
export const canApprove=(s:OrderStatus)=>s==="quote";
export const canRepair=(s:OrderStatus)=>s==="approved";
