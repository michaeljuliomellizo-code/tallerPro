"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  FileText,
  Gauge,
  UserRound,
  Wrench,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Status, Timeline } from "@/components/module-page";
import { money } from "@/lib/utils";
import ServiceOrderPhotos from "@/components/service-order-photos-client";
import ServiceOrderPartsClient from "@/components/service-order-parts-client";
import ServiceOrderLaborClient from "@/components/service-order-labor-client";
import TecnomecanicaAlert from "@/components/tecnomecanica-alert";

type OrderStatus =
  | "received"
  | "diagnosis"
  | "quote"
  | "approved"
  | "repair"
  | "quality"
  | "ready"
  | "delivered"
  | "cancelled";

type Customer = {
  id: string;
  full_name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
};

type Motorcycle = {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  current_km: number;
  tecnomecanica_date: string | null;
};

type Mechanic = {
  id: string;
  full_name: string;
  specialty: string | null;
  phone: string | null;
};

type ServiceOrderItem = {
  id: string;
  item_type: "service" | "part" | "labor" | "other";
  mechanic_id: string | null;
  inventory_product_id: string | null;
  description: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  created_at: string;
};

type ServiceOrder = {
  id: string;
  organization_id: string;
  order_number: number;
  customer_id: string;
  motorcycle_id: string;
  mechanic_id: string | null;
  status: OrderStatus;
  mileage: number;
  reported_problem: string | null;
  diagnosis: string | null;
  observations: string | null;
  received_at: string;
  estimated_delivery_at: string | null;
  delivered_at: string | null;
  subtotal: number;
  tax: number;
  total: number;
  created_at: string;
  updated_at: string;
  customer: Customer | Customer[] | null;
  motorcycle: Motorcycle | Motorcycle[] | null;
  mechanic: Mechanic | Mechanic[] | null;
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Recibida",
  diagnosis: "Diagnóstico",
  quote: "Cotización",
  approved: "Aprobada",
  repair: "Reparación",
  quality: "Calidad",
  ready: "Lista",
  delivered: "Entregada",
  cancelled: "Cancelada",
};

const STATUS_TONES: Record<
  OrderStatus,
  "green" | "blue" | "yellow" | "gray" | "red"
> = {
  received: "yellow",
  diagnosis: "yellow",
  quote: "yellow",
  approved: "blue",
  repair: "blue",
  quality: "blue",
  ready: "green",
  delivered: "green",
  cancelled: "red",
};

