"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Role = { id: string; role_key: string; name: string; description: string | null; base_role: string; system_role: boolean; active: boolean };
type Permission = { module_key: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean };

const modules = ["clientes", "motocicletas", "citas", "ordenes", "cotizaciones", "inventario", "facturacion", "reportes", "configuracion"];
const labels: Record<string, string> = { clientes: "Clientes", motocicletas: "Motocicletas", citas: "Citas", ordenes: "Órdenes", cotizaciones: "Cotizaciones", inventario: "Inventario", facturacion: "Facturación", reportes: "Reportes", configuracion: "Configuración" };
const baseRoles = ["admin", "reception", "mechanic", "finance", "customer"];

export default function RolesManagementClient() {
  const supabase = createClient();
  const [orgId, setOrgId] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [selected, setSelected] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Record<string, Permission>>({});
  const [newRole, setNewRole] = useState({ name: "", description: "", base_role: "reception" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true); setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay sesión activa.");
      const { data: member, error: me } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).maybeSingle();
      if (me) throw me;
      if (!member?.organization_id) throw new Error("No tienes organización asignada.");
      setOrgId(member.organization_id);
      const { data, error: re } = await supabase.from("app_roles").select("id,role_key,name,description,base_role,system_role,active").eq("organization_id", member.organization_id).order("system_role", { ascending: false }).order("name");
      if (re) throw re;
      const list = (data as Role[]) ?? [];
      setRoles(list);
      if (!selected && list.length) await selectRole(list[0]);
      else if (selected) {
        const current = list.find(r => r.id === selected.id);
        if (current) await selectRole(current);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "No fue posible cargar los roles."); }
    finally { setLoading(false); }
  }

  async function selectRole(role: Role) {
    setSelected(role); setError("");
    const { data, error: pe } = await supabase.from("role_permissions").select("module_key,can_view,can_create,can_edit,can_delete").eq("role_id", role.id);
    if (pe) { setError(pe.message); return; }
    const map: Record<string, Permission> = {};
    for (const item of modules) map[item] = { module_key: item, can_view: false, can_create: false, can_edit: false, can_delete: false };
    for (const p of (data as Permission[]) ?? []) map[p.module_key] = p;
    setPermissions(map);
  }

  useEffect(() => { load(); }, []);

  const roleCount = useMemo(() => roles.filter(r => r.active).length, [roles]);

  function updatePermission(moduleKey: string, action: keyof Omit<Permission, "module_key">) {
    if (!selected) return;
    setPermissions(prev => ({ ...prev, [moduleKey]: { ...prev[moduleKey], [action]: !prev[moduleKey][action] } }));
  }

  async function savePermissions() {
    if (!selected) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const rows = Object.values(permissions).map(p => ({ role_id: selected.id, module_key: p.module_key, can_view: p.can_view, can_create: p.can_create, can_edit: p.can_edit, can_delete: p.can_delete, updated_at: new Date().toISOString() }));
      const { error: pe } = await supabase.from("role_permissions").upsert(rows, { onConflict: "role_id,module_key" });
      if (pe) throw pe;
      setMessage("Permisos guardados correctamente.");
    } catch (e) { setError(e instanceof Error ? e.message : "No fue posible guardar los permisos."); }
    finally { setSaving(false); }
  }

  async function createCustomRole(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const name = newRole.name.trim();
      if (!name) throw new Error("El nombre del rol es obligatorio.");
      const key = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      if (!key) throw new Error("No fue posible generar la clave del rol.");
      const { data, error: re } = await supabase.from("app_roles").insert({ organization_id: orgId, role_key: `custom_${key}`, name, description: newRole.description.trim() || null, base_role: newRole.base_role, system_role: false, active: true }).select("id,role_key,name,description,base_role,system_role,active").single();
      if (re) throw re;
      const role = data as Role;
      const defaults = modules.map(module_key => ({ role_id: role.id, module_key, can_view: false, can_create: false, can_edit: false, can_delete: false }));
      const { error: pe } = await supabase.from("role_permissions").insert(defaults);
      if (pe) throw pe;
      setNewRole({ name: "", description: "", base_role: "reception" });
      setMessage("Rol personalizado creado correctamente.");
      await load(); await selectRole(role);
    } catch (e) { setError(e instanceof Error ? e.message : "No fue posible crear el rol."); }
    finally { setSaving(false); }
  }

  async function toggleRole(role: Role) {
    if (role.system_role) { setError("Los roles predeterminados no se eliminan; solo pueden ajustarse sus permisos."); return; }
    const { error: re } = await supabase.from("app_roles").update({ active: !role.active, updated_at: new Date().toISOString() }).eq("id", role.id).eq("organization_id", orgId);
    if (re) setError(re.message); else { setMessage(role.active ? "Rol desactivado." : "Rol activado."); await load(); }
  }

  async function deleteCustomRole(role: Role) {
    if (role.system_role) return;
    const ok = window.confirm(`¿Eliminar el rol "${role.name}"?`);
    if (!ok) return;
    const { error: re } = await supabase.from("app_roles").delete().eq("id", role.id).eq("organization_id", orgId);
    if (re) setError(re.message); else { setMessage("Rol eliminado."); await load(); }
  }

  if (loading) return <div className="card">Cargando roles y permisos...</div>;

  return (
    <div>
      <Link href="/configuracion" className="btn btn-ghost"><ArrowLeft size={14} /> Configuración</Link>
      <div style={{ height: 12 }} />
      <div className="section-head"><div><div className="eyebrow">Seguridad</div><h1 className="page-title">Roles y permisos</h1><p className="page-subtitle">{roleCount} rol(es) activo(s). Configura el alcance de cada perfil.</p></div><ShieldCheck size={20} /></div>
      {message && <div className="card" style={{ marginBottom: 12 }}>{message}</div>}
      {error && <div className="card" style={{ marginBottom: 12, color: "#a52222" }}>{error}</div>}

      <div className="grid grid-2">
        <div className="card">
          <div className="section-head"><div><h2>Roles</h2><div className="muted">Predeterminados y personalizados.</div></div></div>
          <div style={{ display: "grid", gap: 8 }}>
            {roles.map(role => <div key={role.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: 10, border: "1px solid #e5e9e8", borderRadius: 10, opacity: role.active ? 1 : .55 }}>
              <button onClick={() => selectRole(role)} style={{ border: 0, background: "transparent", textAlign: "left", cursor: "pointer", flex: 1 }}><strong>{role.name}</strong><div className="muted" style={{ fontSize: 12 }}>{role.description ?? ""}</div></button>
              <span className="badge">{role.system_role ? "Predeterminado" : "Personalizado"}</span>
              {!role.system_role && <><button className="btn btn-ghost" onClick={() => toggleRole(role)}>{role.active ? "Desactivar" : "Activar"}</button><button className="btn btn-ghost" onClick={() => deleteCustomRole(role)} title="Eliminar"><Trash2 size={13} /></button></>}
            </div>)}
          </div>
          <div style={{ height: 16 }} />
          <form onSubmit={createCustomRole}>
            <div className="section-head"><h3>Crear rol personalizado</h3><Plus size={16} /></div>
            <div className="form-grid">
              <div className="field"><label>Nombre</label><input required value={newRole.name} onChange={e => setNewRole({ ...newRole, name: e.target.value })} /></div>
              <div className="field"><label>Rol base</label><select value={newRole.base_role} onChange={e => setNewRole({ ...newRole, base_role: e.target.value })}>{baseRoles.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
              <div className="field" style={{ gridColumn: "1 / -1" }}><label>Descripción</label><input value={newRole.description} onChange={e => setNewRole({ ...newRole, description: e.target.value })} /></div>
              <div><button className="btn btn-primary" disabled={saving}>Crear rol</button></div>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="section-head"><div><h2>{selected ? selected.name : "Permisos"}</h2><div className="muted">Ver · Crear · Editar · Eliminar</div></div><ShieldCheck size={16} /></div>
          {!selected ? <div className="empty">Selecciona un rol.</div> : <>
            <div style={{ overflowX: "auto" }}><table><thead><tr><th>Módulo</th><th>Ver</th><th>Crear</th><th>Editar</th><th>Eliminar</th></tr></thead><tbody>
              {modules.map(m => <tr key={m}><td><strong>{labels[m]}</strong></td>{(["can_view","can_create","can_edit","can_delete"] as const).map(action => <td key={action}><input type="checkbox" checked={permissions[m]?.[action] ?? false} onChange={() => updatePermission(m, action)} /></td>)}</tr>)}
            </tbody></table></div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}><button className="btn btn-primary" onClick={savePermissions} disabled={saving}>{saving ? "Guardando..." : "Guardar permisos"}</button></div>
          </>}
        </div>
      </div>
    </div>
  );
}
