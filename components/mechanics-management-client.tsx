"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

interface Branch { id: string; name: string; active: boolean; }
interface Mechanic { id: string; full_name: string; document_number: string | null; phone: string | null; email: string | null; specialty: string | null; active: boolean; user_id: string | null; branch_id: string | null; branch?: { name: string } | null; }
interface AppUser { user_id: string; email: string | null; full_name: string | null; base_role: string; role_id: string | null; branch_id: string | null; active: boolean; }
interface Specialty { id: string; name: string; active: boolean; }

const money = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

export default function MechanicsManagementClient() {
  const [orgId, setOrgId] = useState("");
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [editing, setEditing] = useState<Mechanic | null>(null);
  const [tab, setTab] = useState<"list" | "specialties" | "commissions">("list");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [specialtyName, setSpecialtyName] = useState("");
  const [rules, setRules] = useState<any[]>([]);
  const [ruleForm, setRuleForm] = useState({ scope_type: "general", service_name: "", service_category: "", commission_type: "percentage", commission_value: "40", effective_from: new Date().toISOString().slice(0,10), effective_to: "", active: true, notes: "" });

  const [form, setForm] = useState({ full_name: "", document_number: "", phone: "", email: "", specialty: "", active: true, user_id: "", branch_id: "" });

  const mechanicUsers = useMemo(() => users.filter((u) => u.base_role === "mechanic" || u.base_role === "admin"), [users]);

  async function loadAll() {
    setLoading(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No existe una sesión activa.");
      const { data: membership, error: me } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).maybeSingle();
      if (me) throw me; if (!membership?.organization_id) throw new Error("El usuario no tiene organización asignada.");
      setOrgId(membership.organization_id);
      const [
          { data: ms, error: em },
          { data: bs, error: eb },
          { data: ss, error: es },
      ] = await Promise.all([
          supabase
              .from("mechanics")
              .select(
                  "id,full_name,document_number,phone,email,specialty,active,user_id,branch_id,branch:branches(name)"
              )
              .eq(
                  "organization_id",
                  membership.organization_id
              )
              .order("full_name"),

          supabase
              .from("branches")
              .select("id,name,active")
              .eq(
                  "organization_id",
                  membership.organization_id
              )
              .order("name"),

          supabase
              .from("mechanic_specialties")
              .select("id,name,active")
              .eq(
                  "organization_id",
                  membership.organization_id
              )
              .order("name"),
      ]);

      if (em) throw em;
      if (eb) throw eb;
      if (es) throw es;

      const normalizedMechanics: Mechanic[] = (ms ?? []).map((mechanic) => ({
          id: mechanic.id,
          full_name: mechanic.full_name,
          document_number: mechanic.document_number,
          phone: mechanic.phone,
          email: mechanic.email,
          specialty: mechanic.specialty,
          active: mechanic.active,
          user_id: mechanic.user_id,
          branch_id: mechanic.branch_id,
          branch: Array.isArray(mechanic.branch)
              ? mechanic.branch[0] ?? null
              : mechanic.branch ?? null,
      }));

      setMechanics(normalizedMechanics);
      setBranches(bs ?? []);
      setSpecialties(ss ?? []);
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      if (res.ok) { const json = await res.json(); setUsers(json.users ?? []); }
    } catch (e) { setError(e instanceof Error ? e.message : "No fue posible cargar mecánicos."); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadAll(); }, []);

  function resetForm() { setEditing(null); setForm({ full_name: "", document_number: "", phone: "", email: "", specialty: "", active: true, user_id: "", branch_id: "" }); }
  function edit(m: Mechanic) { setEditing(m); setSelectedId(m.id); setForm({ full_name: m.full_name, document_number: m.document_number ?? "", phone: m.phone ?? "", email: m.email ?? "", specialty: m.specialty ?? "", active: m.active, user_id: m.user_id ?? "", branch_id: m.branch_id ?? "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }

  async function saveMechanic(e: FormEvent) {
    e.preventDefault(); setSaving(true); setMessage(""); setError("");
    try {
      if (!orgId) throw new Error("Organización no disponible.");
      const payload = { organization_id: orgId, full_name: form.full_name.trim(), document_number: form.document_number.trim() || null, phone: form.phone.trim() || null, email: form.email.trim() || null, specialty: form.specialty.trim() || null, active: form.active, user_id: form.user_id || null, branch_id: form.branch_id || null };
      if (!payload.full_name) throw new Error("El nombre completo es obligatorio.");
      const query = editing ? supabase.from("mechanics").update(payload).eq("id", editing.id).eq("organization_id", orgId) : supabase.from("mechanics").insert(payload);
      const { error: saveError } = await query;
      if (saveError) throw saveError;
      setMessage(editing ? "Mecánico actualizado correctamente." : "Mecánico creado correctamente."); resetForm(); await loadAll();
    } catch (e) { setError(e instanceof Error ? e.message : "No fue posible guardar."); }
    finally { setSaving(false); }
  }

  async function toggleActive(m: Mechanic) {
    const { error: e } = await supabase.from("mechanics").update({ active: !m.active }).eq("id", m.id).eq("organization_id", orgId);
    if (e) setError(e.message); else { setMessage(m.active ? "Mecánico desactivado." : "Mecánico activado."); await loadAll(); }
  }

  async function addSpecialty(e: FormEvent) { e.preventDefault(); const name = specialtyName.trim(); if (!name) return; const { error: er } = await supabase.from("mechanic_specialties").insert({ organization_id: orgId, name }); if (er) setError(er.message); else { setSpecialtyName(""); setMessage("Especialidad creada."); await loadAll(); } }
  async function toggleSpecialty(s: Specialty) { const { error: er } = await supabase.from("mechanic_specialties").update({ active: !s.active }).eq("id", s.id); if (er) setError(er.message); else await loadAll(); }

  async function loadRules(mechanicId: string) {
    if (!mechanicId) { setRules([]); return; }
    const { data, error: er } = await supabase.from("mechanic_commission_rules").select("id,scope_type,service_name,service_category,commission_type,commission_value,effective_from,effective_to,active,notes").eq("organization_id", orgId).eq("mechanic_id", mechanicId).order("effective_from", { ascending: false }).order("updated_at", { ascending: false });
    if (er) setError(er.message); else setRules(data ?? []);
  }
  useEffect(() => { if (tab === "commissions") loadRules(selectedId); }, [tab, selectedId, orgId]);
  async function saveRule(e: FormEvent) {
    e.preventDefault();
    if (!selectedId) { setError("Seleccione un mecánico para configurar su comisión."); return; }
    const payload = { organization_id: orgId, mechanic_id: selectedId, scope_type: ruleForm.scope_type, service_name: ruleForm.scope_type === "service" ? ruleForm.service_name.trim() || null : null, service_category: ruleForm.scope_type === "category" ? ruleForm.service_category.trim() || null : null, commission_type: ruleForm.commission_type, commission_value: Number(ruleForm.commission_value), effective_from: ruleForm.effective_from, effective_to: ruleForm.effective_to || null, active: ruleForm.active, notes: ruleForm.notes.trim() || null };
    if (payload.commission_value < 0 || Number.isNaN(payload.commission_value)) { setError("El valor de comisión no es válido."); return; }
    const { error: er } = await supabase.from("mechanic_commission_rules").insert(payload);
    if (er) setError(er.message); else { setMessage("Regla de comisión creada."); setRuleForm({ scope_type: "general", service_name: "", service_category: "", commission_type: "percentage", commission_value: "40", effective_from: new Date().toISOString().slice(0,10), effective_to: "", active: true, notes: "" }); await loadRules(selectedId); }
  }
  async function toggleRule(rule: any) { const { error: er } = await supabase.from("mechanic_commission_rules").update({ active: !rule.active }).eq("id", rule.id).eq("organization_id", orgId); if (er) setError(er.message); else await loadRules(selectedId); }

  return <>
    <div className="section-head"><div><div className="eyebrow">Mecánicos</div><h1 className="page-title">Personal técnico y comisiones</h1><p className="page-subtitle">Administra datos, sucursales, usuarios asociados y reglas de comisión.</p></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Link href="/mecanicos/comisiones" className="btn btn-primary">Reporte de comisiones</Link><Link href="/configuracion" className="btn btn-ghost">Configuración</Link></div></div>
    {message && <div className="notice success">{message}</div>}{error && <div className="notice error">{error}</div>}
    <div style={{display:"flex",gap:8,marginBottom:14}}><button className={tab === "list" ? "btn btn-primary" : "btn btn-ghost"} onClick={() => setTab("list")}>Listado</button><button className={tab === "specialties" ? "btn btn-primary" : "btn btn-ghost"} onClick={() => setTab("specialties")}>Especialidades</button><button className={tab === "commissions" ? "btn btn-primary" : "btn btn-ghost"} onClick={() => setTab("commissions")}>Comisiones</button></div>
    {tab === "specialties" ? <div className="card"><div className="section-head"><h2>Especialidades</h2></div><form onSubmit={addSpecialty} className="form-grid"><div className="field"><label>Nueva especialidad</label><input value={specialtyName} onChange={e=>setSpecialtyName(e.target.value)} placeholder="Motor, electricidad, suspensión..." /></div><div className="field" style={{alignSelf:"end"}}><button className="btn btn-primary" type="submit">Agregar</button></div></form><div style={{display:"grid",gap:8,marginTop:14}}>{specialties.map(s=><div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:10,border:"1px solid #e4e9e8",borderRadius:10}}><span>{s.name}</span><button className="btn btn-ghost" onClick={()=>toggleSpecialty(s)}>{s.active ? "Desactivar" : "Activar"}</button></div>)}{specialties.length===0&&<div className="empty">No hay especialidades parametrizadas.</div>}</div></div> : tab === "commissions" ? <div className="card">
      <div className="section-head"><h2>Configuración de comisiones</h2><span className="badge">Solo mano de obra</span></div>
      <div className="field" style={{marginBottom:12}}><label>Mecánico</label><select value={selectedId} onChange={e=>{setSelectedId(e.target.value);}}><option value="">Seleccione...</option>{mechanics.map(m=><option key={m.id} value={m.id}>{m.full_name}</option>)}</select></div>
      <form onSubmit={saveRule} className="form-grid">
        <div className="field"><label>Aplicación</label><select value={ruleForm.scope_type} onChange={e=>setRuleForm(f=>({...f,scope_type:e.target.value}))}><option value="general">General</option><option value="service">Servicio específico</option><option value="category">Categoría</option></select></div>
        {ruleForm.scope_type === "service" && <div className="field"><label>Nombre del servicio</label><input value={ruleForm.service_name} onChange={e=>setRuleForm(f=>({...f,service_name:e.target.value}))} required /></div>}
        {ruleForm.scope_type === "category" && <div className="field"><label>Categoría</label><input value={ruleForm.service_category} onChange={e=>setRuleForm(f=>({...f,service_category:e.target.value}))} required /></div>}
        <div className="field"><label>Tipo</label><select value={ruleForm.commission_type} onChange={e=>setRuleForm(f=>({...f,commission_type:e.target.value}))}><option value="percentage">Porcentaje</option><option value="fixed">Valor fijo por unidad</option></select></div>
        <div className="field"><label>{ruleForm.commission_type === "percentage" ? "Porcentaje" : "Valor fijo"}</label><input type="number" min="0" step="0.01" value={ruleForm.commission_value} onChange={e=>setRuleForm(f=>({...f,commission_value:e.target.value}))} required /></div>
        <div className="field"><label>Vigente desde</label><input type="date" value={ruleForm.effective_from} onChange={e=>setRuleForm(f=>({...f,effective_from:e.target.value}))} required /></div>
        <div className="field"><label>Vigente hasta</label><input type="date" value={ruleForm.effective_to} onChange={e=>setRuleForm(f=>({...f,effective_to:e.target.value}))} /></div>
        <div className="field"><label>Notas</label><input value={ruleForm.notes} onChange={e=>setRuleForm(f=>({...f,notes:e.target.value}))} placeholder="Condición o referencia" /></div>
        <div className="field" style={{alignSelf:"end"}}><button className="btn btn-primary" disabled={!selectedId}>Crear regla</button></div>
      </form>
      <div style={{marginTop:18,overflowX:"auto"}}><table className="table"><thead><tr><th>Aplicación</th><th>Tipo</th><th>Valor</th><th>Vigencia</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{rules.map(r=><tr key={r.id}><td>{r.scope_type === "general" ? "General" : r.scope_type === "service" ? `Servicio: ${r.service_name}` : `Categoría: ${r.service_category}`}</td><td>{r.commission_type === "percentage" ? "Porcentaje" : "Fijo"}</td><td>{r.commission_type === "percentage" ? `${r.commission_value}%` : money(Number(r.commission_value))}</td><td>{r.effective_from} {r.effective_to ? `→ ${r.effective_to}` : "→ vigente"}</td><td>{r.active ? "Activa" : "Inactiva"}</td><td><button className="btn btn-ghost" onClick={()=>toggleRule(r)}>{r.active ? "Desactivar" : "Activar"}</button></td></tr>)}</tbody></table>{selectedId && rules.length===0 && <div className="empty">No hay reglas para este mecánico.</div>}</div>
      <div className="empty" style={{marginTop:12}}>Prioridad al calcular una orden: servicio específico → categoría → regla general. El cálculo nunca incluye repuestos.</div>
    </div> : <>
      <form onSubmit={saveMechanic} className="card" style={{marginBottom:16}}><div className="section-head"><h2>{editing ? "Editar mecánico" : "Nuevo mecánico"}</h2><span className="badge">Comisión sobre mano de obra</span></div><div className="form-grid">
        {([["full_name","Nombre completo"],["document_number","Documento"],["phone","Teléfono"],["email","Correo"]] as const).map(([key,label])=><div className="field" key={key}><label>{label}</label><input value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} required={key==="full_name"} /></div>)}
        <div className="field"><label>Especialidad</label><select value={form.specialty} onChange={e=>setForm(f=>({...f,specialty:e.target.value}))}><option value="">Seleccionar</option>{specialties.filter(s=>s.active).map(s=><option key={s.id} value={s.name}>{s.name}</option>)}{form.specialty && !specialties.some(s=>s.name===form.specialty) && <option value={form.specialty}>{form.specialty}</option>}</select></div>
        <div className="field"><label>Sucursal</label><select value={form.branch_id} onChange={e=>setForm(f=>({...f,branch_id:e.target.value}))}><option value="">Sin asignar</option>{branches.filter(b=>b.active).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
        <div className="field"><label>Usuario asociado</label><select value={form.user_id} onChange={e=>setForm(f=>({...f,user_id:e.target.value}))}><option value="">Sin usuario</option>{mechanicUsers.filter(u=>u.active).map(u=><option key={u.user_id} value={u.user_id}>{u.full_name || u.email || u.user_id}</option>)}</select></div>
        <div className="field"><label>Estado</label><select value={form.active ? "true":"false"} onChange={e=>setForm(f=>({...f,active:e.target.value==="true"}))}><option value="true">Activo</option><option value="false">Inactivo</option></select></div>
      </div><div style={{display:"flex",gap:8,marginTop:14}}><button className="btn btn-primary" disabled={saving}>{saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear mecánico"}</button>{editing&&<button type="button" className="btn btn-ghost" onClick={resetForm}>Cancelar</button>}</div></form>
      <div className="card"><div className="section-head"><h2>Listado de mecánicos</h2><span className="muted">{mechanics.length} registrados</span></div><div style={{overflowX:"auto"}}><table className="table"><thead><tr><th>Nombre</th><th>Documento</th><th>Especialidad</th><th>Sucursal</th><th>Usuario</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{mechanics.map(m=><tr key={m.id} onClick={()=>setSelectedId(m.id)} style={{cursor:"pointer",background:selectedId===m.id?"#f4fbf8":undefined}}><td><strong>{m.full_name}</strong><div className="muted">{m.email || m.phone || ""}</div></td><td>{m.document_number || "-"}</td><td>{m.specialty || "-"}</td><td>{m.branch?.name || branches.find(b=>b.id===m.branch_id)?.name || "-"}</td><td>{m.user_id ? "Asociado" : "Sin usuario"}</td><td>{m.active ? <span className="badge success">Activo</span> : <span className="badge">Inactivo</span>}</td><td><div style={{display:"flex",gap:6}}><button className="btn btn-ghost" onClick={e=>{e.stopPropagation();edit(m)}}>Editar</button><button className="btn btn-ghost" onClick={e=>{e.stopPropagation();toggleActive(m)}}>{m.active ? "Desactivar":"Activar"}</button></div></td></tr>)}</tbody></table>{loading&&<div className="empty">Cargando...</div>}{!loading&&mechanics.length===0&&<div className="empty">No hay mecánicos registrados.</div>}</div></div>
    </>}
  </>;
}
