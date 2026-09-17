"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Edit3, Plus, Store, ToggleLeft, ToggleRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Branch = { id: string; name: string; code: string | null; address: string | null; city: string | null; phone: string | null; active: boolean };

const empty = { name: "", code: "", address: "", city: "", phone: "", active: true };

export default function BranchesManagementClient() {
  const supabase = createClient();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [orgId, setOrgId] = useState("");
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión activa.");
      const { data: membership, error: me } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).maybeSingle();
      if (me) throw me;
      if (!membership?.organization_id) throw new Error("No tienes organización asignada.");
      setOrgId(membership.organization_id);
      const { data, error: be } = await supabase.from("branches").select("id,name,code,address,city,phone,active").eq("organization_id", membership.organization_id).order("name");
      if (be) throw be;
      setBranches((data as Branch[]) ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "No fue posible cargar sucursales."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function edit(branch: Branch) {
    setEditingId(branch.id);
    setForm({ name: branch.name, code: branch.code ?? "", address: branch.address ?? "", city: branch.city ?? "", phone: branch.phone ?? "", active: branch.active });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() { setEditingId(null); setForm(empty); }

  async function submit(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const payload = { organization_id: orgId, name: form.name.trim(), code: form.code.trim() || null, address: form.address.trim() || null, city: form.city.trim() || null, phone: form.phone.trim() || null, active: form.active };
      if (!payload.name) throw new Error("El nombre de la sucursal es obligatorio.");
      const query = editingId ? supabase.from("branches").update(payload).eq("id", editingId).eq("organization_id", orgId) : supabase.from("branches").insert(payload);
      const { error: e2 } = await query;
      if (e2) throw e2;
      setMessage(editingId ? "Sucursal actualizada correctamente." : "Sucursal creada correctamente.");
      reset(); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "No fue posible guardar la sucursal."); }
    finally { setSaving(false); }
  }

  async function toggle(branch: Branch) {
    const { error: e2 } = await supabase.from("branches").update({ active: !branch.active, updated_at: new Date().toISOString() }).eq("id", branch.id).eq("organization_id", orgId);
    if (e2) setError(e2.message); else await load();
  }

  if (loading) return <div className="card">Cargando sucursales...</div>;

  return (
    <div>
      <Link href="/configuracion" className="btn btn-ghost"><ArrowLeft size={14} /> Configuración</Link>
      <div style={{ height: 12 }} />
      <div className="section-head"><div><div className="eyebrow">Configuración</div><h1 className="page-title">Sucursales</h1><p className="page-subtitle">Sedes que pueden utilizar usuarios y mecánicos.</p></div><Store size={20} /></div>
      {message && <div className="card" style={{ marginBottom: 12 }}>{message}</div>}
      {error && <div className="card" style={{ marginBottom: 12, color: "#a52222" }}>{error}</div>}

      <form className="card" onSubmit={submit} style={{ marginBottom: 16 }}>
        <div className="section-head"><div><h2>{editingId ? "Editar sucursal" : "Nueva sucursal"}</h2><div className="muted">El código es opcional y sirve para identificar la sede.</div></div><Plus size={18} /></div>
        <div className="form-grid">
          <div className="field"><label>Nombre</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div className="field"><label>Código</label><input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
          <div className="field"><label>Ciudad</label><input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
          <div className="field"><label>Teléfono</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="field" style={{ gridColumn: "1 / -1" }}><label>Dirección</label><input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          <div className="field"><label>Estado</label><select value={form.active ? "true" : "false"} onChange={e => setForm({ ...form, active: e.target.value === "true" })}><option value="true">Activa</option><option value="false">Inactiva</option></select></div>
          <div style={{ display: "flex", alignItems: "end", gap: 8 }}><button className="btn btn-primary" disabled={saving}>{saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear sucursal"}</button>{editingId && <button type="button" className="btn btn-ghost" onClick={reset}>Cancelar</button>}</div>
        </div>
      </form>

      <div className="card"><div className="section-head"><div><h2>Sucursales registradas</h2><div className="muted">{branches.length} sede(s)</div></div></div>
        <div style={{ overflowX: "auto" }}><table><thead><tr><th>Nombre</th><th>Código</th><th>Ciudad</th><th>Teléfono</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
          {branches.map(b => <tr key={b.id}><td>{b.name}</td><td>{b.code ?? "-"}</td><td>{b.city ?? "-"}</td><td>{b.phone ?? "-"}</td><td>{b.active ? "Activa" : "Inactiva"}</td><td style={{ display: "flex", gap: 6 }}><button className="btn btn-ghost" onClick={() => edit(b)}><Edit3 size={13} /> Editar</button><button className="btn btn-ghost" onClick={() => toggle(b)}>{b.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}{b.active ? "Desactivar" : "Activar"}</button></td></tr>)}
          {!branches.length && <tr><td colSpan={6} className="empty">No hay sucursales. Crea la primera.</td></tr>}
        </tbody></table></div>
      </div>
    </div>
  );
}
