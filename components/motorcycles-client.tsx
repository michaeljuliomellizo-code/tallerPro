"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bike,
  ChevronRight,
  Edit3,
  Eye,
  Plus,
  Search,
  X,
  Power,
  RotateCcw,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Status } from "@/components/module-page";

type Customer = {
  id: string;
  full_name: string;
  phone: string | null;
};

type Motorcycle = {
  id: string;
  organization_id: string;
  customer_id: string;
  plate: string;
  vin: string | null;
  brand: string;
  model: string;
  year: number | null;
  color: string | null;
  engine_cc: number | null;
  current_km: number;
  next_maintenance_km: number | null;
  next_maintenance_date: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  customer?: Customer | Customer[] | null;
};

type FormState = {
  customer_id: string;
  plate: string;
  vin: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  engine_cc: string;
  current_km: string;
  next_maintenance_km: string;
  next_maintenance_date: string;
  notes: string;
};

const emptyForm: FormState = {
  customer_id: "",
  plate: "",
  vin: "",
  brand: "",
  model: "",
  year: "",
  color: "",
  engine_cc: "",
  current_km: "0",
  next_maintenance_km: "",
  next_maintenance_date: "",
  notes: "",
};

function getCustomer(motorcycle: Motorcycle): Customer | null {
  if (!motorcycle.customer) {
    return null;
  }

  if (Array.isArray(motorcycle.customer)) {
    return motorcycle.customer[0] ?? null;
  }

  return motorcycle.customer;
}