const STATUS_FLOW: OrderStatus[] = [
  "received",
  "diagnosis",
  "quote",
  "approved",
  "repair",
  "quality",
  "ready",
  "delivered",
];

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatDate(value: string | null) {
  if (!value) return "No definida";

  return new Date(value).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) return "No definida";

  return new Date(value).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function OrdersDetailClient({
  orderId,
}: {
  orderId: string;
}) {
  const supabase = useMemo(() => createClient(), []);

  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [orderItems, setOrderItems] = useState<ServiceOrderItem[]>([]);

  const [reportedProblem, setReportedProblem] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [observations, setObservations] = useState("");
  const [mileage, setMileage] = useState("0");
  const [mechanicId, setMechanicId] = useState("");
  const [status, setStatus] =
    useState<OrderStatus>("received");
  const [estimatedDelivery, setEstimatedDelivery] =
    useState("");
  const [tecnomecanicaDate, setTecnomecanicaDate] =
    useState("");
  const [savingTecnomecanica, setSavingTecnomecanica] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const customer = one(order?.customer);
  const motorcycle = one(order?.motorcycle);
  const mechanic = one(order?.mechanic);

  const currentTimelineIndex = Math.max(
    0,
    STATUS_FLOW.indexOf(status)
  );

  async function loadOrder() {
    const { data, error } = await supabase
      .from("service_orders")
      .select(`
        id,
        organization_id,
        order_number,
        customer_id,
        motorcycle_id,
        mechanic_id,
        status,
        mileage,
        reported_problem,
        diagnosis,
        observations,
        received_at,
        estimated_delivery_at,
        delivered_at,
        subtotal,
        tax,
        total,
        created_at,
        updated_at,
        customer:customers (
          id,
          full_name,
          phone,
          whatsapp,
          email
        ),
        motorcycle:motorcycles (
          id,
          plate,
          brand,
          model,
          year,
          current_km,
          tecnomecanica_date
        ),
        mechanic:mechanics (
          id,
          full_name,
          specialty,
          phone
        )
      `)
      .eq("id", orderId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error(
        "La orden solicitada no existe o no está disponible."
      );
    }

    const normalized = data as ServiceOrder;

    setOrder(normalized);
    setReportedProblem(
      normalized.reported_problem ?? ""
    );
    setDiagnosis(normalized.diagnosis ?? "");
    setObservations(
      normalized.observations ?? ""
    );
    setMileage(
      normalized.mileage?.toString() ?? "0"
    );
    setMechanicId(normalized.mechanic_id ?? "");
    setStatus(normalized.status);
    setEstimatedDelivery(
      normalized.estimated_delivery_at
        ? toDateTimeLocal(
            normalized.estimated_delivery_at
          )
        : ""
    );
    const loadedMotorcycle = one(normalized.motorcycle);
    setTecnomecanicaDate(loadedMotorcycle?.tecnomecanica_date ?? "");

    const { data: itemsData, error: itemsError } = await supabase
      .from("service_order_items")
      .select("id, item_type, mechanic_id, inventory_product_id, description, quantity, unit_cost, unit_price, created_at")
      .eq("service_order_id", normalized.id)
      .order("created_at", { ascending: true });

    if (itemsError) throw itemsError;
    setOrderItems((itemsData ?? []) as ServiceOrderItem[]);
  }

  async function loadMechanics() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      throw new Error("No existe una sesión activa.");
    }

    const { data: membership, error: membershipError } =
      await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (membershipError) throw membershipError;

    if (!membership?.organization_id) {
      throw new Error(
        "El usuario autenticado no tiene una organización asignada."
      );
    }

    const { data, error } = await supabase
      .from("mechanics")
      .select(
        "id, full_name, specialty, phone"
      )
      .eq(
        "organization_id",
        membership.organization_id
      )
      .eq("active", true)
      .order("full_name");

    if (error) throw error;

    setMechanics(data ?? []);
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        await Promise.all([
          loadOrder(),
          loadMechanics(),
        ]);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "No fue posible cargar la orden."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [orderId]);

  async function saveChanges() {
    if (!order) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const parsedMileage = Number(mileage);

      if (!Number.isFinite(parsedMileage)) {
        throw new Error(
          "El kilometraje no es válido."
        );
      }

      if (parsedMileage < 0) {
        throw new Error(
          "El kilometraje no puede ser negativo."
        );
      }

      const estimatedDeliveryValue =
        estimatedDelivery
            ? new Date(estimatedDelivery)
            : null;

        if (
        estimatedDeliveryValue &&
        Number.isNaN(
            estimatedDeliveryValue.getTime()
        )
        ) {
        throw new Error(
            "La fecha de entrega estimada no es válida."
        );
        }

        const deliveredAt =
        status === "delivered"
            ? order.delivered_at ??
            new Date().toISOString()
            : null;

        const { data, error } = await supabase
        .from("service_orders")
        .update({
            mechanic_id: mechanicId || null,
            status,
            mileage: parsedMileage,
            reported_problem:
            reportedProblem.trim() || null,
            diagnosis:
            diagnosis.trim() || null,
            observations:
            observations.trim() || null,
            estimated_delivery_at:
            estimatedDeliveryValue
                ? estimatedDeliveryValue.toISOString()
                : null,
            delivered_at: deliveredAt,
        })

        .eq("id", order.id)
        .select(`
          id,
          organization_id,
          order_number,
          customer_id,
          motorcycle_id,
          mechanic_id,
          status,
          mileage,
          reported_problem,
          diagnosis,
          observations,
          received_at,
          estimated_delivery_at,
          delivered_at,
          subtotal,
          tax,
          total,
          created_at,
          updated_at,
          customer:customers (
            id,
            full_name,
            phone,
            whatsapp,
            email
          ),
          motorcycle:motorcycles (
            id,
            plate,
            brand,
            model,
            year,
            current_km,
            tecnomecanica_date
          ),
          mechanic:mechanics (
            id,
            full_name,
            specialty,
            phone
          )
        `)
        .single();

      if (error) throw error;

      setOrder(data as ServiceOrder);
      setMechanicId(data.mechanic_id ?? "");
      setStatus(data.status);

      setMessage(
        "Orden actualizada correctamente."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible guardar los cambios."
      );
    } finally {
      setSaving(false);
    }
  }

  const laborItems = orderItems.filter(
    (item) => item.item_type === "service" || item.item_type === "labor"
  );

  const partItems = orderItems.filter((item) => item.item_type === "part");

  const laborSale = laborItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
    0,
  );

  const partsSale = partItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
    0,
  );

  const partsCost = partItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_cost || 0),
    0,
  );

  const directCosts = partsCost;
  const orderSubtotal = Number(order?.subtotal || 0);
  const grossProfit = orderSubtotal - directCosts;
  const grossMargin = orderSubtotal > 0 ? (grossProfit / orderSubtotal) * 100 : 0;

  async function saveTecnomecanicaDate() {
    if (!motorcycle) return;

    try {
      setSavingTecnomecanica(true);
      setError("");
      setMessage("");

      const { error } = await supabase
        .from("motorcycles")
        .update({
          tecnomecanica_date: tecnomecanicaDate || null,
        })
        .eq("id", motorcycle.id);

      if (error) throw error;

      setMessage("Fecha de tecnomecánica actualizada correctamente.");
      await loadOrder();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible guardar la fecha de tecnomecánica."
      );
    } finally {
      setSavingTecnomecanica(false);
    }
  }

  const nextStatus = useMemo(() => {
    if (status === "cancelled") return null;

    const index = STATUS_FLOW.indexOf(status);

    if (
      index < 0 ||
      index >= STATUS_FLOW.length - 1
    ) {
      return null;
    }

    return STATUS_FLOW[index + 1];
  }, [status]);

  function advanceStatus() {
    if (!nextStatus) return;

    setStatus(nextStatus);
    setMessage(
      `La orden pasará a "${STATUS_LABELS[nextStatus]}". Pulsa "Guardar avance" para confirmar.`
    );
  }

  if (loading) {
    return (
      <div className="card">
        <div
          style={{
            padding: 40,
            textAlign: "center",
          }}
        >
          Cargando orden...
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="card">
        <div
          style={{
            padding: 40,
            textAlign: "center",
          }}
        >
          {error ||
            "No fue posible encontrar la orden."}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Link
            href="/ordenes"
            className="btn btn-primary"
          >
            Volver a órdenes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Link
        href="/ordenes"
        className="btn btn-ghost"
      >
        <ArrowLeft size={14} />
        Volver a órdenes
      </Link>

      <div style={{ height: 12 }} />

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

      <div className="section-head">
        <div>
          <div className="eyebrow">
            Orden de servicio
          </div>

          <h1 className="page-title">
            #{order.order_number} ·{" "}
            {motorcycle?.plate ?? "Sin placa"}
          </h1>

          <p className="page-subtitle">
            {customer?.full_name ??
              "Cliente no disponible"}{" "}
            · Ingreso{" "}
            {formatDateTime(order.received_at)}
            {" · "}
            Entrega estimada{" "}
            {formatDateTime(
              order.estimated_delivery_at
            )}
          </p>
        </div>

        <Status tone={STATUS_TONES[status]}>
          {STATUS_LABELS[status]}
        </Status>
      </div>

      <div className="card">
        <Timeline current={currentTimelineIndex} />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 9,
            color: "#808987",
            gap: 5,
            flexWrap: "wrap",
          }}
        >
          {STATUS_FLOW.map((flowStatus) => (
            <span key={flowStatus}>
              {STATUS_LABELS[flowStatus]}
            </span>
          ))}
        </div>
      </div>

      <div style={{ height: 16 }} />

      <div className="grid grid-3">
        <div
          className="card"
          style={{ gridColumn: "span 2" }}
        >
          <div className="section-head">
            <h2>Resumen de la orden</h2>
            <Wrench size={16} />
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Problema reportado</label>

              <textarea
                value={reportedProblem}
                onChange={(e) =>
                  setReportedProblem(
                    e.target.value
                  )
                }
                rows={4}
                disabled={saving}
              />
            </div>

            <div className="field">
              <label>Diagnóstico</label>

              <textarea
                value={diagnosis}
                onChange={(e) =>
                  setDiagnosis(e.target.value)
                }
                rows={4}
                disabled={saving}
                placeholder="Registrar diagnóstico..."
              />
            </div>

            <div className="field">
              <label>Kilometraje de recepción</label>

              <input
                type="number"
                min="0"
                value={mileage}
                onChange={(e) =>
                  setMileage(e.target.value)
                }
                disabled={saving}
              />
            </div>

            <div className="field">
              <label>Mecánico asignado</label>

              <select
                value={mechanicId}
                onChange={(e) =>
                  setMechanicId(e.target.value)
                }
                disabled={saving}
              >
                <option value="">
                  Sin asignar
                </option>

                {mechanics.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.full_name}
                    {item.specialty
                      ? ` · ${item.specialty}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Estado de la orden</label>

              <select
                value={status}
                onChange={(e) =>
                  setStatus(
                    e.target.value as OrderStatus
                  )
                }
                disabled={saving}
              >
                {(
                  Object.keys(
                    STATUS_LABELS
                  ) as OrderStatus[]
                ).map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {STATUS_LABELS[item]}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>
                Entrega estimada
              </label>

              <input
                type="datetime-local"
                value={estimatedDelivery}
                onChange={(e) =>
                  setEstimatedDelivery(
                    e.target.value
                  )
                }
                disabled={saving}
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
                value={observations}
                onChange={(e) =>
                  setObservations(
                    e.target.value
                  )
                }
                rows={4}
                disabled={saving}
                placeholder="Observaciones de la reparación..."
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 14,
              flexWrap: "wrap",
            }}
          >
            <button
              className="btn btn-primary"
              onClick={saveChanges}
              disabled={saving}
            >
              <CheckCircle2 size={14} />
              {saving
                ? "Guardando..."
                : "Guardar avance"}
            </button>

            {nextStatus && (
              <button
                className="btn btn-ghost"
                onClick={advanceStatus}
                disabled={saving}
              >
                Avanzar a{" "}
                {STATUS_LABELS[nextStatus]}
              </button>
            )}

          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <h2>Cliente</h2>
            <UserRound size={16} />
          </div>

          <strong>
            {customer?.full_name ??
              "No disponible"}
          </strong>

          <div
            className="muted"
            style={{
              fontSize: 11,
              marginTop: 5,
            }}
          >
            {customer?.phone ??
              customer?.whatsapp ??
              "Sin teléfono"}
          </div>

          {customer?.email && (
            <div
              className="muted"
              style={{
                fontSize: 11,
                marginTop: 5,
              }}
            >
              {customer.email}
            </div>
          )}

          <div style={{ height: 14 }} />

          <div className="section-head">
            <h2>Motocicleta</h2>
            <Gauge size={16} />
          </div>

          {motorcycle ? (
            <>
              <strong>
                {motorcycle.brand}{" "}
                {motorcycle.model}
              </strong>

              <div
                className="muted"
                style={{
                  fontSize: 11,
                  marginTop: 5,
                }}
              >
                {motorcycle.plate}
              </div>

              <div
                className="muted"
                style={{
                  fontSize: 11,
                  marginTop: 5,
                }}
              >
                {motorcycle.year ??
                  "Año no registrado"}{" "}
                ·{" "}
                {motorcycle.current_km.toLocaleString(
                  "es-CO"
                )}{" "}
                km
              </div>
            </>
          ) : (
            <div className="muted">
              Motocicleta no disponible.
            </div>
          )}

          {motorcycle && (
            <>
              <div style={{ height: 14 }} />

              <div className="section-head">
                <h2>SOAT / Tecnomecánica</h2>
                <CalendarClock size={16} />
              </div>

              <TecnomecanicaAlert dueDate={tecnomecanicaDate || null} />

              <div className="field" style={{ marginTop: 10 }}>
                <label>Fecha de tecnomecánica</label>
                <input
                  type="date"
                  value={tecnomecanicaDate}
                  onChange={(event) => setTecnomecanicaDate(event.target.value)}
                  disabled={savingTecnomecanica}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ marginTop: 8, width: "100%" }}
                  onClick={saveTecnomecanicaDate}
                  disabled={savingTecnomecanica}
                >
                  {savingTecnomecanica ? "Guardando..." : "Guardar fecha"}
                </button>
              </div>
            </>
          )}

          <div style={{ height: 14 }} />

          <div className="section-head">
            <h2>Mecánico</h2>
            <Wrench size={16} />
          </div>

          <strong>
            {mechanic?.full_name ??
              "Sin asignar"}
          </strong>

          {mechanic?.specialty && (
            <div
              className="muted"
              style={{
                fontSize: 11,
                marginTop: 4,
              }}
            >
              {mechanic.specialty}
            </div>
          )}
        </div>
      </div>

      <div style={{ height: 16 }} />

      <div className="grid grid-2">
        <div className="card">
          <div className="section-head">
            <h2>Totales actuales</h2>
            <FileText size={16} />
          </div>

          <div style={{ fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
              <span>Mano de obra</span>
              <strong>{money(laborSale)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
              <span>Repuestos</span>
              <strong>{money(partsSale)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
              <span>Subtotal</span>
              <strong>{money(orderSubtotal)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
              <span>Impuestos</span>
              <strong>{money(Number(order.tax || 0))}</strong>
            </div>
            <hr style={{ border: 0, borderTop: "1px solid #e5e9e8" }} />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 16 }}>
              <strong>Total</strong>
              <strong>{money(Number(order.total || 0))}</strong>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-head">
            <h2>Fechas</h2>
            <CalendarClock size={16} />
          </div>

          <div className="grid" style={{ gap: 10 }}>
            <div>
              <span className="muted">Recepción</span>
              <strong style={{ display: "block" }}>{formatDateTime(order.received_at)}</strong>
            </div>
            <div>
              <span className="muted">Entrega estimada</span>
              <strong style={{ display: "block" }}>{formatDateTime(order.estimated_delivery_at)}</strong>
            </div>
            <div>
              <span className="muted">Entrega real</span>
              <strong style={{ display: "block" }}>{formatDateTime(order.delivered_at)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 16 }} />

      <div className="grid grid-2">
        <ServiceOrderLaborClient
          serviceOrderId={order.id}
          orderStatus={order.status}
          defaultMechanicId={order.mechanic_id}
          onChanged={() => void loadOrder()}
        />

        <ServiceOrderPartsClient
          serviceOrderId={order.id}
          orderStatus={order.status}
          onChanged={() => void loadOrder()}
        />
      </div>

      <div style={{ height: 16 }} />

      <div className="card">
        <div className="section-head">
          <div>
            <h2>Rentabilidad de la orden</h2>
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
              Ingresos de la orden menos el costo real de los repuestos consumidos.
            </div>
          </div>
          <span className={`badge ${grossProfit >= 0 ? "badge-success" : "badge-danger"}`}>
            {grossMargin.toFixed(1)}% margen
          </span>
        </div>

        <div className="grid grid-4">
          <div className="card">
            <div className="muted">Ingresos sin impuesto</div>
            <strong>{money(orderSubtotal)}</strong>
          </div>
          <div className="card">
            <div className="muted">Costo repuestos</div>
            <strong>{money(partsCost)}</strong>
          </div>
          <div className="card">
            <div className="muted">Utilidad bruta</div>
            <strong>{money(grossProfit)}</strong>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontSize: 12 }}>
          <span className="muted">Costos directos registrados: {money(directCosts)}</span>
          <strong>Margen: {grossMargin.toFixed(1)}%</strong>
        </div>
      </div>

      <ServiceOrderPhotos
        organizationId={order.organization_id}
        orderId={order.id}
      />
    </>
  );
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number: number) =>
    String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}