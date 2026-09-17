"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Row {
  service_order_id: string;
  order_number: string;
  service_date: string;
  mechanic_id: string;
  mechanic_name: string;
  branch_name: string | null;
  service_description: string | null;
  service_category: string | null;
  labor_quantity: number;
  labor_amount: number;
  commission_type: string;
  commission_value: number;
  commission_amount: number;
  payment_status: string;
}

interface Mechanic {
  id: string;
  full_name: string;
}

interface Organization {
  name: string | null;
  legal_name: string | null;
  tax_id: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
}

const money = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

const date = (value: string) => {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-CO");
};

function esc(value: string) {
  return value.replace(/[&<>\"]/g, (char) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
    })[char] ?? char,
  );
}

export default function MechanicsCommissionPdfPage() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [mechanicName, setMechanicName] = useState("Todos los mecánicos");
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const startParam = params.get("start") ?? "";
    const endParam = params.get("end") ?? "";
    const mechanicParam = params.get("mechanic") ?? "";
    const branchParam = params.get("branch") ?? "";
    const paymentParam = params.get("payment") ?? "";
    const orderParam = params.get("order")?.toLowerCase() ?? "";
    const serviceParam = params.get("service")?.toLowerCase() ?? "";

    setStart(startParam);
    setEnd(endParam);

    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("No existe una sesión activa.");

        const { data: membership, error: membershipError } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (membershipError) throw membershipError;
        if (!membership?.organization_id) {
          throw new Error("No hay una organización asignada.");
        }

        const [{ data: report, error: reportError }, { data: org }, { data: mechanics }] =
          await Promise.all([
            supabase.rpc("get_mechanic_commission_report", {
              p_start_date: startParam,
              p_end_date: endParam,
              p_mechanic_id: mechanicParam || null,
              p_branch_id: branchParam || null,
              p_payment_status: paymentParam || null,
            }),
            supabase
              .from("organizations")
              .select("name,legal_name,tax_id,phone,email,address,city")
              .eq("id", membership.organization_id)
              .maybeSingle(),
            supabase
              .from("mechanics")
              .select("id,full_name")
              .eq("organization_id", membership.organization_id),
          ]);

        if (reportError) throw reportError;

        const filtered = ((report ?? []) as Row[]).filter(
          (row) =>
            (!orderParam || row.order_number.toLowerCase().includes(orderParam)) &&
            (!serviceParam ||
              String(row.service_description ?? "")
                .toLowerCase()
                .includes(serviceParam)),
        );

        setRows(filtered);
        setOrganization((org ?? null) as Organization | null);

        const selectedMechanic = (mechanics ?? []).find(
          (item: Mechanic) => item.id === mechanicParam,
        );

        setMechanicName(selectedMechanic?.full_name ?? "Todos los mecánicos");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No fue posible generar el reporte.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  const laborTotal = rows.reduce(
    (sum, row) => sum + Number(row.labor_amount || 0),
    0,
  );

  const commissionTotal = rows.reduce(
    (sum, row) => sum + Number(row.commission_amount || 0),
    0,
  );

  const byMechanic = useMemo(() => {
    const map = new Map<
      string,
      { name: string; labor: number; commission: number; orders: Set<string> }
    >();

    for (const row of rows) {
      const current = map.get(row.mechanic_id) ?? {
        name: row.mechanic_name,
        labor: 0,
        commission: 0,
        orders: new Set<string>(),
      };

      current.labor += Number(row.labor_amount || 0);
      current.commission += Number(row.commission_amount || 0);
      current.orders.add(row.service_order_id);
      map.set(row.mechanic_id, current);
    }

    return Array.from(map.values()).map((item) => ({
      ...item,
      orderCount: item.orders.size,
      effectiveRate: item.labor > 0 ? (item.commission / item.labor) * 100 : 0,
    }));
  }, [rows]);

  useEffect(() => {
    if (loading || error) return;
    const timer = window.setTimeout(() => window.print(), 500);
    return () => window.clearTimeout(timer);
  }, [loading, error]);

  if (loading) return <div style={{ padding: 24 }}>Generando reporte...</div>;
  if (error) return <div style={{ padding: 24, color: "#a52222" }}>{error}</div>;

  return (
    <div className="sheet">
      <div className="header">
        <div className="brand">
          <img src="/assets/motomil-logo.png" alt="MotoMil" />
        </div>
        <div className="org">
          <div className="orgName">
            {organization?.legal_name || organization?.name || "MotoMil Taller"}
          </div>
          {organization?.tax_id && <div>NIT: {organization.tax_id}</div>}
          {organization?.address && <div>{organization.address}</div>}
          {organization?.city && <div>{organization.city}</div>}
          {organization?.phone && <div>Tel: {organization.phone}</div>}
          {organization?.email && <div>{organization.email}</div>}
        </div>
      </div>

      <div className="titleRow">
        <div>
          <h1>LIQUIDACIÓN DE COMISIONES</h1>
          <div className="subtitle">Comisiones de mecánicos - solo mano de obra</div>
        </div>
        <div className="period">
          <strong>PERÍODO</strong>
          <span>{date(start)} - {date(end)}</span>
        </div>
      </div>

      <div className="metaGrid">
        <div>
          <span>MECÁNICO</span>
          <strong>{mechanicName}</strong>
        </div>
        <div>
          <span>LÍNEAS</span>
          <strong>{rows.length}</strong>
        </div>
        <div>
          <span>MANO DE OBRA</span>
          <strong>{money(laborTotal)}</strong>
        </div>
        <div>
          <span>COMISIÓN TOTAL</span>
          <strong>{money(commissionTotal)}</strong>
        </div>
      </div>

      <h2>Resumen por mecánico</h2>
      <table>
        <thead>
          <tr>
            <th>Mecánico</th>
            <th className="r">Órdenes</th>
            <th className="r">Mano de obra</th>
            <th className="r">% efectivo</th>
            <th className="r">Comisión</th>
          </tr>
        </thead>
        <tbody>
          {byMechanic.map((item) => (
            <tr key={item.name}>
              <td>{esc(item.name)}</td>
              <td className="r">{item.orderCount}</td>
              <td className="r">{money(item.labor)}</td>
              <td className="r">{item.effectiveRate.toFixed(2)}%</td>
              <td className="r"><strong>{money(item.commission)}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Detalle de servicios liquidados</h2>
      <table>
        <thead>
          <tr>
            <th>Orden</th>
            <th>Fecha</th>
            <th>Mecánico</th>
            <th>Servicio</th>
            <th className="r">Mano de obra</th>
            <th className="r">Regla</th>
            <th className="r">Comisión</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.service_order_id}-${index}`}>
              <td>{esc(row.order_number)}</td>
              <td>{date(row.service_date)}</td>
              <td>{esc(row.mechanic_name)}</td>
              <td>
                {esc(row.service_description || "Mano de obra")}
                {row.service_category ? (
                  <div className="muted">{esc(row.service_category)}</div>
                ) : null}
              </td>
              <td className="r">{money(Number(row.labor_amount))}</td>
              <td className="r">
                {row.commission_type === "percentage"
                  ? `${row.commission_value}%`
                  : `${money(Number(row.commission_value))}/u`}
              </td>
              <td className="r"><strong>{money(Number(row.commission_amount))}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>

      {rows.length === 0 && (
        <div className="empty">No hay actividades de comisión para este período.</div>
      )}

      <div className="totals">
        <div><span>Mano de obra liquidada</span><strong>{money(laborTotal)}</strong></div>
        <div><span>Comisión</span><strong>{money(commissionTotal)}</strong></div>
      </div>

      <div className="note">
        La comisión se calcula únicamente sobre conceptos de mano de obra.
        Los repuestos e inventario no forman parte de la base de comisión.
      </div>

      <div className="signatures">
        <div><div className="line" />Responsable de liquidación</div>
        <div><div className="line" />Mecánico / Recibido</div>
      </div>

      <footer>
        <span>MotoMil Taller - Liquidación generada por el sistema</span>
        <span>{new Date().toLocaleString("es-CO")}</span>
      </footer>
    </div>
  );
}
