"use client";
import Image from "next/image";
import { useState } from "react";
import { Mail, LockKeyhole, LogIn, Chrome, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { APP_CONFIG } from "@/lib/tallerpro/config";

export default function LoginPage() {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [loading,setLoading]=useState(false); const [message,setMessage]=useState("");
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  async function login(e: React.FormEvent){e.preventDefault();setLoading(true);setMessage(""); if(!configured){setMessage("Modo demo: configura Supabase para activar la autenticación real.");setLoading(false);return;} const supabase=createClient(); const {error}=await supabase.auth.signInWithPassword({email,password}); if(error)setMessage(error.message); else window.location.href="/dashboard"; setLoading(false);}
  async function google(){ if(!configured){setMessage("Modo demo: configura Supabase y Google OAuth para activar este acceso.");return;} const supabase=createClient(); const {error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:`${window.location.origin}/callback`}}); if(error)setMessage(error.message); }
  return <main className="login-page"><div className="login-card"><div className="login-logo">
    <Image
      src={APP_CONFIG.logo}
      alt={APP_CONFIG.name}
      width={70}
      height={70}
    />
    <div>
      <strong>{APP_CONFIG.name}</strong>
      <div className="muted" style={{fontSize:12}}>Gestión integral para tu taller</div></div></div><div className="eyebrow">Acceso seguro</div><h1 className="page-title" style={{fontSize:30}}>Controla todo el taller</h1><p className="page-subtitle">Clientes, motos, órdenes, inventario, pagos y mantenimiento en un solo lugar.</p><form onSubmit={login} className="grid" style={{gap:12}}><div className="field"><label>Correo electrónico</label><div className="search" style={{width:"100%"}}><Mail size={15}/><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@tallerpro.com"/></div></div><div className="field"><label>Contraseña</label><div className="search" style={{width:"100%"}}><LockKeyhole size={15}/><input required type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></div></div><button className="btn btn-primary" disabled={loading}><LogIn size={15}/>{loading?"Ingresando...":"Ingresar"}</button></form><div style={{display:"flex",alignItems:"center",gap:10,margin:"18px 0",color:"#8a9290",fontSize:10}}><span style={{height:1,background:"#e5e9e8",flex:1}}/>O CONTINÚA CON<span style={{height:1,background:"#e5e9e8",flex:1}}/></div><button onClick={google} className="btn btn-ghost" style={{width:"100%",justifyContent:"center"}}><Chrome size={15}/>Continuar con Google</button>{message&&<div className="alert" style={{marginTop:14}}><Wrench size={15}/><div>{message}</div></div>}
      <div className="footer-note">{APP_CONFIG.name} · Plataforma de gestión para talleres</div></div></main>;
}
