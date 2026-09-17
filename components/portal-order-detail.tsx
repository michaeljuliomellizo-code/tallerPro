"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPortalCustomer } from "@/lib/motomil/portal";
import { money } from "@/lib/motomil/formatters";

type ServiceOrder = {
  id: string;
  order_number: number;
  status: string;
  mileage: number | null;
  total: number | string;
  reported_problem: string | null;
  diagnosis: string | null;
  observations: string | null;
};

export default function PortalOrderDetail({ orderId }: { orderId: string }) {
  const supabase = createClient();
  const [data, setData] = useState<ServiceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const portalUser = await getPortalCustomer();
        if (!portalUser) throw new Error("No existe una sesión de portal activa.");
        const { data: row, error: queryError } = await supabase
          .from("service_orders")
          .select("id, order_number, status, mileage, total, reported_problem, diagnosis, observations")
          .eq("id", orderId)
          .eq("customer_id", portalUser.customer_id)
          .maybeSingle();
        if (queryError) throw queryError;
        if (!row) throw new Error("La orden no existe o no pertenece a tu cuenta.");
        if (active) setData(row as ServiceOrder);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "No fue posible cargar la orden.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [orderId]);

  if (loading) return <div className="muted">Cargando orden...</div>;
  if (error) return <div className="error-state">{error}</div>;
  if (!data) return <div className="muted">Orden no disponible.</div>;

  return <div className="card"><div className="eyebrow">Orden #{data.order_number}</div><h1 className="page-title">Estado de reparación</h1><div className="grid grid-3" style={{ marginTop: 16 }}><div><div className="muted">Estado</div><strong>{data.status}</strong></div><div><div className="muted">Kilometraje</div><strong>{data.mileage ?? "—"}</strong></div><div><div className="muted">Total</div><strong>{money(data.total)}</strong></div></div><div style={{ marginTop: 16 }}><div className="muted">Problema reportado</div><div>{data.reported_problem ?? "—"}</div></div><div style={{ marginTop: 12 }}><div className="muted">Diagnóstico</div><div>{data.diagnosis ?? "Pendiente"}</div></div><div style={{ marginTop: 12 }}><div className="muted">Observaciones</div><div>{data.observations ?? "—"}</div></div></div>;
}
