"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Plus,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { getCurrentOrganizationId } from "@/lib/motomil/organization";

type Customer = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

type Motorcycle = {
  id: string;
  customer_id: string;
  plate: string | null;
  brand: string | null;
  model: string | null;
};

type Mechanic = {
  id: string;
  full_name: string | null;
  active: boolean;
};

type Appointment = {
  id: string;
  customer_id: string;
  motorcycle_id: string | null;
  mechanic_id: string | null;
  starts_at: string;
  ends_at: string | null;
  service_type: string | null;
  status: string;
  notes: string | null;
};

const STATUS: Record<string, string> = {
  scheduled: "Programada",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

const STATUS_CLASS: Record<string, string> = {
  scheduled: "badge badge-warning",
  confirmed: "badge badge-success",
  completed: "badge badge-success",
  cancelled: "badge badge-danger",
  no_show: "badge badge-danger",
};

export default function AgendaClient() {
  const supabase = createClient();

  const [organizationId, setOrganizationId] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [motorcycles, setMotorcycles] = useState<Record<string, Motorcycle>>({});
  const [mechanics, setMechanics] = useState<Record<string, Mechanic>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));

  const [customerId, setCustomerId] = useState("");
  const [motorcycleId, setMotorcycleId] = useState("");
  const [mechanicId, setMechanicId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [serviceType, setServiceType] = useState("Mantenimiento general");
  const [notes, setNotes] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const orgId = organizationId || (await getCurrentOrganizationId());

      if (!orgId) {
        throw new Error("El usuario no tiene una organización asignada.");
      }

      setOrganizationId(orgId);

      const [appointmentsResult, customersResult, motorcyclesResult, mechanicsResult] =
        await Promise.all([
          supabase
            .from("appointments")
            .select(
              "id, customer_id, motorcycle_id, mechanic_id, starts_at, ends_at, service_type, status, notes"
            )
            .eq("organization_id", orgId)
            .order("starts_at", { ascending: true }),
          supabase
            .from("customers")
            .select("id, full_name, phone")
            .eq("organization_id", orgId)
            .eq("active", true)
            .order("full_name", { ascending: true }),
          supabase
            .from("motorcycles")
            .select("id, customer_id, plate, brand, model")
            .eq("organization_id", orgId)
            .eq("active", true)
            .order("plate", { ascending: true }),
          supabase
            .from("mechanics")
            .select("id, full_name, active")
            .eq("organization_id", orgId)
            .eq("active", true)
            .order("full_name", { ascending: true }),
        ]);

      if (appointmentsResult.error) throw appointmentsResult.error;
      if (customersResult.error) throw customersResult.error;
      if (motorcyclesResult.error) throw motorcyclesResult.error;
      if (mechanicsResult.error) throw mechanicsResult.error;

      setAppointments((appointmentsResult.data ?? []) as Appointment[]);

      const customerMap: Record<string, Customer> = {};
      for (const row of (customersResult.data ?? []) as Customer[]) {
        customerMap[row.id] = row;
      }
      setCustomers(customerMap);

      const motorcycleMap: Record<string, Motorcycle> = {};
      for (const row of (motorcyclesResult.data ?? []) as Motorcycle[]) {
        motorcycleMap[row.id] = row;
      }
      setMotorcycles(motorcycleMap);

      const mechanicMap: Record<string, Mechanic> = {};
      for (const row of (mechanicsResult.data ?? []) as Mechanic[]) {
        mechanicMap[row.id] = row;
      }
      setMechanics(mechanicMap);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No fue posible cargar la agenda."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function resetForm() {
    setCustomerId("");
    setMotorcycleId("");
    setMechanicId("");
    setStartsAt("");
    setDuration("60");
    setServiceType("Mantenimiento general");
    setNotes("");
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    resetForm();
  }

  async function createAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!customerId || !startsAt) {
      setError("Cliente y fecha/hora son obligatorios.");
      return;
    }

    const durationMinutes = Number(duration);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      setError("La duración debe ser mayor que cero.");
      return;
    }

    try {
      setSaving(true);

      const orgId = organizationId || (await getCurrentOrganizationId());
      if (!orgId) throw new Error("No existe organización activa.");

      const startDate = new Date(startsAt);
      const endDate = new Date(
        startDate.getTime() + durationMinutes * 60_000
      );

      const { error: insertError } = await supabase.from("appointments").insert({
        organization_id: orgId,
        customer_id: customerId,
        motorcycle_id: motorcycleId || null,
        mechanic_id: mechanicId || null,
        starts_at: startDate.toISOString(),
        ends_at: endDate.toISOString(),
        service_type: serviceType.trim() || null,
        status: "scheduled",
        notes: notes.trim() || null,
      });

      if (insertError) throw insertError;

      setMessage("Cita creada correctamente.");
      setShowForm(false);
      resetForm();
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No fue posible crear la cita."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id: string, status: string) {
    try {
      setError("");
      setMessage("");

      const { error: updateError } = await supabase
        .from("appointments")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("organization_id", organizationId);

      if (updateError) throw updateError;

      setMessage("Estado actualizado correctamente.");
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible actualizar la cita."
      );
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return appointments.filter((appointment) => {
      const customer = customers[appointment.customer_id];
      const motorcycle = appointment.motorcycle_id
        ? motorcycles[appointment.motorcycle_id]
        : null;

      const localDate = new Date(appointment.starts_at)
        .toLocaleDateString("en-CA");

      const text = `${customer?.full_name ?? ""} ${customer?.phone ?? ""} ${
        motorcycle?.plate ?? ""
      } ${motorcycle?.brand ?? ""} ${motorcycle?.model ?? ""}`.toLowerCase();

      return localDate === day && (!term || text.includes(term));
    });
  }, [appointments, customers, motorcycles, day, search]);

  const motorcyclesForCustomer = useMemo(() => {
    if (!customerId) return [];

    return Object.values(motorcycles).filter(
      (motorcycle) => motorcycle.customer_id === customerId
    );
  }, [motorcycles, customerId]);

  return (
    <div className="page">
      <div className="section-head">
        <div>
          <div className="eyebrow">Gestión</div>
          <h1 className="page-title">Agenda</h1>
          <p className="page-subtitle">
            Programa y controla las citas del taller.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setError("");
            setShowForm(true);
          }}
          style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
        >
          <Plus size={15} />
          Nueva cita
        </button>
      </div>

      {message && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            background: "#effaf6",
            color: "#0c6b58",
            border: "1px solid #b9e4d8",
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            background: "#fff5f5",
            color: "#9b1c1c",
            border: "1px solid #f2b8b8",
          }}
        >
          {error}
        </div>
      )}

      <div className="toolbar">
        <div className="search" style={{ minWidth: 150 }}>
          <CalendarDays size={15} />
          <input
            type="date"
            value={day}
            onChange={(event) => setDay(event.target.value)}
          />
        </div>

        <div className="search" style={{ flex: 1, minWidth: 280 }}>
          <Search size={15} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar cliente, placa o teléfono..."
          />
        </div>

        <button
          className="btn btn-ghost"
          onClick={() => void load()}
          title="Actualizar"
          type="button"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>Citas del día</h2>
            <div className="muted">
              {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="muted">Cargando agenda...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <CalendarDays size={22} />
            <strong>No hay citas para esta fecha.</strong>
            <span className="muted">
              Crea una nueva cita para comenzar a utilizar la agenda.
            </span>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {filtered.map((appointment) => {
              const customer = customers[appointment.customer_id];
              const motorcycle = appointment.motorcycle_id
                ? motorcycles[appointment.motorcycle_id]
                : null;
              const mechanic = appointment.mechanic_id
                ? mechanics[appointment.mechanic_id]
                : null;

              return (
                <div key={appointment.id} className="list-card">
                  <div>
                    <strong
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Clock3 size={15} />
                      {new Date(appointment.starts_at).toLocaleTimeString(
                        "es-CO",
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                      {appointment.ends_at && (
                        <span className="muted">
                          – {new Date(appointment.ends_at).toLocaleTimeString(
                            "es-CO",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </span>
                      )}
                    </strong>

                    <div style={{ marginTop: 6 }}>
                      {customer?.full_name || "Cliente"}
                    </div>

                    <div className="muted">
                      {motorcycle
                        ? `${motorcycle.plate || ""} ${motorcycle.brand || ""} ${motorcycle.model || ""}`
                        : "Sin motocicleta"}
                    </div>

                    {mechanic && (
                      <div className="muted">
                        Mecánico: {mechanic.full_name || "—"}
                      </div>
                    )}

                    {appointment.service_type && (
                      <div className="muted">
                        Servicio: {appointment.service_type}
                      </div>
                    )}

                    {appointment.notes && (
                      <div
                        className="muted"
                        style={{ marginTop: 4 }}
                      >
                        {appointment.notes}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 7,
                      alignItems: "center",
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                    }}
                  >
                    <span
                      className={
                        STATUS_CLASS[appointment.status] || "badge"
                      }
                    >
                      {STATUS[appointment.status] || appointment.status}
                    </span>

                    {appointment.status === "scheduled" && (
                      <button
                        className="btn btn-ghost"
                        onClick={() =>
                          void changeStatus(appointment.id, "confirmed")
                        }
                      >
                        <CheckCircle2 size={13} />
                        Confirmar
                      </button>
                    )}

                    {appointment.status === "confirmed" && (
                      <button
                        className="btn btn-ghost"
                        onClick={() =>
                          void changeStatus(appointment.id, "completed")
                        }
                      >
                        <CheckCircle2 size={13} />
                        Completar
                      </button>
                    )}

                    {(appointment.status === "scheduled" ||
                      appointment.status === "confirmed") && (
                      <button
                        className="btn btn-ghost"
                        onClick={() =>
                          void changeStatus(appointment.id, "cancelled")
                        }
                      >
                        <XCircle size={13} />
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div
          style={modalBackdrop}
          onClick={closeForm}
        >
          <form
            className="card"
            style={modalCard}
            onSubmit={createAppointment}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-head">
              <div>
                <div className="eyebrow">Agenda</div>
                <h2>Nueva cita</h2>
                <p className="page-subtitle">
                  Registra la cita.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeForm}
                disabled={saving}
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="agenda-customer">Cliente *</label>
                <select
                  id="agenda-customer"
                  value={customerId}
                  onChange={(event) => {
                    setCustomerId(event.target.value);
                    setMotorcycleId("");
                  }}
                  required
                >
                  <option value="">Seleccionar cliente</option>
                  {Object.values(customers).map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.full_name || "Cliente sin nombre"}
                      {customer.phone ? ` · ${customer.phone}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="agenda-motorcycle">Motocicleta</label>
                <select
                  id="agenda-motorcycle"
                  value={motorcycleId}
                  onChange={(event) => setMotorcycleId(event.target.value)}
                  disabled={!customerId}
                >
                  <option value="">
                    {customerId
                      ? "Seleccionar motocicleta"
                      : "Primero selecciona un cliente"}
                  </option>
                  {motorcyclesForCustomer.map((motorcycle) => (
                    <option key={motorcycle.id} value={motorcycle.id}>
                      {motorcycle.plate || "Sin placa"} · {motorcycle.brand || "Moto"} {motorcycle.model || ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="agenda-mechanic">Mecánico</label>
                <select
                  id="agenda-mechanic"
                  value={mechanicId}
                  onChange={(event) => setMechanicId(event.target.value)}
                >
                  <option value="">Sin asignar</option>
                  {Object.values(mechanics).map((mechanic) => (
                    <option key={mechanic.id} value={mechanic.id}>
                      {mechanic.full_name || "Mecánico"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="agenda-service">Tipo de servicio</label>
                <input
                  id="agenda-service"
                  value={serviceType}
                  onChange={(event) => setServiceType(event.target.value)}
                  placeholder="Mantenimiento general"
                />
              </div>

              <div className="field">
                <label htmlFor="agenda-start">Fecha y hora *</label>
                <input
                  id="agenda-start"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="agenda-duration">Duración</label>
                <select
                  id="agenda-duration"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                >
                  <option value="30">30 minutos</option>
                  <option value="60">60 minutos</option>
                  <option value="90">90 minutos</option>
                  <option value="120">120 minutos</option>
                  <option value="180">180 minutos</option>
                </select>
              </div>

              <div className="field field-full">
                <label htmlFor="agenda-notes">Notas</label>
                <textarea
                  id="agenda-notes"
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Observaciones de la cita..."
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 18,
              }}
            >
              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeForm}
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                <CalendarDays size={14} />
                {saving ? "Guardando..." : "Guardar cita"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const modalBackdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1100,
  background: "rgba(0,0,0,.45)",
  display: "grid",
  placeItems: "center",
  padding: 18,
};

const modalCard: React.CSSProperties = {
  width: "min(780px, 100%)",
  maxHeight: "90vh",
  overflow: "auto",
};
