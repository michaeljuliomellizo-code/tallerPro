"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  LogOut,
  Receipt,
  ShieldCheck,
  Wrench,
  XCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/utils";
import { getPortalCustomer } from "@/lib/motomil/portal";
import { APP_CONFIG } from "@/lib/tallerpro/config";

type Customer = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
};

type Motorcycle = {
  id: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  plate: string | null;
  current_km: number | null;
  next_maintenance_km: number | null;
  next_maintenance_date: string | null;
};

type ServiceOrder = {
  id: string;
  order_number: number;
  status: string;
  mileage: number | null;
  reported_problem: string | null;
  diagnosis: string | null;
  observations: string | null;
  received_at: string;
  estimated_delivery_at: string | null;
  delivered_at: string | null;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  quoted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
};

type Appointment = {
  id: string;
  starts_at: string;
  ends_at: string | null;
  service_type: string | null;
  status: string;
  notes: string | null;
};

type Invoice = {
  id: string;
  invoice_number: string;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  paid: number | string;
  status: string;
  issued_at: string;
  due_at: string | null;
};

const ORDER_STATUS: Record<string, string> = {
  received: "Recibida",
  diagnosis: "Diagnóstico",
  quoted: "Cotización pendiente",
  approved: "Aprobada",
  in_progress: "En reparación",
  quality_check: "Control de calidad",
  ready: "Lista para entrega",
  delivered: "Entregada",
  cancelled: "Cancelada",
};

function orderBadgeClass(status: string) {
  if (status === "cancelled") return "badge badge-danger";
  if (status === "quoted") return "badge badge-warning";
  if (status === "ready") return "badge badge-success";
  if (status === "delivered") return "badge";
  return "badge badge-success";
}

