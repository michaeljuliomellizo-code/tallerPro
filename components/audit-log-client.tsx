"use client";
import {useEffect,useState} from "react";
import {ClipboardList} from "lucide-react";
import {createClient} from "@/lib/supabase/client";

type Row={id:number;action:string;entity:string;entity_id:string|null;payload:unknown;created_at:string;user_id:string|null};
export default function AuditLogClient(){const supabase=createClient();const [rows,setRows]=useState<Row[]>([]);useEffect(()=>{(async()=>{const {data}=await supabase.from("audit_logs").select("id,action,entity,entity_id,payload,created_at,user_id").order("created_at",{ascending:false}).limit(100);setRows((data??[]) as Row[])})()},[]);return <div className="card"><div className="section-head"><div><h2>Auditoría</h2><div className="muted">Últimas 100 acciones registradas.</div></div><ClipboardList size={16}/></div>{rows.length===0?<div className="empty">No hay eventos registrados.</div>:<div style={{overflowX:"auto"}}><table style={{width:"100%"}}><thead><tr><th>Fecha</th><th>Acción</th><th>Módulo</th><th>Registro</th><th>Datos</th></tr></thead><tbody>{rows.map(r=><tr key={String(r.id)}><td>{new Date(r.created_at).toLocaleString("es-CO")}</td><td>{r.action}</td><td>{r.entity}</td><td>{r.entity_id??""}</td><td style={{maxWidth:420,whiteSpace:"pre-wrap"}}>{r.payload?JSON.stringify(r.payload):""}</td></tr>)}</tbody></table></div>}</div>}
