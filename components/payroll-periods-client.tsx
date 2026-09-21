"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  CalendarDays,
  FileText,
  LockKeyhole,
  Plus,
} from "lucide-react";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/utils";

type Period = {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  status: string;
};

type Entry = {
  mechanic_id: string;
  mechanic_name: string;
  service_order_count: number;
  service_order_value: number;
  commission_rate: number;
  commission_amount: number;
  adjustments: number;
  total_due: number;
};

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export default function PayrollPeriodsClient() {
  const supabase = createClient();

  const [periods, setPeriods] = useState<Period[]>([]);
  const [periodId, setPeriodId] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [initialized, setInitialized] = useState(false);

  const [form, setForm] = useState({
    name: "Periodo Septiembre 2026",
    starts_on: "2026-09-01",
    ends_on: "2026-09-30",
  });

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function loadEntries(id: string) {
    if (!id) {
      setEntries([]);
      return;
    }

    setErr("");

    const { data: period } = await supabase
      .from("payroll_periods")
      .select("organization_id")
      .eq("id", id)
      .maybeSingle();

    if (!period?.organization_id) {
      setEntries([]);
      return;
    }

    const [{ data: payrollData, error: payrollError }, { data: mechanicsData }] =
      await Promise.all([
        supabase
          .from("payroll_entries")
          .select(
            "mechanic_id,service_order_count,service_order_value,commission_rate,commission_amount,base_amount,total_due",
          )
          .eq("payroll_period_id", id)
          .eq("organization_id", period.organization_id)
          .order("total_due", { ascending: false }),
        supabase
          .from("mechanics")
          .select("id,full_name")
          .eq("organization_id", period.organization_id)
          .order("full_name"),
      ]);

    if (payrollError) {
      setErr(payrollError.message);
      setEntries([]);
      return;
    }

    const mechanicMap = new Map(
      (mechanicsData ?? []).map((mechanic) => [mechanic.id, mechanic.full_name]),
    );

    setEntries(
      (payrollData ?? []).map((entry) => ({
        mechanic_id: entry.mechanic_id,
        mechanic_name:
          mechanicMap.get(entry.mechanic_id) ?? entry.mechanic_id,
        service_order_count: Number(entry.service_order_count ?? 0),
        service_order_value: Number(entry.service_order_value ?? 0),
        commission_rate: Number(entry.commission_rate ?? 0),
        commission_amount: Number(entry.commission_amount ?? 0),
        adjustments: Number(entry.base_amount ?? 0),
        total_due: Number(entry.total_due ?? 0),
      })),
    );
  }

  async function load(preferredPeriodId?: string) {
    setErr("");

    const { data, error } = await supabase
      .from("payroll_periods")
      .select("id,name,starts_on,ends_on,status")
      .order("starts_on", { ascending: false });

    if (error) {
      setErr(error.message);
      setInitialized(true);
      return;
    }

    const nextPeriods = (data ?? []) as Period[];
    setPeriods(nextPeriods);

    const closedLatest = nextPeriods.find((period) => period.status === "closed");
    const nextId = preferredPeriodId
      ? nextPeriods.some((period) => period.id === preferredPeriodId)
        ? preferredPeriodId
        : closedLatest?.id ?? ""
      : closedLatest?.id ?? "";

    setPeriodId(nextId);

    if (nextId) {
      await loadEntries(nextId);
    } else {
      setEntries([]);
    }

    setInitialized(true);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();

    setErr("");
    setMsg("");

    const { data, error } = await supabase.rpc("create_payroll_period", {
      p_name: form.name,
      p_starts_on: form.starts_on,
      p_ends_on: form.ends_on,
    });

    if (error) {
      setErr(error.message);
      return;
    }

    setMsg("Periodo creado.");
    const createdId = data?.id ?? "";

    await load(createdId);
  }

  async function select(id: string) {
    setPeriodId(id);
    setMsg("");
    setErr("");
    await loadEntries(id);
  }

  async function close() {
    if (!periodId) return;

    const selected = periods.find((period) => period.id === periodId);
    if (!selected) return;

    const confirmed = window.confirm(
      `¿Cerrar y liquidar el ${selected.name}?\n\nDespués del cierre se generarán las liquidaciones de los empleados y estarán disponibles para ver/imprimir individualmente.`,
    );

    if (!confirmed) return;

    const { data, error } = await supabase.rpc("close_payroll_period", {
      p_period_id: periodId,
    });

    if (error) {
      setErr(error.message);
      return;
    }

    setMsg(
      `Periodo cerrado. ${data?.entries_count ?? 0} liquidaciones generadas.`,
    );

    await load(periodId);
  }

  const activePeriod = periods.find((period) => period.id === periodId) ?? null;

  return (
    <>
      <div className="grid grid-2">
        <div className="card">
          <div className="section-head">
            <div>
              <h2>Crear periodo</h2>

              <div className="muted">
                Agrupa días de caja y liquidación de empleados.
              </div>
            </div>

            <CalendarDays size={16} />
          </div>

          <form className="form-grid" onSubmit={create}>
            <div className="field">
              <label>Nombre</label>

              <input
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="field">
              <label>Inicio</label>

              <input
                type="date"
                value={form.starts_on}
                onChange={(e) =>
                  setForm({
                    ...form,
                    starts_on: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="field">
              <label>Fin</label>

              <input
                type="date"
                value={form.ends_on}
                onChange={(e) =>
                  setForm({
                    ...form,
                    ends_on: e.target.value,
                  })
                }
                required
              />
            </div>

            <button className="btn btn-primary">
              <Plus size={14} />
              Crear periodo
            </button>
          </form>
        </div>

        <div className="card">
          <div className="section-head">
            <div>
              <h2>Periodos</h2>
              <div className="muted">
                Al entrar a este módulo se selecciona automáticamente el último
                periodo cerrado.
              </div>
            </div>

            <CalendarDays size={16} />
          </div>

          {periods.map((period) => (
            <button
              key={period.id}
              className="btn btn-ghost"
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                marginBottom: 6,
                border:
                  period.id === periodId ? "1px solid #0c1830" : undefined,
              }}
              onClick={() => void select(period.id)}
            >
              {period.name} · {formatDate(period.starts_on)} → {formatDate(
                period.ends_on,
              )} · {period.status}
            </button>
          ))}

          {initialized && periods.length === 0 && (
            <div className="empty">No hay periodos creados.</div>
          )}

          {activePeriod && activePeriod.status !== "closed" && (
            <button className="btn btn-primary" onClick={() => void close()}>
              <LockKeyhole size={14} />
              Cerrar periodo y liquidar
            </button>
          )}
        </div>
      </div>

      {(msg || err) && (
        <div
          className="card"
          style={{
            marginTop: 12,
            color: err ? "#a52222" : undefined,
          }}
        >
          {err || msg}
        </div>
      )}

      {periodId && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="section-head">
            <div>
              <h2>Liquidación de empleados</h2>
              <div className="muted">
                {activePeriod?.status === "closed"
                  ? "Periodo cerrado. Cada empleado tiene disponible su detalle para ver e imprimir."
                  : "La liquidación definitiva se genera al cerrar el periodo."}
              </div>
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="empty">
              {activePeriod?.status === "closed"
                ? "No hay liquidaciones generadas para este periodo."
                : "No hay liquidaciones hasta cerrar el periodo."}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Órdenes</th>
                    <th>Valor servicios</th>
                    <th>%</th>
                    <th>Comisión</th>
                    <th>Total a pagar</th>
                    <th>Liquidación</th>
                  </tr>
                </thead>

                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.mechanic_id}>
                      <td>
                        <strong>{entry.mechanic_name}</strong>
                      </td>

                      <td>{entry.service_order_count}</td>

                      <td>{money(entry.service_order_value)}</td>

                      <td>{entry.commission_rate.toFixed(2)}%</td>

                      <td>{money(entry.commission_amount)}</td>

                      <td>
                        <strong>{money(entry.total_due)}</strong>
                      </td>

                      <td>
                        {activePeriod?.status === "closed" ? (
                          <Link
                            className="btn btn-ghost"
                            href={`/mecanicos/comisiones/pdf?start=${encodeURIComponent(
                              activePeriod.starts_on,
                            )}&end=${encodeURIComponent(
                              activePeriod.ends_on,
                            )}&mechanic=${encodeURIComponent(entry.mechanic_id)}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <FileText size={14} />
                            Ver / imprimir PDF
                          </Link>
                        ) : (
                          <span className="muted">Disponible al cerrar</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
