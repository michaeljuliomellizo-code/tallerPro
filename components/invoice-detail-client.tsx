"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/utils";
import InvoicePaymentPanel from "@/components/invoice-payment-panel";

type Invoice = {
  id: string;
  invoice_number: string;
  service_order_id: string | null;
  customer_id: string | null;
  subtotal: number | string;
  tax: number | string;
  total: number | string;
  paid: number | string;
  status: string;
  issued_at: string;
  due_at: string | null;
};

type Customer = {
  full_name: string;
  phone: string | null;
  email: string | null;
};

type Item = {
  id: string;
  item_type: string;
  description: string;
  quantity: number | string;
  unit_price: number | string;
};

const ITEM_LABELS: Record<string, string> = {
  service: "Mano de obra / servicio",
  labor: "Mano de obra",
  part: "Repuesto",
  other: "Otro",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  partial: "Pago parcial",
  paid: "Pagada",
  void: "Anulada",
};

export default function InvoiceDetailClient({ invoiceId }: { invoiceId: string }) {
  const supabase = createClient();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      const currentInvoice = invoiceData as Invoice;
      setInvoice(currentInvoice);

      if (currentInvoice.customer_id) {
        const { data: customerData, error: customerError } = await supabase
          .from("customers")
          .select("full_name,phone,email")
          .eq("id", currentInvoice.customer_id)
          .maybeSingle();
        if (customerError) throw customerError;
        setCustomer(customerData as Customer | null);
      } else {
        setCustomer(null);
      }

      if (currentInvoice.service_order_id) {
        const { data: itemData, error: itemError } = await supabase
          .from("service_order_items")
          .select("id,item_type,description,quantity,unit_price")
          .eq("service_order_id", currentInvoice.service_order_id)
          .order("created_at", { ascending: true });
        if (itemError) throw itemError;
        setItems((itemData ?? []) as Item[]);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No fue posible cargar la factura.");
    } finally {
      setLoading(false);
    }
  }, [invoiceId, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <div className="card">Cargando factura...</div>;
  if (error || !invoice) return <div className="card">{error || "Factura no encontrada."}</div>;

  const total = Number(invoice.total);
  const paid = Number(invoice.paid);
  const balance = Math.max(total - paid, 0);

  return (
    <>
      <Link href="/facturacion" className="btn btn-ghost">
        <ArrowLeft size={14} /> Volver
      </Link>

      <div style={{ height: 12 }} />

      <div className="section-head">
        <div>
          <div className="eyebrow">Factura</div>
          <h1 className="page-title">{invoice.invoice_number}</h1>
          <div className="muted">
            Emitida {new Date(invoice.issued_at).toLocaleString("es-CO")} · {STATUS_LABELS[invoice.status] ?? invoice.status}
          </div>
        </div>
        <Link href={`/facturacion/${invoice.id}/pdf`} target="_blank" className="btn btn-primary">
          <Printer size={14} /> PDF / Imprimir
        </Link>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="section-head">
            <h2>Datos de facturación</h2>
            <FileText size={18} />
          </div>
          <div>
            <div className="muted">Cliente</div>
            <strong>{customer?.full_name || "Cliente no registrado"}</strong>
            {customer?.phone && <div className="muted">{customer.phone}</div>}
            {customer?.email && <div className="muted">{customer.email}</div>}
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="muted">Orden de servicio</div>
            <strong>{invoice.service_order_id || "Venta directa"}</strong>
          </div>
          {invoice.due_at && (
            <div style={{ marginTop: 14 }}>
              <div className="muted">Vencimiento</div>
              <strong>{new Date(invoice.due_at).toLocaleDateString("es-CO")}</strong>
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-head"><h2>Resumen</h2></div>
          <div style={{ fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}><span>Subtotal</span><strong>{money(Number(invoice.subtotal))}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}><span>Impuestos</span><strong>{money(Number(invoice.tax))}</strong></div>
            <hr />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: 18 }}><strong>Total</strong><strong>{money(total)}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}><span>Pagado</span><strong>{money(paid)}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}><span>Saldo</span><strong>{money(balance)}</strong></div>
          </div>
        </div>
      </div>

      {items.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="section-head"><h2>Conceptos facturados</h2></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Tipo</th><th>Descripción</th><th>Cantidad</th><th>Valor</th></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{ITEM_LABELS[item.item_type] ?? item.item_type}</td>
                    <td>{item.description}</td>
                    <td>{Number(item.quantity)}</td>
                    <td>{money(Number(item.quantity) * Number(item.unit_price))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <InvoicePaymentPanel
          invoiceId={invoice.id}
          total={total}
          paid={paid}
          onSuccess={load}
        />
      </div>
    </>
  );
}
