"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CalendarClock, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import TecnomecanicaAlert, { getTecnomecanicaState } from "@/components/tecnomecanica-alert";

type Motorcycle = {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  current_km: number;
  tecnomecanica_date: string | null;
};

export default function TecnomecanicaPage() {
  const supabase = useMemo(() => createClient(), []);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("No existe una sesión activa.");

      const { data: membership, error: membershipError } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (membershipError) throw membershipError;
      if (!membership?.organization_id) {
        throw new Error("El usuario autenticado no tiene una organización asignada.");
      }

      const { data, error: queryError } = await supabase
        .from("motorcycles")
        .select("id,plate,brand,model,year,current_km,tecnomecanica_date")
        .eq("organization_id", membership.organization_id)
        .order("tecnomecanica_date", { ascending: true, nullsFirst: false });

      if (queryError) throw queryError;
      setMotorcycles((data ?? []) as Motorcycle[]);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No fue posible cargar las motocicletas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const alerts = motorcycles
    .filter((motorcycle) => motorcycle.tecnomecanica_date)
    .map((motorcycle) => ({
      motorcycle,
      state: getTecnomecanicaState(motorcycle.tecnomecanica_date),
    }))
    .filter(({ state }) => state.days !== null && state.days <= 14)
    .sort((a, b) => (a.state.days ?? 99999) - (b.state.days ?? 99999));

  return (
    <>
      <Link href="/motocicletas" className="btn btn-ghost">
        <ArrowLeft size={14} />
        Volver a motocicletas
      </Link>

      <div style={{ height: 12 }} />

      <div className="section-head">
        <div>
          <div className="eyebrow">Mantenimiento documental</div>
          <h1 className="page-title">Alertas de tecnomecánica</h1>
          <p className="page-subtitle">
            Se muestran las motocicletas vencidas o con vencimiento dentro de los próximos 14 días.
          </p>
        </div>
        <CalendarClock size={22} />
      </div>

      {error && (
        <div
          style={{
            marginTop: 14,
            padding: "10px 12px",
            borderRadius: 8,
            background: "#fff0f0",
            color: "#a52222",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ marginTop: 16 }}>
          Cargando alertas...
        </div>
      ) : alerts.length === 0 ? (
        <div className="card" style={{ marginTop: 16 }}>
          <CheckCircle2 size={20} />
          <div style={{ marginTop: 8, fontWeight: 700 }}>
            No hay motocicletas vencidas ni por vencer en los próximos 14 días.
          </div>
        </div>
      ) : (
        <div className="grid" style={{ gap: 12, marginTop: 16 }}>
          {alerts.map(({ motorcycle, state }) => (
            <div key={motorcycle.id} className="card">
              <div className="section-head">
                <div>
                  <strong>
                    {motorcycle.brand} {motorcycle.model} · {motorcycle.plate}
                  </strong>
                  <div className="muted" style={{ marginTop: 4 }}>
                    {motorcycle.year ?? "Año no registrado"} · {motorcycle.current_km.toLocaleString("es-CO")} km
                  </div>
                </div>
                <AlertTriangle size={18} />
              </div>

              <div style={{ marginTop: 10 }}>
                <TecnomecanicaAlert dueDate={motorcycle.tecnomecanica_date} />
              </div>

              <Link
                href={`/ordenes/nueva?motorcycle_id=${motorcycle.id}`}
                className="btn btn-ghost"
                style={{ marginTop: 10 }}
              >
                Abrir atención
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
