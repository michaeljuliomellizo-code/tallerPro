"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPortalCustomer } from "@/lib/motomil/portal";

type Motorcycle = {
  id: string;
  plate: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  current_km: number | null;
  next_maintenance_km: number | null;
  next_maintenance_date: string | null;
};

export default function PortalMotorcycles() {
  const supabase = createClient();
  const [rows, setRows] = useState<Motorcycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const portalUser = await getPortalCustomer();
        if (!portalUser) throw new Error("No existe una sesión de portal activa.");
        const { data, error: queryError } = await supabase
          .from("motorcycles")
          .select("id, plate, brand, model, year, current_km, next_maintenance_km, next_maintenance_date")
          .eq("customer_id", portalUser.customer_id)
          .eq("active", true)
          .order("plate");
        if (queryError) throw queryError;
        if (active) setRows((data ?? []) as Motorcycle[]);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "No fue posible cargar tus motocicletas.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  return <div className="card"><div className="section-head"><div><div className="eyebrow">Mi cuenta</div><h1 className="page-title">Mis motocicletas</h1></div></div>
    {loading ? <div className="muted">Cargando motocicletas...</div> : error ? <div className="error-state">{error}</div> : rows.length === 0 ? <div className="muted">No tienes motocicletas registradas.</div> : <div className="grid grid-2">{rows.map((row) => <div className="card" key={row.id}><h3>{row.brand ?? ""} {row.model ?? ""}</h3><div className="muted">Placa: {row.plate ?? "—"} · {row.year ?? "—"}</div><div style={{ marginTop: 10 }}>KM actual: <strong>{Number(row.current_km ?? 0).toLocaleString("es-CO")}</strong></div><div>Próximo mantenimiento: <strong>{row.next_maintenance_km != null ? `${row.next_maintenance_km.toLocaleString("es-CO")} km` : "—"}</strong></div></div>)}</div>}
  </div>;
}
