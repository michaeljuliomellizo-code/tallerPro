"use client";
import Link from 'next/link';
import { CalendarPlus, Plus, ShoppingCart, UserPlus } from 'lucide-react';
const A=[['Nueva venta','/pos',ShoppingCart],['Nueva cita','/agenda',CalendarPlus],['Nuevo cliente','/clientes',UserPlus],['Nuevo producto','/inventario',Plus]] as const;
export default function DashboardQuickActions(){return <div className="card"><div className="section-head"><div><div className="eyebrow">Atajos</div><h2>Acciones rápidas</h2></div></div><div className="grid grid-2">{A.map(([t,h,I])=><Link key={h} href={h} className="btn btn-secondary" style={{display:'flex',gap:7,alignItems:'center'}}><I size={15}/>{t}</Link>)}</div></div>}
