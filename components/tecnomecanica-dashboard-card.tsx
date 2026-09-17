"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Row = {
  id: string;
  plate: string;
  brand: string;
  model: string;
  tecnomecanica_date: string;
  days_remaining: number;
  alert_level: "expired" | "today" | "warning";
  customer_name: string | null;
  customer_phone: string | null;
};

function dateCO(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function label(level: Row["alert_level"], days: number) {
  if (level === "expired") return "VENCIDA";
  if (level === "today") return "VENCE HOY";
  return `En ${days} día${days === 1 ? "" : "s"}`;
}

export default function TecnomecanicaDashboardCard() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("vw_tecnomecanica_alertas")
        .select(
          "id,plate,brand,model,tecnomecanica_date,days_remaining,alert_level,customer_name,customer_phone"
        )
        .in("alert_level", ["expired", "today", "warning"])
        .order("tecnomecanica_date", { ascending: true })
        .limit(10);

      setError(error?.message ?? "");
      setRows((data as Row[]) ?? []);
      setLoading(false);
    }

    void load();
  }, [supabase]);

  if (loading) return <div className="card">Cargando tecnomecánicas por vencer...</div>;
  if (error) return <div className="card" style={{ color: "#a52222" }}>{error}</div>;

  return (
    <div className="card">
      <div className="section-head">
        <div>
          <h2>⚠️ Tecnomecánica por vencer</h2>
          <div className="muted">Vencidas, hoy y próximas dentro de 14 días.</div>
        </div>
        <CalendarClock size={18} />
      </div>

      {rows.length === 0 ? (
        <div className="empty" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={16} /> No hay alertas de tecnomecánica.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((row) => (
            <div
              key={row.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 12,
                alignItems: "center",
                padding: "10px 12px",
                border: "1px solid #e7ecea",
                borderRadius: 10,
              }}
            >
              <div>
                <strong>{row.plate}</strong>
                <div className="muted">{row.brand} {row.model}</div>
                <div className="muted">
                  {row.customer_name ?? "Sin cliente"} · {row.customer_phone ?? "Sin celular"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700 }}>{label(row.alert_level, Number(row.days_remaining))}</div>
                <div className="muted">{dateCO(row.tecnomecanica_date)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <Link className="btn btn-primary" href="/reportes/tecnomecanica">
          <AlertTriangle size={14} /> Ver reporte de tecnomecánica
        </Link>
      </div>
    </div>
  );
}
