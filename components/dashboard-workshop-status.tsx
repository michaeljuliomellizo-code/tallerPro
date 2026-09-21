"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentOrganizationId } from "@/lib/motomil/organization";

const STATUS_LABELS: Array<[string, string]> = [
  ["received", "Recibidas"],
  ["diagnosis", "Diagnóstico"],
  ["quote", "Cotización"],
  ["approved", "Aprobadas"],
  ["repair", "Reparación"],
  ["quality", "Calidad"],
  ["ready", "Listas"],
  ["delivered", "Entregadas"],
];

export default function DashboardWorkshopStatus() {
  const supabase = createClient();
  const [data, setData] = useState<Record<string, number>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setError("");
        const organizationId = await getCurrentOrganizationId();

        if (!organizationId) {
          throw new Error("No existe una organización activa.");
        }

        const { data: rows, error: queryError } = await supabase
          .from("service_orders")
          .select("status")
          .eq("organization_id", organizationId);

        if (queryError) throw queryError;

        const counts: Record<string, number> = {};
        for (const row of rows ?? []) {
          const status = String(row.status ?? "unknown");
          counts[status] = (counts[status] ?? 0) + 1;
        }

        if (active) setData(counts);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No fue posible cargar el estado de las órdenes."
          );
        }
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
          <div className="eyebrow">Taller</div>
          <h2>Estado de órdenes</h2>
        </div>
      </div>

      {error ? (
        <div className="error-state">{error}</div>
      ) : (
        <div className="grid grid-3">
          {STATUS_LABELS.map(([key, label]) => (
            <div className="card" key={key}>
              <div className="muted">{label}</div>
              <strong style={{ fontSize: 24 }}>{data[key] ?? 0}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
