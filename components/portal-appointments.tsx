"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPortalCustomer } from "@/lib/motomil/portal";

type Appointment = {
  id: string;
  starts_at: string;
  ends_at: string | null;
  service_type: string | null;
  status: string;
  notes: string | null;
};

export default function PortalAppointments() {
  const supabase = createClient();
  const [rows, setRows] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const portalUser = await getPortalCustomer();
        if (!portalUser) throw new Error("No existe una sesión de portal activa.");

        const { data, error: queryError } = await supabase
          .from("appointments")
          .select("id, starts_at, ends_at, service_type, status, notes")
          .eq("customer_id", portalUser.customer_id)
          .order("starts_at", { ascending: false })
          .limit(50);

        if (queryError) throw queryError;
        if (active) setRows((data ?? []) as Appointment[]);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "No fue posible cargar tus citas.");
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
          <div className="eyebrow">Agenda</div>
          <h1 className="page-title">Mis citas</h1>
        </div>
      </div>

      {loading ? (
        <div className="muted">Cargando citas...</div>
      ) : error ? (
        <div className="error-state">{error}</div>
      ) : rows.length === 0 ? (
        <div className="muted">No tienes citas registradas.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Fecha</th><th>Servicio</th><th>Estado</th><th>Notas</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.starts_at).toLocaleString("es-CO")}</td>
                  <td>{row.service_type ?? "—"}</td>
                  <td>{row.status}</td>
                  <td>{row.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
