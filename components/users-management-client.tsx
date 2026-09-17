"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, MailPlus, ShieldCheck, UserCog } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Role = { id: string; name: string; role_key: string; base_role: string; system_role: boolean; active: boolean };
type Branch = { id: string; name: string; code: string | null; active: boolean };
type UserRow = { user_id: string; email: string; full_name: string; role: string; role_id: string | null; role_name: string | null; branch_id: string | null; branch_name: string | null; active: boolean; last_sign_in_at: string | null };

function date(value: string | null) { return value ? new Date(value).toLocaleString("es-CO") : "Nunca"; }

export default function UsersManagementClient() {
  const supabase = createClient();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ email: "", full_name: "", role_id: "", branch_id: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No fue posible consultar usuarios.");
      setUsers(json.users ?? []); setRoles(json.roles ?? []); setBranches(json.branches ?? []);
      if (!form.role_id && json.roles?.length) setForm(prev => ({ ...prev, role_id: json.roles[0].id }));
    } catch (e) { setError(e instanceof Error ? e.message : "No fue posible cargar usuarios."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function startEdit(row: UserRow) {
    setSelected(row);
    setForm({ email: row.email, full_name: row.full_name, role_id: row.role_id ?? roles.find(r => r.base_role === row.role)?.id ?? "", branch_id: row.branch_id ?? "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function clear() { setSelected(null); setForm(prev => ({ ...prev, email: "", full_name: "", branch_id: "" })); }

  async function save(e: FormEvent) {
    e.preventDefault(); setSaving(true); setMessage(""); setError("");
    try {
      if (selected) {
        const res = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: selected.user_id, email: form.email, full_name: form.full_name, role_id: form.role_id, branch_id: form.branch_id || null, active: selected.active }) });
        const json = await res.json(); if (!res.ok) throw new Error(json.error ?? "No fue posible actualizar.");
        setMessage(json.message ?? "Usuario actualizado correctamente.");
      } else {
        const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        const json = await res.json(); if (!res.ok) throw new Error(json.error ?? "No fue posible crear.");
        setMessage(json.message ?? "Usuario creado."); clear();
      }
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "No fue posible guardar el usuario."); }
    finally { setSaving(false); }
  }

  async function toggle(row: UserRow) {
    const roleId = row.role_id ?? roles.find(r => r.base_role === row.role)?.id;
    if (!roleId) { setError("El usuario no tiene un rol parametrizado."); return; }
    const res = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: row.user_id, role_id: roleId, branch_id: row.branch_id, active: !row.active }) });
    const json = await res.json();
    if (!res.ok) setError(json.error ?? "No fue posible cambiar el estado."); else { setMessage(json.message ?? "Estado actualizado."); await load(); }
  }

  async function resetAccess(row: UserRow) {
    if (!row.email) return;
    const { error: e } = await supabase.auth.resetPasswordForEmail(row.email, { redirectTo: `${window.location.origin}/auth/reset-password` });
    if (e) setError(e.message); else setMessage(`Se envió un enlace de restablecimiento a ${row.email}.`);
  }

  if (loading) return <div className="card">Cargando usuarios...</div>;
  return (
    <div>
      <Link href="/configuracion" className="btn btn-ghost"><ArrowLeft size={14} /> Configuración</Link>
      <div style={{ height: 12 }} />
      <div className="section-head"><div><div className="eyebrow">Seguridad</div><h1 className="page-title">Usuarios y roles</h1><p className="page-subtitle">Control de acceso, rol, sucursal, estado y último acceso.</p></div><UserCog size={20} /></div>
      {message && <div className="card" style={{ marginBottom: 12 }}>{message}</div>}
      {error && <div className="card" style={{ marginBottom: 12, color: "#a52222" }}>{error}</div>}

      <form className="card" onSubmit={save} style={{ marginBottom: 16 }}>
        <div className="section-head"><div><h2>{selected ? "Editar usuario" : "Crear usuario"}</h2><div className="muted">La creación envía una invitación al correo.</div></div><MailPlus size={16} /></div>
        <div className="form-grid">
          <div className="field"><label>Nombre completo</label><input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required /></div>
          <div className="field"><label>Correo</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
          <div className="field"><label>Rol</label><select value={form.role_id} onChange={e => setForm({ ...form, role_id: e.target.value })} required>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
          <div className="field"><label>Sucursal</label><select value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })}><option value="">Sin asignar</option>{branches.filter(b => b.active).map(b => <option key={b.id} value={b.id}>{b.name}{b.code ? ` · ${b.code}` : ""}</option>)}</select></div>
          <div style={{ display: "flex", gap: 8, alignItems: "end", gridColumn: "1 / -1" }}><button className="btn btn-primary" disabled={saving}>{saving ? "Guardando..." : selected ? "Guardar cambios" : "Crear usuario"}</button>{selected && <button type="button" className="btn btn-ghost" onClick={clear}>Cancelar edición</button>}</div>
        </div>
      </form>

      <div className="card"><div className="section-head"><div><h2>Usuarios del taller</h2><div className="muted">{users.length} usuario(s)</div></div><ShieldCheck size={16} /></div>
        <div style={{ overflowX: "auto" }}><table><thead><tr><th>Usuario</th><th>Rol</th><th>Sucursal</th><th>Estado</th><th>Último acceso</th><th>Acciones</th></tr></thead><tbody>
          {users.map(u => <tr key={u.user_id}><td><strong>{u.full_name || "Sin nombre"}</strong><div className="muted">{u.email}</div></td><td>{u.role_name ?? u.role}</td><td>{u.branch_name ?? "Sin asignar"}</td><td>{u.active ? "Activo" : "Inactivo"}</td><td>{date(u.last_sign_in_at)}</td><td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><button className="btn btn-ghost" onClick={() => startEdit(u)}>Editar</button><button className="btn btn-ghost" onClick={() => toggle(u)}>{u.active ? "Desactivar" : "Activar"}</button><button className="btn btn-ghost" onClick={() => resetAccess(u)}><KeyRound size={13} /> Restablecer acceso</button></td></tr>)}
          {!users.length && <tr><td colSpan={6} className="empty">No hay usuarios registrados.</td></tr>}
        </tbody></table></div>
      </div>
    </div>
  );
}
