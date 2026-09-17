"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPortalCustomer } from "@/lib/motomil/portal";
import { money } from "@/lib/motomil/formatters";

type Quote = { id: string; order_number: number; status: string; total: number | string; subtotal: number | string; tax: number | string; quoted_at: string | null; rejection_reason: string | null };

export default function PortalQuotation({ orderId }: { orderId: string }) {
  const supabase = createClient();
  const [data, setData] = useState<Quote | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const portalUser = await getPortalCustomer();
        if (!portalUser) throw new Error("No existe una sesión de portal activa.");
        const { data: row, error: queryError } = await supabase
          .from("service_orders")
          .select("id, order_number, status, total, subtotal, tax, quoted_at, rejection_reason")
          .eq("id", orderId)
          .eq("customer_id", portalUser.customer_id)
          .maybeSingle();
        if (queryError) throw queryError;
        if (!row) throw new Error("La cotización no existe o no pertenece a tu cuenta.");
        if (active) setData(row as Quote);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "No fue posible cargar la cotización.");
      }
    }
    void load();
    return () => { active = false; };
  }, [orderId]);

  async function act(action: "approve" | "reject") {
    if (!data || data.status !== "quoted") return;
    let reason: string | null = null;
    if (action === "reject") {
      reason = window.prompt("Motivo del rechazo de la cotización:")?.trim() || null;
      if (!reason) {
        setError("Debes indicar el motivo del rechazo.");
        return;
      }
    }
    try {
      setBusy(true); setError(""); setMessage("");
      const { data: result, error: rpcError } = await supabase.rpc(
        action === "approve" ? "approve_portal_quote" : "reject_portal_quote",
        { p_service_order_id: data.id, p_reason: reason }
      );
      if (rpcError) throw rpcError;
      const updatedStatus = action === "approve" ? "approved" : "cancelled";
      setData((current) => current ? { ...current, status: updatedStatus, rejection_reason: reason } : current);
      setMessage(action === "approve" ? "Cotización aprobada correctamente." : "Cotización rechazada correctamente.");
      void result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible actualizar la cotización.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) return <div className="error-state">{error}</div>;
  if (!data) return <div className="muted">Cargando cotización...</div>;

  return <div className="card"><div className="eyebrow">Cotización</div><h1 className="page-title">Orden #{data.order_number}</h1><div className="grid grid-3" style={{ marginTop: 16 }}><div><div className="muted">Subtotal</div><strong>{money(data.subtotal)}</strong></div><div><div className="muted">Impuestos</div><strong>{money(data.tax)}</strong></div><div><div className="muted">Total</div><strong style={{ fontSize: 24 }}>{money(data.total)}</strong></div></div><div style={{ marginTop: 16 }}><span className="badge">{data.status}</span></div>{data.rejection_reason && <div className="muted" style={{ marginTop: 10 }}>Motivo: {data.rejection_reason}</div>}{message && <div style={{ marginTop: 12 }} className="success-state">{message}</div>}{error && <div style={{ marginTop: 12 }} className="error-state">{error}</div>}{data.status === "quoted" && <div style={{ display: "flex", gap: 8, marginTop: 16 }}><button className="btn btn-primary" disabled={busy} onClick={() => void act("approve")}>{busy ? "Procesando..." : "Aprobar cotización"}</button><button className="btn btn-ghost" disabled={busy} onClick={() => void act("reject")}>Rechazar</button></div>}</div>;
}
