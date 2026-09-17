"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarClock, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AlertLevel = "expired" | "today" | "warning" | "ok";

type AlertRow = {
  id: string;
  plate: string;
  motorcycle: string;
  tecnomecanica_date: string;
  days_remaining: number;
  alert_level: AlertLevel;
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

function statusLabel(level: AlertLevel) {
  if (level === "expired") return "VENCIDA";
  if (level === "today") return "VENCE HOY";
  if (level === "warning") return "POR VENCER";
  return "VIGENTE";
}

export default function TecnomecanicaReportClient() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [filter, setFilter] = useState<"all" | "expired" | "warning">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("vw_tecnomecanica_alertas")
      .select(
        "id,plate,brand,model,tecnomecanica_date,days_remaining,alert_level,customer_name,customer_phone"
      )
      .order("tecnomecanica_date", { ascending: true });

    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      const normalized = ((data ?? []) as Array<AlertRow & { brand: string; model: string }>).map((row) => ({
        id: row.id,
        plate: row.plate,
        motorcycle: `${row.brand} ${row.model}`.trim(),
        tecnomecanica_date: row.tecnomecanica_date,
        days_remaining: Number(row.days_remaining),
        alert_level: row.alert_level,
        customer_name: row.customer_name,
        customer_phone: row.customer_phone,
      }));
      setRows(normalized);
    }

    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [supabase]);

  const filtered = rows.filter((row) => {
    if (filter === "expired") return row.alert_level === "expired" || row.alert_level === "today";
    if (filter === "warning") return row.alert_level === "warning";
    return true;
  });

  function exportCsv() {
    const header = ["Placa", "Motocicleta", "Fecha", "Días", "Estado", "Nombre", "Celular"];
    const body = filtered.map((r) => [
      r.plate,
      r.motorcycle,
      dateCO(r.tecnomecanica_date),
      String(r.days_remaining),
      statusLabel(r.alert_level),
      r.customer_name ?? "",
      r.customer_phone ?? "",
    ]);

    const csv = [header, ...body]
      .map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "reporte-tecnomecanica.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Link href="/reportes" className="btn btn-ghost">
        <ArrowLeft size={14} /> Volver a reportes
      </Link>

      <div style={{ height: 12 }} />

      <div className="section-head">
        <div>
          <div className="eyebrow">Reportes</div>
          <h1 className="page-title">Tecnomecánica por vencer</h1>
          <p className="page-subtitle">
            Seguimiento de las motocicletas con tecnomecánica vencida o próxima a vencer.
          </p>
        </div>
        <CalendarClock size={20} />
      </div>

      <div style={{ height: 12 }} />

      <div className="grid grid-3">
        <div className="card">
          <div className="muted">Registros</div>
          <strong style={{ fontSize: 24 }}>{rows.length}</strong>
        </div>
        <div className="card">
          <div className="muted">Vencidas / hoy</div>
          <strong style={{ fontSize: 24 }}>
            {rows.filter((r) => r.alert_level === "expired" || r.alert_level === "today").length}
          </strong>
        </div>
        <div className="card">
          <div className="muted">Por vencer</div>
          <strong style={{ fontSize: 24 }}>
            {rows.filter((r) => r.alert_level === "warning").length}
          </strong>
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-ghost" onClick={() => setFilter("all")}>Todos</button>
            <button className="btn btn-ghost" onClick={() => setFilter("expired")}>Vencidas / hoy</button>
            <button className="btn btn-ghost" onClick={() => setFilter("warning")}>Por vencer</button>
          </div>
          <button className="btn btn-primary" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="card">
        {loading ? (
          <div className="empty">Cargando reporte...</div>
        ) : error ? (
          <div style={{ color: "#a52222" }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div className="empty">No hay registros para este filtro.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Placa</th>
                  <th>Motocicleta</th>
                  <th>Fecha</th>
                  <th>Días</th>
                  <th>Estado</th>
                  <th>Nombre</th>
                  <th>Celular</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{row.plate}</strong></td>
                    <td>{row.motorcycle}</td>
                    <td>{dateCO(row.tecnomecanica_date)}</td>
                    <td>{row.days_remaining}</td>
                    <td>{statusLabel(row.alert_level)}</td>
                    <td>{row.customer_name ?? "Sin cliente"}</td>
                    <td>{row.customer_phone ?? "Sin celular"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
