"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPortalCustomer } from "@/lib/motomil/portal";
import { money } from "@/lib/motomil/formatters";

type Invoice = {
  id: string;
  invoice_number: string;
  total: number | string;
  paid: number | string;
  status: string;
  issued_at: string;
  due_at: string | null;
};

export default function PortalInvoices() {
  const supabase = createClient();
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const portalUser = await getPortalCustomer();
        if (!portalUser) throw new Error("No existe una sesión de portal activa.");

        const { data, error: queryError } = await supabase
          .from("invoices")
          .select("id, invoice_number, total, paid, status, issued_at, due_at")
          .eq("customer_id", portalUser.customer_id)
          .order("issued_at", { ascending: false });

        if (queryError) throw queryError;
        if (active) setRows((data ?? []) as Invoice[]);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "No fue posible cargar tus facturas.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, []);

  return (
    <div className="card">
      <div className="section-head">
        <div><div className="eyebrow">Facturación</div><h1 className="page-title">Mis facturas</h1></div>
      </div>
      {loading ? <div className="muted">Cargando facturas...</div> : error ? <div className="error-state">{error}</div> : rows.length === 0 ? <div className="muted">No tienes facturas registradas.</div> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Factura</th><th>Fecha</th><th>Total</th><th>Pagado</th><th>Saldo</th><th>Estado</th></tr></thead>
            <tbody>
              {rows.map((row) => {
                const balance = Math.max(Number(row.total) - Number(row.paid), 0);
                return <tr key={row.id}><td>{row.invoice_number}</td><td>{new Date(row.issued_at).toLocaleDateString("es-CO")}</td><td>{money(row.total)}</td><td>{money(row.paid)}</td><td>{money(balance)}</td><td>{row.status}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
