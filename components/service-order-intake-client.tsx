"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type ServiceOrderIntakeResult = {
  orderId: string;
  orderNumber?: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (result: ServiceOrderIntakeResult) => void;
};

type Mechanic = {
  id: string;
  full_name: string;
  specialty: string | null;
  active: boolean;
};

type ExistingVehicle = {
  id: string;
  customer_id: string;
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  color: string | null;
  current_km: number;
  customer: {
    id: string;
    full_name: string;
    document_number: string | null;
    phone: string | null;
    whatsapp: string | null;
  } | null;
};

const initialState = {
  plate: "",
  customerName: "",
  documentNumber: "",
  phone: "",
  brand: "",
  model: "",
  year: "",
  color: "",
  mileage: "0",
  mechanicId: "",
  reportedProblem: "",
  observations: "",
  estimatedDeliveryAt: "",
};

function normalizePlate(value: string) {
  return value.trim().toUpperCase();
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function ServiceOrderIntakeClient({
  open,
  onClose,
  onCreated,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState<1 | 2>(1);
  const [plate, setPlate] = useState("");
  const [vehicle, setVehicle] = useState<ExistingVehicle | null>(null);
  const [isNewVehicle, setIsNewVehicle] = useState(false);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [form, setForm] = useState(initialState);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [error, setError] = useState("");

  const update = (field: keyof typeof initialState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  async function getOrganizationId() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error("No existe una sesión activa.");

    const { data, error: organizationError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (organizationError) throw organizationError;
    if (!data?.organization_id) {
      throw new Error("El usuario autenticado no tiene una organización asignada.");
    }

    return data.organization_id as string;
  }

  async function loadMechanics() {
    setLoadingCatalogs(true);

    try {
      const organizationId = await getOrganizationId();
      const { data, error: mechanicsError } = await supabase
        .from("mechanics")
        .select("id, full_name, specialty, active")
        .eq("organization_id", organizationId)
        .eq("active", true)
        .order("full_name");

      if (mechanicsError) throw mechanicsError;
      setMechanics((data ?? []) as Mechanic[]);
    } finally {
      setLoadingCatalogs(false);
    }
  }

  useEffect(() => {
    if (!open) return;

    setStep(1);
    setPlate("");
    setVehicle(null);
    setIsNewVehicle(false);
    setForm(initialState);
    setError("");
    void loadMechanics().catch((err) => {
      setError(errorMessage(err, "No fue posible cargar los mecánicos."));
    });
    // We intentionally reinitialize only when the modal is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function fillFromVehicle(found: ExistingVehicle) {
    setVehicle(found);
    setIsNewVehicle(false);
    setPlate(found.plate);
    setForm({
      ...initialState,
      plate: found.plate,
      mileage: String(found.current_km ?? 0),
    });
    setError("");
    setStep(2);
  }

  async function searchPlate() {
    const normalized = normalizePlate(plate);

    if (!normalized) {
      setError("Ingresa la placa de la motocicleta.");
      return;
    }

    setSearching(true);
    setError("");

    try {
      const organizationId = await getOrganizationId();

      const first = await supabase
        .from("motorcycles")
        .select(
          "id, customer_id, plate, brand, model, year, color, current_km, customer:customers(id, full_name, document_number, phone, whatsapp)"
        )
        .eq("organization_id", organizationId)
        .eq("active", true)
        .eq("plate", normalized)
        .maybeSingle();

      if (first.error) throw first.error;

      if (first.data) {
        fillFromVehicle({
          ...first.data,
          customer: Array.isArray(first.data.customer)
            ? first.data.customer[0]
            : first.data.customer,
        } as ExistingVehicle);
        return;
      }

      const { data: relaxedMatch, error: relaxedError } = await supabase
        .from("motorcycles")
        .select(
          "id, customer_id, plate, brand, model, year, color, current_km, customer:customers(id, full_name, document_number, phone, whatsapp)"
        )
        .eq("organization_id", organizationId)
        .eq("active", true)
        .ilike("plate", normalized)
        .maybeSingle();

      if (relaxedError) throw relaxedError;

      if (relaxedMatch) {
        fillFromVehicle({
          ...relaxedMatch,
          customer: Array.isArray(relaxedMatch.customer)
            ? relaxedMatch.customer[0]
            : relaxedMatch.customer,
        } as ExistingVehicle);
        return;
      }

      setVehicle(null);
      setIsNewVehicle(true);
      setPlate(normalized);
      setForm((current) => ({
        ...current,
        plate: normalized,
      }));
      setStep(2);
      setError("");
    } catch (err) {
      setError(errorMessage(err, "No fue posible consultar la placa."));
    } finally {
      setSearching(false);
    }
  }

  async function createOrder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const organizationId = await getOrganizationId();
      const mileage = Number(form.mileage);

      if (!Number.isFinite(mileage) || mileage < 0) {
        throw new Error("El kilometraje debe ser un número válido.");
      }

      const estimatedDeliveryAt = form.estimatedDeliveryAt
        ? new Date(form.estimatedDeliveryAt)
        : null;

      if (
        estimatedDeliveryAt &&
        Number.isNaN(estimatedDeliveryAt.getTime())
      ) {
        throw new Error("La fecha de entrega estimada no es válida.");
      }

      if (isNewVehicle) {
        if (!form.customerName.trim()) {
          throw new Error("Ingresa el nombre completo del cliente.");
        }

        if (!form.brand.trim()) {
          throw new Error("Ingresa la marca de la motocicleta.");
        }

        if (!form.model.trim()) {
          throw new Error("Ingresa el modelo de la motocicleta.");
        }

        const { data, error: rpcError } = await supabase.rpc(
          "create_service_order_quick",
          {
            p_plate: normalizePlate(form.plate),
            p_customer_full_name: form.customerName.trim(),
            p_customer_document_number:
              form.documentNumber.trim() || null,
            p_customer_phone: form.phone.trim() || null,
            p_motorcycle_brand: form.brand.trim(),
            p_motorcycle_model: form.model.trim(),
            p_motorcycle_year: form.year.trim()
              ? Number(form.year)
              : null,
            p_motorcycle_color: form.color.trim() || null,
            p_current_km: mileage,
            p_mechanic_id: form.mechanicId || null,
            p_reported_problem: form.reportedProblem.trim() || null,
            p_observations: form.observations.trim() || null,
            p_estimated_delivery_at: estimatedDeliveryAt
              ? estimatedDeliveryAt.toISOString()
              : null,
          }
        );

        if (rpcError) throw rpcError;

        onCreated({ orderId: data as string });
        return;
      }

      if (!vehicle) {
        throw new Error("Primero identifica la motocicleta por placa.");
      }

      const { data, error: insertError } = await supabase
        .from("service_orders")
        .insert({
          organization_id: organizationId,
          customer_id: vehicle.customer_id,
          motorcycle_id: vehicle.id,
          mechanic_id: form.mechanicId || null,
          status: "received",
          mileage,
          reported_problem: form.reportedProblem.trim() || null,
          observations: form.observations.trim() || null,
          estimated_delivery_at: estimatedDeliveryAt
            ? estimatedDeliveryAt.toISOString()
            : null,
        })
        .select("id, order_number")
        .single();

      if (insertError) throw insertError;

      onCreated({
        orderId: data.id as string,
        orderNumber: data.order_number as number,
      });
    } catch (err) {
      const message = errorMessage(
        err,
        "No fue posible crear la orden de servicio."
      );

      if (message.toLowerCase().includes("duplicate") || message.toLowerCase().includes("unique")) {
        setError(
          "La placa ya existe en el taller. Regresa y búscala nuevamente para continuar con la motocicleta registrada."
        );
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const title = step === 1 ? "Identificar motocicleta" : "Datos de la orden";
  const customerName = vehicle?.customer?.full_name ?? "";

  return (
    <div style={modalBackdrop}>
      <div className="card" style={modal}>
        <div className="section-head">
          <div>
            <div className="eyebrow">Nueva orden</div>
            <h2>{title}</h2>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>
              {step === 1
                ? "Comienza con la placa. TallerPro buscará la motocicleta y su cliente antes de continuar."
                : isNewVehicle
                ? "La placa no existe. Registra solo los datos mínimos y continúa inmediatamente con la orden."
                : "La motocicleta ya existe. Revisa los datos y continúa con la recepción."}
            </p>
          </div>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
          >
            <X size={15} />
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 8,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              borderRadius: 10,
              padding: "9px 11px",
              background: step === 1 ? "#edf4ff" : "#f4f7f6",
              color: step === 1 ? "#204b83" : "#687270",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            1. Placa
          </div>
          <div
            style={{
              borderRadius: 10,
              padding: "9px 11px",
              background: step === 2 ? "#edf4ff" : "#f4f7f6",
              color: step === 2 ? "#204b83" : "#687270",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            2. Orden
          </div>
        </div>

        {step === 1 ? (
          <div>
            <div className="field">
              <label>Placa de la motocicleta *</label>
              <input
                autoFocus
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void searchPlate();
                  }
                }}
                placeholder="ABC123"
                maxLength={12}
                disabled={searching}
              />
            </div>

            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                background: "#f7f9f8",
                color: "#687270",
                fontSize: 12,
              }}
            >
              Escribe la placa y pulsa <strong>Buscar</strong>. Si la moto existe,
              TallerPro cargará automáticamente el cliente y los datos de la moto.
              Si no existe, podrás registrarlos sin salir del proceso.
            </div>

            {error && <ErrorBox>{error}</ErrorBox>}

            <div style={actionsRow}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onClose}
                disabled={searching}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void searchPlate()}
                disabled={searching || !plate.trim()}
              >
                <Search size={15} />
                {searching ? "Buscando..." : "Buscar placa"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={createOrder}>
            {vehicle && (
              <div
                style={{
                  padding: 13,
                  borderRadius: 10,
                  background: "#eef9f4",
                  border: "1px solid #d6eee2",
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#156b4e",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  <CheckCircle2 size={15} />
                  Motocicleta encontrada
                </div>
                <div style={{ marginTop: 7, fontSize: 13, fontWeight: 700 }}>
                  {vehicle.plate} · {vehicle.brand} {vehicle.model}
                </div>
                <div style={{ marginTop: 4, color: "#687270", fontSize: 12 }}>
                  Cliente: {customerName || "—"}
                  {vehicle.customer?.phone ? ` · ${vehicle.customer.phone}` : ""}
                </div>
              </div>
            )}

            {isNewVehicle && (
              <>
                <div
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background: "#fffaf0",
                    border: "1px solid #f0dfb6",
                    marginBottom: 14,
                    color: "#785f22",
                    fontSize: 12,
                  }}
                >
                  La placa <strong>{form.plate}</strong> no está registrada. Completa los
                  datos mínimos del cliente y de la motocicleta. El resto podrá ampliarse
                  después desde sus respectivos módulos.
                </div>

                <div className="form-grid">
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <label>Nombre completo del cliente *</label>
                    <input
                      required
                      value={form.customerName}
                      onChange={(e) => update("customerName", e.target.value)}
                      placeholder="Nombre del cliente"
                      disabled={saving}
                    />
                  </div>

                  <div className="field">
                    <label>Documento</label>
                    <input
                      value={form.documentNumber}
                      onChange={(e) => update("documentNumber", e.target.value)}
                      placeholder="Cédula / NIT"
                      disabled={saving}
                    />
                  </div>

                  <div className="field">
                    <label>Teléfono / WhatsApp</label>
                    <input
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="300 000 0000"
                      disabled={saving}
                    />
                  </div>

                  <div className="field">
                    <label>Marca *</label>
                    <input
                      required
                      value={form.brand}
                      onChange={(e) => update("brand", e.target.value)}
                      placeholder="Yamaha"
                      disabled={saving}
                    />
                  </div>

                  <div className="field">
                    <label>Modelo *</label>
                    <input
                      required
                      value={form.model}
                      onChange={(e) => update("model", e.target.value)}
                      placeholder="FZ 2.0"
                      disabled={saving}
                    />
                  </div>

                  <div className="field">
                    <label>Año</label>
                    <input
                      type="number"
                      min="1950"
                      max="2100"
                      value={form.year}
                      onChange={(e) => update("year", e.target.value)}
                      placeholder="2026"
                      disabled={saving}
                    />
                  </div>

                  <div className="field">
                    <label>Color</label>
                    <input
                      value={form.color}
                      onChange={(e) => update("color", e.target.value)}
                      placeholder="Negro"
                      disabled={saving}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-grid" style={{ marginTop: isNewVehicle ? 16 : 0 }}>
              <div className="field">
                <label>Placa *</label>
                <input value={form.plate} readOnly />
              </div>

              <div className="field">
                <label>Kilometraje de recepción *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.mileage}
                  onChange={(e) => update("mileage", e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="field">
                <label>Mecánico</label>
                <select
                  value={form.mechanicId}
                  onChange={(e) => update("mechanicId", e.target.value)}
                  disabled={saving || loadingCatalogs}
                >
                  <option value="">Sin asignar</option>
                  {mechanics.map((mechanic) => (
                    <option key={mechanic.id} value={mechanic.id}>
                      {mechanic.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Entrega estimada</label>
                <input
                  type="datetime-local"
                  value={form.estimatedDeliveryAt}
                  onChange={(e) => update("estimatedDeliveryAt", e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Problema reportado</label>
                <textarea
                  rows={3}
                  value={form.reportedProblem}
                  onChange={(e) => update("reportedProblem", e.target.value)}
                  placeholder="Describe brevemente el motivo de la visita..."
                  disabled={saving}
                />
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Observaciones de recepción</label>
                <textarea
                  rows={3}
                  value={form.observations}
                  onChange={(e) => update("observations", e.target.value)}
                  placeholder="Daños visibles, accesorios, combustible, recomendaciones..."
                  disabled={saving}
                />
              </div>
            </div>

            {error && <ErrorBox>{error}</ErrorBox>}

            <div style={actionsRow}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setStep(1);
                  setError("");
                }}
                disabled={saving}
              >
                <ArrowLeft size={15} />
                Cambiar placa
              </button>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={onClose}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Creando..." : "Crear orden y continuar"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </div>
  );
}

const modalBackdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.45)",
  display: "grid",
  placeItems: "center",
  zIndex: 100,
  padding: 18,
};

const modal: React.CSSProperties = {
  width: "min(840px, 100%)",
  maxHeight: "92vh",
  overflowY: "auto",
};

const actionsRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  marginTop: 18,
  flexWrap: "wrap",
};
