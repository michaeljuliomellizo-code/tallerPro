"use client";
import Link from 'next/link';
import { AlertTriangle, CalendarDays, Package, FileText } from 'lucide-react';
export default function DashboardAlerts({lowStock=0,pendingQuotes=0,todayAppointments=0}:{lowStock?:number;pendingQuotes?:number;todayAppointments?:number}){
 const items=[
  lowStock>0&&{icon:Package,text:`${lowStock} productos bajo mínimo`,href:'/inventario'},
  pendingQuotes>0&&{icon:FileText,text:`${pendingQuotes} cotizaciones pendientes`,href:'/cotizaciones'},
  todayAppointments>0&&{icon:CalendarDays,text:`${todayAppointments} citas para hoy`,href:'/agenda'},
 ].filter(Boolean) as {icon:any;text:string;href:string}[];
 return <div className="card"><div className="section-head"><div><div className="eyebrow">Atención</div><h2>Alertas operativas</h2></div></div>{items.length?<div style={{display:'grid',gap:10}}>{items.map((x,i)=>{const I=x.icon;return <Link key={i} href={x.href} className="btn btn-ghost" style={{justifyContent:'flex-start'}}><I size={15}/>{x.text}</Link>})}</div>:<div className="muted">No hay alertas críticas.</div>}</div>;
}
