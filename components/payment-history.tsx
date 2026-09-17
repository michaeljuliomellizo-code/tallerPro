"use client";

import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/utils";

type Payment = {
  id:string;
  amount:number|string;
  method:string;
  reference:string|null;
  paid_at:string;
};

const METHODS:Record<string,string> = {
  cash:"Efectivo",
  bank_transfer:"Transferencia",
  card:"Tarjeta",
  nequi:"Nequi",
  daviplata:"Daviplata",
  other:"Otro",
};

export default function PaymentHistory({
  invoiceId,refreshKey=0
}:{invoiceId:string;refreshKey?:number}) {
  const supabase=createClient();
  const [rows,setRows]=useState<Payment[]>([]);
  const [loading,setLoading]=useState(true);

  async function load() {
    setLoading(true);
    const {data,error}=await supabase
      .from("payments")
      .select("id,amount,method,reference,paid_at")
      .eq("invoice_id",invoiceId)
      .order("paid_at",{ascending:false});
    if(!error) setRows((data??[]) as Payment[]);
    setLoading(false);
  }

  useEffect(()=>{load()},[invoiceId,refreshKey]);

  const sum=rows.reduce((a,r)=>a+Number(r.amount||0),0);

  return (
    <div className="card">
      <div className="section-head">
        <div>
          <h2>Historial de pagos</h2>
          <div className="muted" style={{fontSize:11}}>Acumulado: {money(sum)}</div>
        </div>
        <CreditCard size={16}/>
      </div>

      {loading ? <div className="empty">Cargando pagos...</div> :
      rows.length===0 ? <div className="empty" style={{padding:30}}>No hay pagos registrados.</div> :
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Fecha</th><th>Método</th><th>Referencia</th><th>Valor</th></tr></thead>
          <tbody>{rows.map(r=><tr key={r.id}>
            <td>{new Date(r.paid_at).toLocaleString("es-CO")}</td>
            <td>{METHODS[r.method]??r.method}</td>
            <td>{r.reference??"—"}</td>
            <td><strong>{money(Number(r.amount||0))}</strong></td>
          </tr>)}</tbody>
        </table>
      </div>}
    </div>
  );
}
