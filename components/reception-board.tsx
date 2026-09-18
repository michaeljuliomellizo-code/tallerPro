"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentOrganizationId } from "@/lib/motomil/organization";

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

type Order = {
  id: string;
  order_number: number;
  status: string;
  mileage: number;
  reported_problem: string | null;
  received_at: string;
  customer: { full_name: string } | { full_name: string }[] | null;
  motorcycle: { plate: string; brand: string; model: string } | { plate: string; brand: string; model: string }[] | null;
};

export default function ReceptionBoard() {
  const supabase = createClient();
  const [rows, setRows] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const organizationId = await getCurrentOrganizationId();
      const { data } = await supabase
        .from("service_orders")
        .select(`id,order_number,status,mileage,reported_problem,received_at,customer:customers(full_name),motorcycle:motorcycles(plate,brand,model)`)
        .eq("organization_id", organizationId)
        .eq("status", "received")
        .order("received_at", { ascending: false });

      if (active) {
        setRows((data ?? []) as Order[]);
        setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [supabase]);

  return (
    <div className="card">
      <div className="reception-desktop-table table-wrap">
        <table className="table">
          <thead>
            <tr><th>Orden</th><th>Cliente</th><th>Moto</th><th>Km</th><th>Problema</th><th>Ingreso</th><th /></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 30, textAlign: "center" }}>Cargando recepciones...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 30, textAlign: "center" }}>No hay motocicletas esperando recepción.</td></tr>
            ) : rows.map((order) => {
              const customer = one(order.customer);
              const motorcycle = one(order.motorcycle);
              return (
                <tr key={order.id}>
                  <td><strong>#{order.order_number}</strong></td>
                  <td>{customer?.full_name || "—"}</td>
                  <td>{motorcycle ? `${motorcycle.plate} · ${motorcycle.brand} ${motorcycle.model}` : "—"}</td>
                  <td>{Number(order.mileage).toLocaleString("es-CO")} km</td>
                  <td>{order.reported_problem || "—"}</td>
                  <td>{new Date(order.received_at).toLocaleString("es-CO")}</td>
                  <td><Link className="btn btn-ghost" href={`/ordenes/${order.id}`}><Eye size={13} /> Abrir</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="reception-mobile-list">
        {loading ? <div className="empty">Cargando recepciones...</div> : null}
        {!loading && rows.length === 0 ? <div className="empty">No hay motocicletas esperando recepción.</div> : null}
        {rows.map((order) => {
          const customer = one(order.customer);
          const motorcycle = one(order.motorcycle);
          return (
            <article className="card" key={order.id}>
              <div className="section-head">
                <div>
                  <div className="eyebrow">Recepción</div>
                  <h2>#{order.order_number}</h2>
                </div>
                <span className="badge badge-yellow">Recibida</span>
              </div>
              <div className="grid" style={{ gap: 8 }}>
                <div><span className="muted">Cliente</span><strong style={{ display: "block" }}>{customer?.full_name || "—"}</strong></div>
                <div><span className="muted">Moto</span><strong style={{ display: "block" }}>{motorcycle ? `${motorcycle.brand} ${motorcycle.model}` : "—"}</strong></div>
                <div><span className="muted">Placa</span><strong style={{ display: "block" }}>{motorcycle?.plate || "—"}</strong></div>
                <div><span className="muted">Kilometraje</span><strong style={{ display: "block" }}>{Number(order.mileage).toLocaleString("es-CO")} km</strong></div>
                <div><span className="muted">Problema reportado</span><div style={{ marginTop: 3 }}>{order.reported_problem || "—"}</div></div>
              </div>
              <Link className="btn btn-primary" style={{ marginTop: 12, width: "100%" }} href={`/ordenes/${order.id}`}><Eye size={14} /> Abrir orden</Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
