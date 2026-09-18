"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentOrganizationId } from "@/lib/motomil/organization";

type Quotation = {
  id: string;
  order_number: number;
  status: string;
  quoted_at: string | null;
  total: number;
};

const STATUS_LABELS: Record<string, string> = {
  quote: "Cotización",
  approved: "Aprobada",
  cancelled: "Cancelada",
};

function money(value: number) {
  return Number(value || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

export default function QuotationBoard() {
  const supabase = createClient();
  const [rows, setRows] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const organizationId = await getCurrentOrganizationId();
        const { data, error: queryError } = await supabase
          .from("service_orders")
          .select("id,order_number,status,quoted_at,total")
          .eq("organization_id", organizationId)
          .in("status", ["quote", "approved", "cancelled"])
          .order("quoted_at", { ascending: false, nullsFirst: false });

        if (queryError) throw queryError;
        if (active) setRows((data ?? []) as Quotation[]);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No fue posible cargar las cotizaciones."
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
  }, [supabase]);

  if (loading) return <div className="card">Cargando cotizaciones...</div>;
  if (error) return <div className="card error-state">{error}</div>;

  if (!rows.length) {
    return <div className="card"><div className="empty">No hay cotizaciones.</div></div>;
  }

  return (
    <div className="card">
      <div className="table-wrap quotation-desktop-table">
        <table className="table">
          <thead>
            <tr>
              <th>Orden</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><strong>#{row.order_number}</strong></td>
                <td>{STATUS_LABELS[row.status] ?? row.status}</td>
                <td>{row.quoted_at ? new Date(row.quoted_at).toLocaleString("es-CO") : "—"}</td>
                <td>{money(row.total)}</td>
                <td>
                  <Link className="btn btn-ghost" href={`/ordenes/${row.id}`}>
                    <FileText size={13} /> Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="quotation-mobile-list">
        {rows.map((row) => (
          <article className="card" key={row.id}>
            <div className="section-head">
              <div>
                <div className="eyebrow">Orden</div>
                <h2>#{row.order_number}</h2>
              </div>
              <span className="badge badge-blue">
                {STATUS_LABELS[row.status] ?? row.status}
              </span>
            </div>
            <div className="grid" style={{ gap: 8 }}>
              <div><span className="muted">Fecha</span><strong style={{ display: "block" }}>{row.quoted_at ? new Date(row.quoted_at).toLocaleDateString("es-CO") : "—"}</strong></div>
              <div><span className="muted">Total</span><strong style={{ display: "block", fontSize: 20 }}>{money(row.total)}</strong></div>
            </div>
            <Link className="btn btn-primary" style={{ marginTop: 12, width: "100%" }} href={`/ordenes/${row.id}`}>
              <FileText size={14} /> Abrir cotización
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
