"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentOrganizationId } from "@/lib/motomil/organization";

type Row = {
  mechanic: string;
  orders: number;
  delivered: number;
  total: number;
};

type Mechanic = {
  id: string;
  full_name: string | null;
};

const money = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

export default function MechanicPerformanceReport() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const organizationId = await getCurrentOrganizationId();

        const [ordersResult, mechanicsResult] = await Promise.all([
          supabase
            .from("service_orders")
            .select("mechanic_id,status,total")
            .eq("organization_id", organizationId),
          supabase
            .from("mechanics")
            .select("id,full_name")
            .eq("organization_id", organizationId),
        ]);

        if (ordersResult.error) throw ordersResult.error;
        if (mechanicsResult.error) throw mechanicsResult.error;

        const mechanicNames = new Map<string, string>();
        for (const mechanic of (mechanicsResult.data ?? []) as Mechanic[]) {
          mechanicNames.set(mechanic.id, mechanic.full_name?.trim() || "Mecánico sin nombre");
        }

        const grouped = new Map<string, Row>();

        for (const order of ordersResult.data ?? []) {
          const key = order.mechanic_id ?? "sin-asignar";
          const mechanicName = order.mechanic_id
            ? mechanicNames.get(order.mechanic_id) ?? "Mecánico no encontrado"
            : "Sin asignar";

          const current = grouped.get(key) ?? {
            mechanic: mechanicName,
            orders: 0,
            delivered: 0,
            total: 0,
          };

          current.orders += 1;
          if (order.status === "delivered") current.delivered += 1;
          current.total += Number(order.total || 0);
          grouped.set(key, current);
        }

        if (active) {
          setRows(Array.from(grouped.values()));
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No fue posible cargar el rendimiento de mecánicos."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="card">
      <div className="section-head">
        <div>
          <h2>Rendimiento de mecánicos</h2>
          <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
            Las órdenes se agrupan por nombre del mecánico responsable.
          </div>
        </div>
      </div>

      {error && <div className="error-state">{error}</div>}

      {loading ? (
        <div className="empty">Cargando rendimiento...</div>
      ) : rows.length === 0 ? (
        <div className="empty">No hay órdenes con información para mostrar.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Mecánico</th>
                <th>Órdenes</th>
                <th>Entregadas</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.mechanic}>
                  <td>{row.mechanic}</td>
                  <td>{row.orders}</td>
                  <td>{row.delivered}</td>
                  <td>{money(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
