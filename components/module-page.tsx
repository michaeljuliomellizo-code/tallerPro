import { ArrowRight, CheckCircle2, Clock3, Plus, Search, ShieldCheck } from "lucide-react";

export function ModulePage({eyebrow,title,subtitle,action="Nuevo registro",children}:{eyebrow:string,title:string,subtitle:string,action?:string,children?:React.ReactNode}){
 return <><div className="section-head"><div><div className="eyebrow">{eyebrow}</div><h1 className="page-title">{title}</h1><p className="page-subtitle">{subtitle}</p></div><button className="btn btn-primary"><Plus size={15}/>{action}</button></div>{children}</>;
}
export function SearchBar({placeholder="Buscar..."}:{placeholder?:string}){return <div className="search"><Search size={15}/><input placeholder={placeholder}/></div>}
export function Status({children,tone="gray"}:{children:React.ReactNode,tone?:"green"|"red"|"yellow"|"blue"|"gray"}){return <span className={`badge badge-${tone}`}>{children}</span>}
export function EmptyState({text}:{text:string}){return <div className="empty"><ShieldCheck size={26} style={{marginBottom:8,opacity:.5}}/><div>{text}</div></div>}
export function FlowArrow(){return <ArrowRight size={14} color="#89918f"/>}
export function Timeline({current=3}:{current?:number}){const steps=["Recibida","Diagnóstico","Cotización","Aprobada","Reparación","Calidad","Lista","Entregada"];return <div className="timeline">{steps.map((s,i)=><div className={`timeline-step ${i<current?"done":""} ${i===current?"current":""}`} key={s}><div className="timeline-dot">{i<current?<CheckCircle2 size={13}/>:i+1}</div>{i<steps.length-1&&<div className="timeline-line"/>}</div>)}</div>}
