"use client";

import { useEffect,useMemo,useState } from "react";
import { RefreshCw,WalletCards } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentOrganizationId } from "@/lib/motomil/organization";
import { money } from "@/lib/utils";

type Payment={id:string;invoice_id:string;amount:number|string;method:string;reference:string|null;paid_at:string};

const METHODS:Record<string,string>={
 cash:"Efectivo",
 bank_transfer:"Transferencia",
 card:"Tarjeta",
 nequi:"Nequi",
 daviplata:"Daviplata",
 other:"Otro",
};

export default function CashDashboardClient(){
 const s=useMemo(()=>createClient(),[]);
 const [date,setDate]=useState(new Date().toISOString().slice(0,10));
 const [rows,setRows]=useState<Payment[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");

 async function load(){
  try{
   setLoading(true);setError("");
   const org=await getCurrentOrganizationId();
   const start=new Date(`${date}T00:00:00`);
   const end=new Date(start);end.setDate(end.getDate()+1);
   const {data,error:e}=await s.from("payments")
    .select("id,invoice_id,amount,method,reference,paid_at")
    .eq("organization_id",org)
    .gte("paid_at",start.toISOString())
    .lt("paid_at",end.toISOString())
    .order("paid_at",{ascending:false});
   if(e)throw e;setRows((data??[])as Payment[]);
  }catch(e){setError(e instanceof Error?e.message:"No fue posible cargar la caja.")}
  finally{setLoading(false)}
 }
 useEffect(()=>{load()},[date]);

 const byMethod=rows.reduce<Record<string,number>>((a,r)=>{a[r.method]=(a[r.method]??0)+Number(r.amount||0);return a},{});
 const total=rows.reduce((a,r)=>a+Number(r.amount||0),0);

 return <>
  <div className="section-head">
   <div><div className="eyebrow">Finanzas</div><h1 className="page-title">Caja</h1><p className="page-subtitle">Cobros reales registrados por fecha y medio de pago.</p></div>
   <div style={{display:"flex",gap:8}}><input type="date" value={date} onChange={e=>setDate(e.target.value)}/><button className="btn btn-ghost" onClick={load} disabled={loading}><RefreshCw size={14}/>Actualizar</button></div>
  </div>

  {error&&<div style={{marginBottom:12,padding:10,borderRadius:8,background:"#fff0f0",color:"#a52222",fontSize:12}}>{error}</div>}

  <div className="grid grid-3">
   <div className="card"><div className="muted">Total cobrado</div><strong style={{fontSize:28}}>{money(total)}</strong></div>
   <div className="card"><div className="muted">Efectivo</div><strong style={{fontSize:22}}>{money(byMethod.cash??0)}</strong></div>
   <div className="card"><div className="muted">Transferencias</div><strong style={{fontSize:22}}>{money(byMethod.bank_transfer??0)}</strong></div>
  </div>

  <div style={{height:16}}/>
  <div className="grid grid-3">
   {Object.entries(METHODS).filter(([k])=>k!=="cash"&&k!=="bank_transfer").map(([k,v])=>
    <div className="card" key={k}><div className="muted">{v}</div><strong style={{fontSize:22}}>{money(byMethod[k]??0)}</strong></div>
   )}
  </div>

  <div style={{height:16}}/>
  <div className="card">
   <div className="section-head"><h2>Movimientos de caja</h2><WalletCards size={16}/></div>
   {loading?<div className="empty">Cargando movimientos...</div>:
   rows.length===0?<div className="empty" style={{padding:30}}>No hay cobros para esta fecha.</div>:
   <div className="table-wrap"><table className="table">
    <thead><tr><th>Fecha</th><th>Factura</th><th>Método</th><th>Referencia</th><th>Valor</th></tr></thead>
    <tbody>{rows.map(p=><tr key={p.id}>
     <td>{new Date(p.paid_at).toLocaleString("es-CO")}</td>
     <td>{p.invoice_id}</td><td>{METHODS[p.method]??p.method}</td><td>{p.reference??"—"}</td>
     <td><strong>{money(Number(p.amount||0))}</strong></td>
    </tr>)}</tbody>
   </table></div>}
  </div>
 </>;
}
