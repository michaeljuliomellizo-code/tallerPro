"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentOrganizationId } from "@/lib/motomil/organization";
import { required } from "@/lib/motomil/validation";

type AppointmentFormData = {
  customer_id: string;
  motorcycle_id: string;
  mechanic_id: string;
  starts_at: string;
  ends_at: string;
  service_type: string;
  status: string;
  notes: string;
};

export default function AppointmentForm({
  initial,
  onSaved,
  onClose,
}: {
  initial?: Partial<AppointmentFormData> & { id?: string };
  onSaved: () => void;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState<AppointmentFormData>({
    customer_id: initial?.customer_id ?? "",
    motorcycle_id: initial?.motorcycle_id ?? "",
    mechanic_id: initial?.mechanic_id ?? "",
    starts_at: initial?.starts_at?.slice(0, 16) ?? "",
    ends_at: initial?.ends_at?.slice(0, 16) ?? "",
    service_type: initial?.service_type ?? "",
    status: initial?.status ?? "scheduled",
    notes: initial?.notes ?? "",
  });
  const [customers, setCustomers] = useState<any[]>([]);
  const [motorcycles, setMotorcycles] = useState<any[]>([]);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const organizationId = await getCurrentOrganizationId();

        const [customersResult, motorcyclesResult, mechanicsResult] = await Promise.all([
          supabase
            .from("customers")
            .select("id,full_name")
            .eq("organization_id", organizationId)
            .eq("active", true)
            .order("full_name"),
          supabase
            .from("motorcycles")
            .select("id,plate,brand,model")
            .eq("organization_id", organizationId)
            .eq("active", true)
            .order("plate"),
          supabase
            .from("mechanics")
            .select("id,full_name")
            .eq("organization_id", organizationId)
            .eq("active", true)
            .order("full_name"),
        ]);

        if (customersResult.error) throw customersResult.error;
        if (motorcyclesResult.error) throw motorcyclesResult.error;
        if (mechanicsResult.error) throw mechanicsResult.error;

        setCustomers(customersResult.data ?? []);
        setMotorcycles(motorcyclesResult.data ?? []);
        setMechanics(mechanicsResult.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No fue posible cargar los datos de la cita.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      setSaving(true);
      const organizationId = await getCurrentOrganizationId();

      required(form.starts_at, "Inicio");

      if (form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
        throw new Error("La hora final debe ser posterior al inicio.");
      }

      const payload = {
        organization_id: organizationId,
        customer_id: form.customer_id || null,
        motorcycle_id: form.motorcycle_id || null,
        mechanic_id: form.mechanic_id || null,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        service_type: form.service_type.trim() || null,
        status: form.status,
        notes: form.notes.trim() || null,
      };

      const query = initial?.id
        ? supabase
            .from("appointments")
            .update(payload)
            .eq("id", initial.id)
            .eq("organization_id", organizationId)
        : supabase.from("appointments").insert(payload);

      const { error: saveError } = await query;
      if (saveError) throw saveError;

      onSaved();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No fue posible guardar la cita.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={save}>
      <div className="section-head">
        <div>
          <div className="eyebrow">Agenda</div>
          <h2>{initial?.id ? "Editar" : "Nueva"} cita</h2>
        </div>
      </div>

      {error && <div className="error-state">{error}</div>}

      <div className="form-grid">
        <div className="field">
          <label>Cliente *</label>
          <select required value={form.customer_id} onChange={(event) => setForm({ ...form, customer_id: event.target.value })} disabled={loading || saving}>
            <option value="">Seleccionar</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Motocicleta</label>
          <select value={form.motorcycle_id} onChange={(event) => setForm({ ...form, motorcycle_id: event.target.value })} disabled={loading || saving}>
            <option value="">Seleccionar</option>
            {motorcycles.map((motorcycle) => <option key={motorcycle.id} value={motorcycle.id}>{motorcycle.plate} — {motorcycle.brand} {motorcycle.model}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Mecánico</label>
          <select value={form.mechanic_id} onChange={(event) => setForm({ ...form, mechanic_id: event.target.value })} disabled={loading || saving}>
            <option value="">Sin asignar</option>
            {mechanics.map((mechanic) => <option key={mechanic.id} value={mechanic.id}>{mechanic.full_name}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Tipo de servicio</label>
          <input value={form.service_type} onChange={(event) => setForm({ ...form, service_type: event.target.value })} disabled={saving} />
        </div>

        <div className="field">
          <label>Inicio *</label>
          <input type="datetime-local" required value={form.starts_at} onChange={(event) => setForm({ ...form, starts_at: event.target.value })} disabled={saving} />
        </div>

        <div className="field">
          <label>Fin</label>
          <input type="datetime-local" value={form.ends_at} onChange={(event) => setForm({ ...form, ends_at: event.target.value })} disabled={saving} />
        </div>

        <div className="field">
          <label>Estado</label>
          <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} disabled={saving}>
            <option value="scheduled">Programada</option>
            <option value="confirmed">Confirmada</option>
            <option value="waiting">En espera</option>
            <option value="completed">Completada</option>
            <option value="cancelled">Cancelada</option>
            <option value="no_show">No asistió</option>
          </select>
        </div>

        <div className="field field-full">
          <label>Notas</label>
          <textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} disabled={saving} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
        <button className="btn btn-primary" disabled={saving || loading}>{saving ? "Guardando..." : "Guardar"}</button>
      </div>
    </form>
  );
}
