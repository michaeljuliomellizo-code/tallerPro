"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, FilePlus2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { getCurrentOrganizationId } from "@/lib/motomil/organization";
import { money } from "@/lib/motomil/formatters";

type Invoice = {
  id: string;
  invoice_number: string;
  service_order_id: string | null;
  customer_id: string | null;
  customer_name?: string | null;
  total: number | string;
  paid: number | string;
  status: string;
  issued_at: string;
};

type DeliveredOrder = {
  id: string;
  order_number: number;
  customer_id: string;
  customer_name: string | null;
  total: number | string;
  delivered_at: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  partial: "Pago parcial",
  paid: "Pagada",
  void: "Anulada",
};

export default function InvoiceListClient() {
  const supabase = createClient();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<DeliveredOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOrderId, setSavingOrderId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadInvoices() {
    try {
      setLoading(true);
      setError("");

      const organizationId = await getCurrentOrganizationId();

      const [invoiceResult, orderResult] = await Promise.all([
        supabase
          .from("invoices")
          .select("id, invoice_number, service_order_id, customer_id, total, paid, status, issued_at, customers(full_name)")
          .eq("organization_id", organizationId)
          .order("issued_at", { ascending: false }),
        supabase
          .from("service_orders")
          .select("id, order_number, customer_id, total, delivered_at, customers(full_name)")
          .eq("organization_id", organizationId)
          .eq("status", "delivered")
          .order("delivered_at", { ascending: false }),
      ]);

      if (invoiceResult.error) throw invoiceResult.error;
      if (orderResult.error) throw orderResult.error;

      setInvoices(
        (invoiceResult.data ?? []).map((invoice: any) => ({
          ...invoice,
          customer_name: invoice.customers?.full_name ?? null,
        })) as Invoice[]
      );

      setDeliveredOrders(
        (orderResult.data ?? []).map((order: any) => ({
          ...order,
          customer_name: order.customers?.full_name ?? null,
        })) as DeliveredOrder[]
      );
    } catch (err) {
      console.error("Error cargando facturación:", err);
      setError(err instanceof Error ? err.message : "No fue posible cargar facturación.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInvoices();
  }, []);

  const invoiceByOrder = new Map<string, Invoice>();
  for (const invoice of invoices) {
    if (invoice.service_order_id && !invoiceByOrder.has(invoice.service_order_id)) {
      invoiceByOrder.set(invoice.service_order_id, invoice);
    }
  }

  const readyToCollect = deliveredOrders
    .map((order) => ({
      order,
      invoice: invoiceByOrder.get(order.id) ?? null,
    }))
    .filter(({ order, invoice }) => {
      if (!invoice) return Number(order.total) > 0;
      return invoice.status !== "void" && Number(invoice.total) > Number(invoice.paid);
    });

  async function generateInvoice(orderId: string) {
    try {
      setSavingOrderId(orderId);
      setError("");
      setMessage("");

      const { data, error: rpcError } = await supabase.rpc(
        "create_invoice_from_service_order",
        { p_service_order_id: orderId }
      );

      if (rpcError) throw rpcError;

      setMessage(`Factura ${data?.invoice_number ?? ""} lista para cobro.`.trim());
      await loadInvoices();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No fue posible generar la factura.");
    } finally {
      setSavingOrderId("");
    }
  }

  return (
    <div>
      <div className="card">
        <div className="section-head">
          <div>
            <div className="eyebrow">Facturación</div>
            <h1 className="page-title">Facturas y pagos</h1>
            <p className="page-subtitle">Facturas emitidas, órdenes entregadas y cartera pendiente.</p>
          </div>
        </div>

        {error && <div className="error-state" style={{ marginBottom: 14 }}>{error}</div>}
        {message && <div style={{ marginBottom: 14, padding: 10, borderRadius: 8, background: "#e9f8f2", color: "#0c6b58", fontSize: 12 }}>{message}</div>}

        <div className="section-head" style={{ marginTop: 8 }}>
          <div>
            <h2>Órdenes entregadas pendientes de cobro</h2>
            <div className="muted">Las órdenes en estado Entregada aparecen aquí aunque todavía no tengan factura.</div>
          </div>
          <ClipboardCheck size={18} />
        </div>

        {loading ? (
          <div className="empty">Cargando órdenes entregadas...</div>
        ) : readyToCollect.length === 0 ? (
          <div className="empty">No hay órdenes entregadas pendientes de cobro.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Cliente</th>
                  <th>Entrega</th>
                  <th>Total</th>
                  <th>Factura</th>
                  <th>Saldo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {readyToCollect.map(({ order, invoice }) => {
                  const total = invoice ? Number(invoice.total) : Number(order.total);
                  const paid = invoice ? Number(invoice.paid) : 0;
                  const balance = Math.max(total - paid, 0);

                  return (
                    <tr key={order.id}>
                      <td><strong>#{order.order_number}</strong></td>
                      <td>{order.customer_name ?? "Cliente"}</td>
                      <td>{order.delivered_at ? new Date(order.delivered_at).toLocaleString("es-CO") : "-"}</td>
                      <td>{money(total)}</td>
                      <td>{invoice ? invoice.invoice_number : "Pendiente de generar"}</td>
                      <td>{money(balance)}</td>
                      <td>
                        {invoice ? (
                          <Link className="btn btn-primary" href={`/facturacion/${invoice.id}`}>
                            Registrar pago
                          </Link>
                        ) : (
                          <button className="btn btn-primary" type="button" onClick={() => void generateInvoice(order.id)} disabled={savingOrderId === order.id}>
                            <FilePlus2 size={14} />
                            {savingOrderId === order.id ? "Generando..." : "Generar factura"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-head">
          <div>
            <h2>Facturas</h2>
            <div className="muted">Consulta el saldo y registra abonos desde el detalle de cada factura.</div>
          </div>
        </div>

        {loading ? (
          <div className="empty">Cargando facturas...</div>
        ) : invoices.length === 0 ? (
          <div className="empty">No hay facturas registradas.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Factura</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Pagado</th>
                  <th>Saldo</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const balance = Math.max(Number(invoice.total) - Number(invoice.paid), 0);
                  return (
                    <tr key={invoice.id}>
                      <td>{invoice.invoice_number}</td>
                      <td>{invoice.customer_name ?? "Cliente no registrado"}</td>
                      <td>{new Date(invoice.issued_at).toLocaleString("es-CO")}</td>
                      <td>{money(Number(invoice.total))}</td>
                      <td>{money(Number(invoice.paid))}</td>
                      <td>{money(balance)}</td>
                      <td>{STATUS_LABELS[invoice.status] ?? invoice.status}</td>
                      <td>
                        <Link className="btn btn-ghost" href={`/facturacion/${invoice.id}`}>
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
