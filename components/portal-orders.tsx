"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getPortalCustomer } from "@/lib/motomil/portal";
import { money } from "@/lib/motomil/formatters";

type ServiceOrder = { id: string; order_number: number; status: string; total: number | string; received_at: string; estimated_delivery_at: string | null };

export default function PortalOrders() {
  const supabase = createClient();
  const [rows, setRows] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const portalUser = await getPortalCustomer();
        if (!portalUser) throw new Error("No existe una sesión de portal activa.");
        const { data, error: queryError } = await supabase
          .from("service_orders")
          .select("id, order_number, status, total, received_at, estimated_delivery_at")
          .eq("customer_id", portalUser.customer_id)
          .order("received_at", { ascending: false });
        if (queryError) throw queryError;
        if (active) setRows((data ?? []) as ServiceOrder[]);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "No fue posible cargar tus órdenes.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  return <div className="card"><div className="section-head"><div><div className="eyebrow">Taller</div><h1 className="page-title">Mis órdenes</h1></div></div>
    {loading ? <div className="muted">Cargando órdenes...</div> : error ? <div className="error-state">{error}</div> : rows.length === 0 ? <div className="muted">No tienes órdenes registradas.</div> : <div className="table-wrap"><table className="table"><thead><tr><th>Orden</th><th>Fecha</th><th>Estado</th><th>Total</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>#{row.order_number}</td><td>{new Date(row.received_at).toLocaleDateString("es-CO")}</td><td>{row.status}</td><td>{money(row.total)}</td><td><Link className="btn btn-ghost" href={`/portal/ordenes/${row.id}`}>Ver</Link></td></tr>)}</tbody></table></div>}
  </div>;
}