export default function PortalClient() {
  const supabase = createClient();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [selectedQuote, setSelectedQuote] = useState<ServiceOrder | null>(null);
  const [quoteAction, setQuoteAction] = useState<"approve" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processingQuote, setProcessingQuote] = useState(false);

  async function loadPortal(showSpinner = true) {
    try {
      if (showSpinner) setLoading(true);
      else setRefreshing(true);

      setError("");

      const portalUser = await getPortalCustomer();

      if (!portalUser) {
        throw new Error(
          "No existe una cuenta de portal asociada a este usuario."
        );
      }

      const [customerResult, motorcyclesResult, ordersResult, appointmentResult, invoiceResult] =
        await Promise.all([
          supabase
            .from("customers")
            .select("id, full_name, phone, email")
            .eq("id", portalUser.customer_id)
            .maybeSingle(),
          supabase
            .from("motorcycles")
            .select(
              "id, brand, model, year, plate, current_km, next_maintenance_km, next_maintenance_date"
            )
            .eq("customer_id", portalUser.customer_id)
            .eq("active", true)
            .order("created_at", { ascending: false }),
          supabase
            .from("service_orders")
            .select(
              "id, order_number, status, mileage, reported_problem, diagnosis, observations, received_at, estimated_delivery_at, delivered_at, subtotal, tax, total, quoted_at, approved_at, rejected_at, rejection_reason"
            )
            .eq("customer_id", portalUser.customer_id)
            .order("created_at", { ascending: false }),
          supabase
            .from("appointments")
            .select(
              "id, starts_at, ends_at, service_type, status, notes"
            )
            .eq("customer_id", portalUser.customer_id)
            .order("starts_at", { ascending: true }),
          supabase
            .from("invoices")
            .select(
              "id, invoice_number, subtotal, tax, total, paid, status, issued_at, due_at"
            )
            .eq("customer_id", portalUser.customer_id)
            .order("issued_at", { ascending: false }),
        ]);

      if (customerResult.error) throw customerResult.error;
      if (motorcyclesResult.error) throw motorcyclesResult.error;
      if (ordersResult.error) throw ordersResult.error;
      if (appointmentResult.error) throw appointmentResult.error;
      if (invoiceResult.error) throw invoiceResult.error;

      setCustomer(customerResult.data as Customer | null);
      setMotorcycles((motorcyclesResult.data ?? []) as Motorcycle[]);
      setOrders((ordersResult.data ?? []) as ServiceOrder[]);
      setAppointments((appointmentResult.data ?? []) as Appointment[]);
      setInvoices((invoiceResult.data ?? []) as Invoice[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar el portal del cliente."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadPortal();
  }, []);

  const openOrders = orders.filter(
    (order) => !["delivered", "cancelled"].includes(order.status)
  );

  const quoteOrders = orders.filter(
    (order) => order.status === "quoted"
  );

  const pendingInvoices = invoices.filter(
    (invoice) => Number(invoice.total) > Number(invoice.paid)
  );

  const nextAppointments = appointments.filter(
    (appointment) =>
      new Date(appointment.starts_at).getTime() >= Date.now() &&
      !["cancelled", "completed", "no_show"].includes(appointment.status)
  );

  const pendingBalance = pendingInvoices.reduce(
    (sum, invoice) =>
      sum + Math.max(Number(invoice.total) - Number(invoice.paid), 0),
    0
  );

  const nextMaintenance = useMemo(() => {
    const values = motorcycles
      .filter((motorcycle) => motorcycle.next_maintenance_date)
      .map((motorcycle) => motorcycle.next_maintenance_date as string)
      .sort();

    return values[0] ?? null;
  }, [motorcycles]);

  function openQuote(order: ServiceOrder) {
    setSelectedQuote(order);
    setQuoteAction(null);
    setRejectReason("");
    setError("");
  }

  function closeQuote() {
    if (processingQuote) return;
    setSelectedQuote(null);
    setQuoteAction(null);
    setRejectReason("");
  }

  async function submitQuoteDecision() {
    if (!selectedQuote || !quoteAction) return;

    if (quoteAction === "reject" && !rejectReason.trim()) {
      setError("Debes indicar el motivo del rechazo de la cotización.");
      return;
    }

    try {
      setProcessingQuote(true);
      setError("");
      setMessage("");

      const { data, error: rpcError } = await supabase.rpc(
        "customer_decide_service_quote",
        {
          p_service_order_id: selectedQuote.id,
          p_decision: quoteAction,
          p_reason: rejectReason.trim() || null,
        }
      );

      if (rpcError) throw rpcError;

      const result = data as {
        success?: boolean;
        order_number?: number;
        decision?: string;
      } | null;

      if (!result?.success) {
        throw new Error(
          "Supabase no confirmó la decisión sobre la cotización."
        );
      }

      const orderNumber = String(
        result.order_number ?? selectedQuote.order_number
      );

      setMessage(
        quoteAction === "approve"
          ? `Cotización de la orden #${orderNumber} aprobada correctamente.`
          : `Cotización de la orden #${orderNumber} rechazada correctamente.`
      );

      closeQuote();
      await loadPortal(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible registrar la decisión sobre la cotización."
      );
    } finally {
      setProcessingQuote(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/portal/login";
  }

  if (loading) {
    return (
      <main className="page">
        <div className="card">Cargando portal del cliente...</div>
      </main>
    );
  }

  if (error && !customer) {
    return (
      <main className="page">
        <div
          className="card"
          style={{
            maxWidth: 680,
            margin: "40px auto",
            border: "1px solid #f2b8b8",
            background: "#fff5f5",
            color: "#9b1c1c",
          }}
        >
          <strong>No fue posible abrir el portal</strong>
          <div style={{ marginTop: 7 }}>{error}</div>
          <div style={{ marginTop: 16 }}>
            <Link className="btn btn-primary" href="/portal/login">
              Ir al acceso
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div
        className="page-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div className="eyebrow">{APP_CONFIG.name} · Portal</div>
          <h1 className="page-title">
            Hola, {customer?.full_name || "cliente"}
          </h1>
          <p className="page-subtitle">
            Consulta tus motocicletas, citas, servicios, cotizaciones y facturas desde un solo lugar.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn btn-secondary"
            onClick={() => void loadPortal(false)}
            disabled={refreshing}
          >
            {refreshing ? "Actualizando..." : "Actualizar"}
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => void logout()}
            style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      </div>

      {message && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            border: "1px solid #b9e4d8",
            background: "#effaf6",
            color: "#0c6b58",
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
            border: "1px solid #f2b8b8",
            background: "#fff5f5",
            color: "#9b1c1c",
          }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="muted">Motos registradas</div>
          <strong style={{ fontSize: 24 }}>{motorcycles.length}</strong>
        </div>

        <div className="card">
          <div className="muted">Servicios abiertos</div>
          <strong style={{ fontSize: 24, color: "#0c6b58" }}>
            {openOrders.length}
          </strong>
        </div>

        <div className="card">
          <div className="muted">Cotizaciones pendientes</div>
          <strong style={{ fontSize: 24, color: quoteOrders.length ? "#755b13" : "#0c6b58" }}>
            {quoteOrders.length}
          </strong>
        </div>

        <div className="card">
          <div className="muted">Saldo pendiente</div>
          <strong
            style={{
              fontSize: 24,
              color: pendingBalance > 0 ? "#a52222" : "#0c6b58",
            }}
          >
            {money(pendingBalance)}
          </strong>
        </div>
      </div>

      {quoteOrders.length > 0 && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            border: "1px solid #efd28a",
            background: "#fff8e8",
          }}
        >
          <div className="section-head">
            <div>
              <h2>Cotizaciones pendientes de aprobación</h2>
              <div className="muted">
                Revisa el valor y decide si deseas autorizar el trabajo.
              </div>
            </div>
            <ShieldCheck size={20} />
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {quoteOrders.map((order) => (
              <div
                key={order.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                  padding: 14,
                  borderRadius: 8,
                  border: "1px solid #e7d59a",
                  background: "rgba(255,255,255,.6)",
                }}
              >
                <div>
                  <strong>Orden #{order.order_number}</strong>
                  <div className="muted" style={{ marginTop: 4 }}>
                    {order.reported_problem || "Servicio de mantenimiento"}
                  </div>
                  <div style={{ marginTop: 5 }}>
                    <strong>{money(Number(order.total || 0))}</strong>
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => openQuote(order)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
                >
                  <ClipboardList size={15} />
                  Revisar cotización
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        {motorcycles.map((motorcycle) => (
          <div className="card" key={motorcycle.id}>
            <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
              <Wrench size={18} />
              <strong>
                {motorcycle.brand || "Moto"} {motorcycle.model || ""}
              </strong>
            </div>

            <div className="muted" style={{ marginTop: 7 }}>
              Placa: {motorcycle.plate || "—"}
            </div>

            <div className="muted">
              Kilometraje: {motorcycle.current_km ?? 0} km
            </div>

            {motorcycle.next_maintenance_km && (
              <div className="muted">
                Próximo mantenimiento: {motorcycle.next_maintenance_km} km
              </div>
            )}
          </div>
        ))}
      </div>

      {nextMaintenance && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            border: "1px solid #b9e4d8",
            background: "#effaf6",
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <ShieldCheck size={20} style={{ color: "#0c6b58" }} />
            <div>
              <strong>Próximo mantenimiento</strong>
              <div className="muted">
                Fecha recomendada: {new Date(nextMaintenance).toLocaleDateString("es-CO")}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="section-head">
            <div>
              <h2>Próximas citas</h2>
              <div className="muted">Agenda del taller</div>
            </div>
            <CalendarDays size={20} />
          </div>

          {nextAppointments.length === 0 ? (
            <div className="muted">No tienes citas próximas.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {nextAppointments.slice(0, 5).map((appointment) => (
                <div
                  key={appointment.id}
                  style={{
                    padding: 12,
                    border: "1px solid #e2e2e2",
                    borderRadius: 8,
                  }}
                >
                  <strong>
                    {new Date(appointment.starts_at).toLocaleString("es-CO")}
                  </strong>
                  <div className="muted">
                    {appointment.service_type || "Servicio"}
                  </div>
                  {appointment.notes && (
                    <div className="muted">{appointment.notes}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-head">
            <div>
              <h2>Servicios recientes</h2>
              <div className="muted">Estado de tus órdenes</div>
            </div>
            <ClipboardList size={20} />
          </div>

          {orders.length === 0 ? (
            <div className="muted">Todavía no hay órdenes registradas.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {orders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  style={{
                    padding: 12,
                    border: "1px solid #e2e2e2",
                    borderRadius: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <strong>Orden #{order.order_number}</strong>
                    <span className={orderBadgeClass(order.status)}>
                      {ORDER_STATUS[order.status] || order.status}
                    </span>
                  </div>

                  <div style={{ marginTop: 6 }}>
                    {money(Number(order.total || 0))}
                  </div>

                  {order.status === "quoted" && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => openQuote(order)}
                      style={{
                        marginTop: 10,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                      }}
                    >
                      Revisar cotización
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-head">
          <div>
            <h2>Facturas</h2>
            <div className="muted">Documentos y saldo pendiente</div>
          </div>
          <Receipt size={20} />
        </div>

        {invoices.length === 0 ? (
          <div className="muted">No hay facturas asociadas.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Factura</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Pagado</th>
                  <th>Saldo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const balance = Math.max(
                    Number(invoice.total) - Number(invoice.paid),
                    0
                  );

                  return (
                    <tr key={invoice.id}>
                      <td><strong>{invoice.invoice_number}</strong></td>
                      <td>{new Date(invoice.issued_at).toLocaleDateString("es-CO")}</td>
                      <td>{money(Number(invoice.total))}</td>
                      <td>{money(Number(invoice.paid))}</td>
                      <td>{money(balance)}</td>
                      <td>{invoice.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="muted" style={{ marginTop: 18, fontSize: 12 }}>
        Portal de autoservicio {APP_CONFIG.name} · Atención, seguimiento y aprobación digital de servicios.
      </div>

      {selectedQuote && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.55)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={closeQuote}
        >
          <div
            className="card"
            style={{
              width: "min(760px, 100%)",
              maxHeight: "90vh",
              overflow: "auto",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <div>
                <div className="eyebrow">Cotización</div>
                <h2 style={{ marginBottom: 4 }}>
                  Orden #{selectedQuote.order_number}
                </h2>
                <div className="muted">
                  {new Date(selectedQuote.received_at).toLocaleString("es-CO")}
                </div>
              </div>

              <button
                className="btn btn-secondary"
                onClick={closeQuote}
                disabled={processingQuote}
              >
                <XCircle size={16} />
              </button>
            </div>

            <div
              className="grid grid-3"
              style={{ marginTop: 18 }}
            >
              <div className="card">
                <div className="muted">Subtotal</div>
                <strong>{money(Number(selectedQuote.subtotal || 0))}</strong>
              </div>

              <div className="card">
                <div className="muted">Impuestos</div>
                <strong>{money(Number(selectedQuote.tax || 0))}</strong>
              </div>

              <div className="card">
                <div className="muted">Total</div>
                <strong style={{ fontSize: 20 }}>
                  {money(Number(selectedQuote.total || 0))}
                </strong>
              </div>
            </div>

            <div style={{ marginTop: 18 }} className="form-grid">
              {selectedQuote.reported_problem && (
                <div className="field">
                  <label>Problema reportado</label>
                  <div className="card">{selectedQuote.reported_problem}</div>
                </div>
              )}

              {selectedQuote.diagnosis && (
                <div className="field">
                  <label>Diagnóstico</label>
                  <div className="card">{selectedQuote.diagnosis}</div>
                </div>
              )}

              {selectedQuote.observations && (
                <div className="field">
                  <label>Observaciones</label>
                  <div className="card">{selectedQuote.observations}</div>
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: 18,
                padding: 14,
                borderRadius: 8,
                background: "#fff8e8",
                border: "1px solid #efd28a",
                color: "#755b13",
              }}
            >
              <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                <Clock3 size={18} />
                <strong>Decisión del cliente</strong>
              </div>
              <div style={{ marginTop: 5, fontSize: 13, lineHeight: 1.5 }}>
                Al aprobar, autorizas al taller a continuar con los trabajos incluidos en esta cotización.
              </div>
            </div>

            {quoteAction === "reject" && (
              <div className="field" style={{ marginTop: 18 }}>
                <label htmlFor="quote-reject-reason">
                  Motivo del rechazo
                </label>
                <textarea
                  id="quote-reject-reason"
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  rows={4}
                  placeholder="Indica por qué no deseas aprobar la cotización."
                  disabled={processingQuote}
                />
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 20,
                flexWrap: "wrap",
              }}
            >
              {quoteAction === null && (
                <>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setQuoteAction("reject")}
                    disabled={processingQuote}
                    style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
                  >
                    <XCircle size={15} />
                    Rechazar
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={() => setQuoteAction("approve")}
                    disabled={processingQuote}
                    style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
                  >
                    <CheckCircle2 size={15} />
                    Aprobar cotización
                  </button>
                </>
              )}

              {quoteAction !== null && (
                <>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setQuoteAction(null)}
                    disabled={processingQuote}
                  >
                    Atrás
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={() => void submitQuoteDecision()}
                    disabled={
                      processingQuote ||
                      (quoteAction === "reject" && !rejectReason.trim())
                    }
                    style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
                  >
                    {quoteAction === "approve" ? (
                      <CheckCircle2 size={15} />
                    ) : (
                      <XCircle size={15} />
                    )}
                    {processingQuote
                      ? "Guardando..."
                      : quoteAction === "approve"
                        ? "Confirmar aprobación"
                        : "Confirmar rechazo"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
