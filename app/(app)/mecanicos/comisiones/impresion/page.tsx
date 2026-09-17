"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

interface Row {
  service_order_id: string;
  order_number: string;
  service_date: string;
  mechanic_id: string;
  mechanic_name: string;
  branch_id: string | null;
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
  document_number: string | null;
  phone: string | null;
  email: string | null;
  branch_id: string | null;
}

interface Period {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  status: string;
}

const money = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value: string | null) => {
  if (!value) return "-";

  const [year, month, day] = value.slice(0, 10).split("-");

  return `${day}/${month}/${year}`;
};

const formatCommissionRule = (row: Row) => {
  if (row.commission_type === "percentage") {
    return `${Number(row.commission_value || 0)}%`;
  }

  return `${money(Number(row.commission_value || 0))} / unidad`;
};

export default function CommissionPrintPage() {
  const searchParams = useSearchParams();

  const start = searchParams.get("start") ?? "";
  const end = searchParams.get("end") ?? "";
  const mechanicId = searchParams.get("mechanic") ?? "";

  const [rows, setRows] = useState<Row[]>([]);
  const [mechanic, setMechanic] = useState<Mechanic | null>(null);
  const [period, setPeriod] = useState<Period | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        if (!start || !end || !mechanicId) {
          throw new Error(
            "Faltan parámetros para generar la liquidación."
          );
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("No existe una sesión activa.");
        }

        const { data: membership, error: membershipError } =
          await supabase
            .from("organization_members")
            .select("organization_id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (membershipError) {
          throw membershipError;
        }

        if (!membership?.organization_id) {
          throw new Error(
            "El usuario no tiene organización asignada."
          );
        }

        const [
          { data: reportData, error: reportError },
          { data: mechanicData, error: mechanicError },
          { data: periodData, error: periodError },
        ] = await Promise.all([
          supabase.rpc("get_mechanic_commission_report", {
            p_start_date: start,
            p_end_date: end,
            p_mechanic_id: mechanicId,
            p_branch_id: null,
            p_payment_status: null,
          }),

          supabase
            .from("mechanics")
            .select(
              "id,full_name,document_number,phone,email,branch_id"
            )
            .eq("id", mechanicId)
            .eq("organization_id", membership.organization_id)
            .maybeSingle(),

          supabase
            .from("payroll_periods")
            .select(
              "id,name,starts_on,ends_on,status"
            )
            .eq(
              "organization_id",
              membership.organization_id
            )
            .eq("starts_on", start)
            .eq("ends_on", end)
            .maybeSingle(),
        ]);

        if (reportError) {
          throw reportError;
        }

        if (mechanicError) {
          throw mechanicError;
        }

        if (periodError) {
          throw periodError;
        }

        setRows((reportData ?? []) as Row[]);
        setMechanic(mechanicData as Mechanic | null);
        setPeriod(periodData as Period | null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No fue posible generar la liquidación."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [start, end, mechanicId]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => ({
        labor: acc.labor + Number(row.labor_amount || 0),
        commission:
          acc.commission + Number(row.commission_amount || 0),
      }),
      {
        labor: 0,
        commission: 0,
      }
    );
  }, [rows]);

  const generatedAt = useMemo(
    () => new Date(),
    []
  );

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        Generando liquidación...
      </main>
    );
  }

  if (error) {
    return (
      <main
        style={{
          padding: 40,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h1>Error</h1>
        <p>{error}</p>
      </main>
    );
  }

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #f2f4f5;
          color: #111827;
          font-family: Arial, Helvetica, sans-serif;
        }

        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .print-toolbar {
          display: flex;
          justify-content: center;
          gap: 10px;
          padding: 18px;
          background: #111827;
          position: sticky;
          top: 0;
          z-index: 20;
        }

        .print-button,
        .back-button {
          border: none;
          border-radius: 8px;
          padding: 11px 18px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .print-button {
          background: #ec1b3a;
          color: white;
        }

        .back-button {
          background: white;
          color: #111827;
        }

        .page {
          width: 210mm;
          min-height: 297mm;
          margin: 20px auto;
          background: white;
          padding: 15mm;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          border-bottom: 3px solid #0c1830;
          padding-bottom: 14px;
        }

        .logo {
          width: 225px;
          max-width: 100%;
          height: auto;
          object-fit: contain;
        }

        .company {
          text-align: right;
          font-size: 11px;
          color: #4b5563;
          line-height: 1.5;
        }

        .title {
          text-align: center;
          margin: 22px 0 16px;
        }

        .title h1 {
          margin: 0;
          font-size: 24px;
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }

        .title p {
          margin: 6px 0 0;
          font-size: 12px;
          color: #6b7280;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 18px;
        }

        .info-card {
          border: 1px solid #d8dde3;
          border-radius: 8px;
          padding: 11px;
        }

        .info-label {
          font-size: 9px;
          color: #6b7280;
          text-transform: uppercase;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .info-value {
          font-size: 13px;
          font-weight: 700;
        }

        .section-title {
          margin: 15px 0 8px;
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          color: #111827;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9.5px;
        }

        thead {
          background: #0c1830;
          color: white;
        }

        th {
          padding: 8px 6px;
          text-align: left;
          font-size: 9px;
          text-transform: uppercase;
        }

        td {
          padding: 7px 6px;
          border-bottom: 1px solid #e5e7eb;
          vertical-align: top;
        }

        tbody tr:nth-child(even) {
          background: #f8fafc;
        }

        .amount {
          text-align: right;
          white-space: nowrap;
        }

        .muted {
          color: #6b7280;
          font-size: 8px;
          margin-top: 2px;
        }

        .summary {
          width: 45%;
          margin-left: auto;
          margin-top: 18px;
          border: 1px solid #d8dde3;
          border-radius: 8px;
          overflow: hidden;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 11px;
          font-size: 11px;
        }

        .summary-row + .summary-row {
          border-top: 1px solid #e5e7eb;
        }

        .summary-total {
          display: flex;
          justify-content: space-between;
          padding: 13px 11px;
          background: #0c1830;
          color: white;
          font-size: 16px;
          font-weight: 800;
        }

        .note {
          margin-top: 20px;
          padding: 10px 12px;
          border-left: 4px solid #24d8b0;
          background: #f3faf8;
          color: #374151;
          font-size: 10px;
          line-height: 1.5;
        }

        .signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          margin-top: 65px;
        }

        .signature {
          border-top: 1px solid #111827;
          padding-top: 7px;
          text-align: center;
          font-size: 10px;
        }

        .footer {
          margin-top: 45px;
          text-align: center;
          color: #6b7280;
          font-size: 8px;
          line-height: 1.5;
          border-top: 1px solid #e5e7eb;
          padding-top: 10px;
        }

        @page {
          size: A4;
          margin: 0;
        }

        @media print {
          html,
          body {
            background: white !important;
          }

          .print-toolbar {
            display: none !important;
          }

          .page {
            width: 210mm;
            min-height: 297mm;
            margin: 0;
            padding: 15mm;
            box-shadow: none;
          }
        }
      `}</style>

      <div className="print-toolbar">
        <button
          className="back-button"
          onClick={() => window.history.back()}
        >
          ← Volver
        </button>

        <button
          className="print-button"
          onClick={() => window.print()}
        >
          🖨️ Imprimir / Guardar PDF
        </button>
      </div>

      <main className="page">
        <header className="header">
          <img
            src="/motomil-logo.jpeg"
            alt="MotoMil Taller"
            className="logo"
          />

          <div className="company">
            <strong>MOTOMIL TALLER</strong>
            <br />
            Taller de motocicletas
            <br />
            Servicio técnico especializado
            <br />
            Bogotá, Colombia
          </div>
        </header>

        <section className="title">
          <h1>Liquidación de comisiones</h1>

          <p>
            Comprobante de pago de mano de obra y comisiones
          </p>
        </section>

        <section className="info-grid">
          <div className="info-card">
            <div className="info-label">
              Mecánico
            </div>

            <div className="info-value">
              {mechanic?.full_name ?? "No disponible"}
            </div>

            {mechanic?.document_number && (
              <div className="muted">
                Documento: {mechanic.document_number}
              </div>
            )}

            {mechanic?.phone && (
              <div className="muted">
                Teléfono: {mechanic.phone}
              </div>
            )}
          </div>

          <div className="info-card">
            <div className="info-label">
              Período
            </div>

            <div className="info-value">
              {period?.name ??
                `${formatDate(start)} - ${formatDate(end)}`}
            </div>

            <div className="muted">
              Desde: {formatDate(start)}
              {" · "}
              Hasta: {formatDate(end)}
            </div>

            <div className="muted">
              Generado:{" "}
              {generatedAt.toLocaleString("es-CO")}
            </div>
          </div>
        </section>

        <div className="section-title">
          Detalle de servicios comisionables
        </div>

        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Origen</th>
              <th>Orden</th>
              <th>Servicio</th>
              <th>Cant.</th>
              <th>Mano de obra</th>
              <th>Regla</th>
              <th>Comisión</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr
                key={`${row.service_order_id}-${index}`}
              >
                <td>
                  {formatDate(row.service_date)}
                </td>

                <td>
                  {row.order_number.startsWith("EXP-")
                    ? "Venta Express"
                    : "Orden de servicio"}
                </td>

                <td>
                  {row.order_number}
                </td>

                <td>
                  <strong>
                    {row.service_description ??
                      "Mano de obra"}
                  </strong>

                  {row.service_category && (
                    <div className="muted">
                      {row.service_category}
                    </div>
                  )}
                </td>

                <td>
                  {Number(row.labor_quantity || 0)}
                </td>

                <td className="amount">
                  {money(
                    Number(row.labor_amount || 0)
                  )}
                </td>

                <td>
                  {formatCommissionRule(row)}
                </td>

                <td className="amount">
                  <strong>
                    {money(
                      Number(
                        row.commission_amount || 0
                      )
                    )}
                  </strong>
                </td>
              </tr>
            ))}

            {!rows.length && (
              <tr>
                <td colSpan={8}>
                  No hay líneas comisionables para
                  este período.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <section className="summary">
          <div className="summary-row">
            <span>
              Total mano de obra
            </span>

            <strong>
              {money(totals.labor)}
            </strong>
          </div>

          <div className="summary-row">
            <span>
              Total de líneas
            </span>

            <strong>
              {rows.length}
            </strong>
          </div>

          <div className="summary-total">
            <span>
              TOTAL COMISIÓN A PAGAR
            </span>

            <span>
              {money(totals.commission)}
            </span>
          </div>
        </section>

        <div className="note">
          La comisión corresponde exclusivamente a
          mano de obra y servicios comisionables.
          Los repuestos no hacen parte de la base
          de comisión.
        </div>

        <section className="signatures">
          <div className="signature">
            Firma del mecánico
            <br />
            {mechanic?.full_name ?? ""}
          </div>

          <div className="signature">
            Responsable de liquidación
            <br />
            MotoMil Taller
          </div>
        </section>

        <footer className="footer">
          MotoMil Taller · Comprobante generado por
          el sistema
          <br />
          Documento de soporte para liquidación de
          comisiones
        </footer>
      </main>
    </>
  );
}