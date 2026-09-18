"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentOrganizationId } from "@/lib/motomil/organization";

type Order = { id: string; order_number: number; status: string };

const labels: Record<string, string> = {
  quality: "Calidad",
  ready: "Lista",
};

export default function QualityBoard() {
  const supabase = createClient();
  const [rows, setRows] = useState<Order[]>([]);

  async function load() {
    const organizationId = await getCurrentOrganizationId();
    const { data } = await supabase
      .from("service_orders")
      .select("id,order_number,status")
      .eq("organization_id", organizationId)
      .in("status", ["quality", "ready"])
      .order("updated_at", { ascending: false });
    setRows((data ?? []) as Order[]);
  }

  useEffect(() => {
    void load();
  }, []);

  async function markReady(id: string) {
    await supabase.from("service_orders").update({ status: "ready" }).eq("id", id);
    await load();
  }

  return (
    <div className="card">
      <div className="quality-desktop-table table-wrap">
        <table className="table">
          <thead><tr><th>Orden</th><th>Estado</th><th /></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><strong>#{row.order_number}</strong></td>
                <td>{labels[row.status] ?? row.status}</td>
                <td>{row.status === "quality" && <button className="btn btn-primary" onClick={() => void markReady(row.id)}><CheckCircle2 size={13} /> Marcar lista</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="quality-mobile-list">
        {rows.length === 0 ? <div className="empty">No hay órdenes en control de calidad.</div> : null}
        {rows.map((row) => (
          <article className="card" key={row.id}>
            <div className="section-head">
              <div><div className="eyebrow">Control de calidad</div><h2>#{row.order_number}</h2></div>
              <span className={row.status === "quality" ? "badge badge-blue" : "badge badge-green"}>{labels[row.status] ?? row.status}</span>
            </div>
            {row.status === "quality" ? (
              <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => void markReady(row.id)}><CheckCircle2 size={14} /> Marcar como lista</button>
            ) : (
              <div className="muted">La orden está lista para entrega.</div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