export default function MotorcyclesClient() {
  const supabase = createClient();

  const [rows, setRows] = useState<Motorcycle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Motorcycle | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);

  async function getOrganizationId() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("No hay un usuario autenticado.");
    }

    const { data: membership, error } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!membership?.organization_id) {
      throw new Error(
        "El usuario autenticado no tiene una organización asignada."
      );
    }

    return membership.organization_id;
  }

  async function loadCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select("id, full_name, phone")
      .eq("active", true)
      .order("full_name");

    if (error) {
      throw error;
    }

    setCustomers(data ?? []);
  }

  async function loadMotorcycles() {
    setLoading(true);
    setError("");

    try {
      const organizationId = await getOrganizationId();

      const { data, error } = await supabase
        .from("motorcycles")
        .select(`
          id,
          organization_id,
          customer_id,
          plate,
          vin,
          brand,
          model,
          year,
          color,
          engine_cc,
          current_km,
          next_maintenance_km,
          next_maintenance_date,
          notes,
          active,
          created_at,
          updated_at,
          customer:customers (
            id,
            full_name,
            phone
          )
        `)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setRows((data ?? []) as Motorcycle[]);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar las motocicletas."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        await Promise.all([loadMotorcycles(), loadCustomers()]);
      } catch (err) {
        console.error(err);
      }
    }

    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return rows;

    return rows.filter((m) => {
      const customerName = getCustomer(m)?.full_name ?? "";

      return [
        m.plate,
        m.brand,
        m.model,
        m.vin ?? "",
        customerName,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, query]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setMessage("");
    setOpen(true);
  }

  function openEdit(motorcycle: Motorcycle) {
    setEditing(motorcycle);

    setForm({
      customer_id: motorcycle.customer_id,
      plate: motorcycle.plate,
      vin: motorcycle.vin ?? "",
      brand: motorcycle.brand,
      model: motorcycle.model,
      year: motorcycle.year?.toString() ?? "",
      color: motorcycle.color ?? "",
      engine_cc: motorcycle.engine_cc?.toString() ?? "",
      current_km: motorcycle.current_km.toString(),
      next_maintenance_km:
        motorcycle.next_maintenance_km?.toString() ?? "",
      next_maintenance_date:
        motorcycle.next_maintenance_date ?? "",
      notes: motorcycle.notes ?? "",
    });

    setError("");
    setMessage("");
    setOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setError("");
  }

  function updateField(
    field: keyof FormState,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const organizationId = await getOrganizationId();

      if (!form.customer_id) {
        throw new Error("Debes seleccionar un cliente.");
      }

      if (!form.plate.trim()) {
        throw new Error("La placa es obligatoria.");
      }

      if (!form.brand.trim()) {
        throw new Error("La marca es obligatoria.");
      }

      if (!form.model.trim()) {
        throw new Error("El modelo es obligatorio.");
      }

      const payload = {
        organization_id: organizationId,
        customer_id: form.customer_id,
        plate: form.plate.trim().toUpperCase(),
        vin: form.vin.trim() || null,
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: form.year ? Number(form.year) : null,
        color: form.color.trim() || null,
        engine_cc: form.engine_cc
          ? Number(form.engine_cc)
          : null,
        current_km: Number(form.current_km || 0),
        next_maintenance_km: form.next_maintenance_km
          ? Number(form.next_maintenance_km)
          : null,
        next_maintenance_date:
          form.next_maintenance_date || null,
        notes: form.notes.trim() || null,
      };

      if (editing) {
        const { error } = await supabase
          .from("motorcycles")
          .update(payload)
          .eq("id", editing.id)
          .eq("organization_id", organizationId);

        if (error) {
          throw error;
        }

        setMessage("Motocicleta actualizada correctamente.");
      } else {
        const { error } = await supabase
          .from("motorcycles")
          .insert(payload);

        if (error) {
          if (error.code === "23505") {
            throw new Error(
              "Ya existe una motocicleta con esa placa en este taller."
            );
          }

          throw error;
        }

        setMessage("Motocicleta registrada correctamente.");
      }

      setOpen(false);
      setEditing(null);
      setForm(emptyForm);

      await loadMotorcycles();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible guardar la motocicleta."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(motorcycle: Motorcycle) {
    const action = motorcycle.active ? "desactivar" : "reactivar";

    const confirmed = window.confirm(
      `¿Deseas ${action} la motocicleta ${motorcycle.plate}?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const organizationId = await getOrganizationId();

      const { error } = await supabase
        .from("motorcycles")
        .update({
          active: !motorcycle.active,
        })
        .eq("id", motorcycle.id)
        .eq("organization_id", organizationId);

      if (error) {
        throw error;
      }

      setMessage(
        motorcycle.active
          ? "Motocicleta desactivada correctamente."
          : "Motocicleta reactivada correctamente."
      );

      await loadMotorcycles();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible actualizar el estado."
      );
    }
  }

  function maintenanceStatus(motorcycle: Motorcycle) {
    if (!motorcycle.active) {
      return {
        label: "Inactiva",
        tone: "gray" as const,
      };
    }

    const kmRemaining =
      motorcycle.next_maintenance_km !== null
        ? motorcycle.next_maintenance_km -
          motorcycle.current_km
        : null;

    const today = new Date();
    const maintenanceDate = motorcycle.next_maintenance_date
      ? new Date(`${motorcycle.next_maintenance_date}T00:00:00`)
      : null;

    if (
      (kmRemaining !== null && kmRemaining <= 0) ||
      (maintenanceDate && maintenanceDate < today)
    ) {
      return {
        label: "Mantenimiento vencido",
        tone: "red" as const,
      };
    }

    if (
      (kmRemaining !== null && kmRemaining <= 500) ||
      (maintenanceDate &&
        maintenanceDate.getTime() - today.getTime() <
          30 * 24 * 60 * 60 * 1000)
    ) {
      return {
        label: "Mantenimiento próximo",
        tone: "yellow" as const,
      };
    }

    return {
      label: "Activa",
      tone: "green" as const,
    };
  }

  return (
    <>
      <div className="section-head">
        <div>
          <div className="eyebrow">Activo principal</div>

          <h1 className="page-title">Motocicletas</h1>

          <p className="page-subtitle">
            Historial digital por placa, propietario,
            kilometraje, servicios y mantenimiento.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={openCreate}
        >
          <Plus size={15} />
          Registrar motocicleta
        </button>
      </div>

      <div className="toolbar">
        <div className="search">
          <Search size={15} />

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar placa, marca, modelo o propietario..."
          />
        </div>
      </div>

      {message && (
        <div
          style={{
            marginBottom: 14,
            padding: "10px 12px",
            borderRadius: 8,
            background: "#e9f8f2",
            color: "#146c50",
            fontSize: 12,
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: 14,
            padding: "10px 12px",
            borderRadius: 8,
            background: "#fff0f0",
            color: "#a52222",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="card">
          <div style={{ padding: 30, textAlign: "center" }}>
            Cargando motocicletas...
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "#737c7a",
            }}
          >
            <Bike
              size={34}
              style={{ margin: "0 auto 10px", opacity: 0.45 }}
            />

            <div style={{ fontWeight: 700 }}>
              No hay motocicletas
            </div>

            <div
              style={{
                fontSize: 12,
                marginTop: 5,
              }}
            >
              Registra la primera motocicleta del taller.
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-2">
          {filtered.map((m) => {
            const status = maintenanceStatus(m);

            return (
              <div className="card" key={m.id}>
                <div
                  style={{
                    display: "flex",
                    gap: 15,
                  }}
                >
                  <div
                    style={{
                      width: 110,
                      height: 90,
                      borderRadius: 12,
                      overflow: "hidden",
                      background: "#ecefed",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Bike
                      size={40}
                      style={{ opacity: 0.35 }}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div>
                        <h2
                          style={{
                            fontSize: 16,
                            margin: "0 0 3px",
                          }}
                        >
                          {m.brand} {m.model}
                        </h2>

                        <div
                          style={{
                            fontSize: 11,
                            color: "#727b79",
                          }}
                        >
                          {m.plate}
                          {" · "}
                          {m.year ?? "Año no registrado"}
                        </div>

                        <div
                          style={{
                            fontSize: 11,
                            color: "#727b79",
                            marginTop: 3,
                          }}
                        >
                          {getCustomer(m)?.full_name ??
                            "Cliente no disponible"}
                        </div>
                      </div>

                      <Status tone={status.tone}>
                        {status.label}
                      </Status>
                    </div>

                    <div
                      className="grid grid-3"
                      style={{
                        marginTop: 14,
                        gap: 8,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 9,
                            color: "#89918f",
                          }}
                        >
                          Kilometraje
                        </div>

                        <strong style={{ fontSize: 13 }}>
                          {m.current_km.toLocaleString(
                            "es-CO"
                          )}{" "}
                          km
                        </strong>
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: 9,
                            color: "#89918f",
                          }}
                        >
                          Próximo
                        </div>

                        <strong style={{ fontSize: 13 }}>
                          {m.next_maintenance_km
                            ? `${m.next_maintenance_km.toLocaleString(
                                "es-CO"
                              )} km`
                            : "No definido"}
                        </strong>
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: 9,
                            color: "#89918f",
                          }}
                        >
                          Cilindraje
                        </div>

                        <strong style={{ fontSize: 13 }}>
                          {m.engine_cc
                            ? `${m.engine_cc} cc`
                            : "—"}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    borderTop: "1px solid #eef1f0",
                    marginTop: 14,
                    paddingTop: 12,
                  }}
                >
                  <Link
                    href={`/motocicletas/${m.id}`}
                    className="btn btn-ghost"
                  >
                    <Eye size={14} />
                    Abrir ficha
                    <ChevronRight size={14} />
                  </Link>

                  <button
                    className="btn btn-ghost"
                    onClick={() => openEdit(m)}
                  >
                    <Edit3 size={14} />
                    Editar
                  </button>

                  <button
                    className="btn btn-ghost"
                    onClick={() => toggleActive(m)}
                  >
                    {m.active ? (
                      <>
                        <Power size={14} />
                        Desactivar
                      </>
                    ) : (
                      <>
                        <RotateCcw size={14} />
                        Reactivar
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <div style={modalBackdrop}>
          <form
            onSubmit={save}
            className="card"
            style={modal}
          >
            <div className="section-head">
              <div>
                <div className="eyebrow">
                  {editing
                    ? "Actualización"
                    : "Nuevo registro"}
                </div>

                <h2>
                  {editing
                    ? "Editar motocicleta"
                    : "Registrar motocicleta"}
                </h2>
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeModal}
              >
                <X size={15} />
              </button>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Propietario *</label>

                <select
                  required
                  value={form.customer_id}
                  onChange={(e) =>
                    updateField(
                      "customer_id",
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Seleccionar cliente...
                  </option>

                  {customers.map((customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.full_name}
                      {customer.phone
                        ? ` · ${customer.phone}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Placa *</label>

                <input
                  required
                  value={form.plate}
                  onChange={(e) =>
                    updateField(
                      "plate",
                      e.target.value.toUpperCase()
                    )
                  }
                  placeholder="ABC123"
                />
              </div>

              <div className="field">
                <label>Marca *</label>

                <input
                  required
                  value={form.brand}
                  onChange={(e) =>
                    updateField(
                      "brand",
                      e.target.value
                    )
                  }
                  placeholder="Yamaha"
                />
              </div>

              <div className="field">
                <label>Modelo *</label>

                <input
                  required
                  value={form.model}
                  onChange={(e) =>
                    updateField(
                      "model",
                      e.target.value
                    )
                  }
                  placeholder="FZ 2.0"
                />
              </div>

              <div className="field">
                <label>Año</label>

                <input
                  type="number"
                  min="1900"
                  max="2100"
                  value={form.year}
                  onChange={(e) =>
                    updateField(
                      "year",
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="field">
                <label>Cilindraje (cc)</label>

                <input
                  type="number"
                  min="1"
                  value={form.engine_cc}
                  onChange={(e) =>
                    updateField(
                      "engine_cc",
                      e.target.value
                    )
                  }
                  placeholder="150"
                />
              </div>

              <div className="field">
                <label>Color</label>

                <input
                  value={form.color}
                  onChange={(e) =>
                    updateField(
                      "color",
                      e.target.value
                    )
                  }
                  placeholder="Negro"
                />
              </div>

              <div className="field">
                <label>VIN / Chasis</label>

                <input
                  value={form.vin}
                  onChange={(e) =>
                    updateField(
                      "vin",
                      e.target.value.toUpperCase()
                    )
                  }
                />
              </div>

              <div className="field">
                <label>Kilometraje actual</label>

                <input
                  type="number"
                  min="0"
                  required
                  value={form.current_km}
                  onChange={(e) =>
                    updateField(
                      "current_km",
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="field">
                <label>Próximo mantenimiento (km)</label>

                <input
                  type="number"
                  min="0"
                  value={form.next_maintenance_km}
                  onChange={(e) =>
                    updateField(
                      "next_maintenance_km",
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="field">
                <label>Próximo mantenimiento</label>

                <input
                  type="date"
                  value={form.next_maintenance_date}
                  onChange={(e) =>
                    updateField(
                      "next_maintenance_date",
                      e.target.value
                    )
                  }
                />
              </div>

              <div
                className="field"
                style={{
                  gridColumn: "1 / -1",
                }}
              >
                <label>Observaciones</label>

                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) =>
                    updateField(
                      "notes",
                      e.target.value
                    )
                  }
                  placeholder="Información adicional..."
                />
              </div>
            </div>

            {error && (
              <div
                style={{
                  marginTop: 14,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "#fff0f0",
                  color: "#a52222",
                  fontSize: 12,
                }}
              >
                {error}
              </div>
            )}

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
                onClick={closeModal}
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                <Bike size={15} />

                {saving
                  ? "Guardando..."
                  : editing
                  ? "Guardar cambios"
                  : "Registrar motocicleta"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

const modalBackdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.45)",
  display: "grid",
  placeItems: "center",
  zIndex: 40,
  padding: 18,
  overflowY: "auto",
};

const modal: React.CSSProperties = {
  width: "min(760px, 100%)",
  maxHeight: "calc(100vh - 36px)",
  overflowY: "auto",
};