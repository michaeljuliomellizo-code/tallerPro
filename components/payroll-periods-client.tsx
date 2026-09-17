"use client";

import {
    FormEvent,
    useEffect,
    useState,
} from "react";

import {
    CalendarDays,
    LockKeyhole,
    Plus,
} from "lucide-react";

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
    mechanic_name: string;
    service_order_count: number;
    service_order_value: number;
    commission_rate: number;
    commission_amount: number;
    adjustments: number;
    total_due: number;
};

export default function PayrollPeriodsClient() {
    const supabase = createClient();

    const [periods, setPeriods] = useState<Period[]>([]);
    const [periodId, setPeriodId] = useState("");
    const [entries, setEntries] = useState<Entry[]>([]);

    const [form, setForm] = useState({
        name: "Periodo Septiembre 2026",
        starts_on: "2026-09-01",
        ends_on: "2026-09-30",
    });

    const [msg, setMsg] = useState("");
    const [err, setErr] = useState("");

    async function load() {
        const { data } = await supabase
            .from("payroll_periods")
            .select(
                "id,name,starts_on,ends_on,status"
            )
            .order("starts_on", {
                ascending: false,
            });

        setPeriods(data ?? []);
    }

    useEffect(() => {
        load();
    }, []);

    async function create(e: FormEvent) {
        e.preventDefault();

        setErr("");

        const { data, error } = await supabase.rpc(
            "create_payroll_period",
            {
                p_name: form.name,
                p_starts_on: form.starts_on,
                p_ends_on: form.ends_on,
            }
        );

        if (error) {
            setErr(error.message);
            return;
        }

        setMsg("Periodo creado.");
        setPeriodId(data?.id ?? "");

        await load();
    }

    async function select(id: string) {
        setPeriodId(id);

        const { data, error } = await supabase.rpc(
            "get_payroll_period_report",
            {
                p_period_id: id,
            }
        );

        if (error) {
            setErr(error.message);
            return;
        }

        setEntries(data ?? []);
    }

    async function close() {
        if (!periodId) return;

        const { data, error } = await supabase.rpc(
            "close_payroll_period",
            {
                p_period_id: periodId,
            }
        );

        if (error) {
            setErr(error.message);
            return;
        }

        setMsg(
            `Periodo cerrado. ${
                data?.entries_count ?? 0
            } liquidaciones generadas.`
        );

        await select(periodId);
        await load();
    }

    return (
        <>
            <div className="grid grid-2">
                <div className="card">
                    <div className="section-head">
                        <div>
                            <h2>Crear periodo</h2>

                            <div className="muted">
                                Agrupa días de caja y liquidación
                                de empleados.
                            </div>
                        </div>

                        <CalendarDays size={16} />
                    </div>

                    <form
                        className="form-grid"
                        onSubmit={create}
                    >
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
                                        starts_on:
                                            e.target.value,
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
                                        ends_on:
                                            e.target.value,
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
                        <h2>Periodos</h2>

                        <CalendarDays size={16} />
                    </div>

                    {periods.map((p) => (
                        <button
                            key={p.id}
                            className="btn btn-ghost"
                            style={{
                                display: "block",
                                width: "100%",
                                textAlign: "left",
                                marginBottom: 6,
                            }}
                            onClick={() => select(p.id)}
                        >
                            {p.name} · {p.starts_on} →{" "}
                            {p.ends_on} · {p.status}
                        </button>
                    ))}

                    {periodId && (
                        <button
                            className="btn btn-primary"
                            onClick={close}
                            disabled={
                                periods.find(
                                    (p) =>
                                        p.id === periodId
                                )?.status === "closed"
                            }
                        >
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
                        color: err
                            ? "#a52222"
                            : undefined,
                    }}
                >
                    {err || msg}
                </div>
            )}

            {periodId && (
                <div
                    className="card"
                    style={{ marginTop: 12 }}
                >
                    <div className="section-head">
                        <h2>
                            Liquidación de empleados
                        </h2>
                    </div>

                    {entries.length === 0 ? (
                        <div className="empty">
                            No hay actividad de mecánicos
                            en el periodo.
                        </div>
                    ) : (
                        <div
                            style={{
                                overflowX: "auto",
                            }}
                        >
                            <table
                                style={{
                                    width: "100%",
                                }}
                            >
                                <thead>
                                    <tr>
                                        <th>Empleado</th>
                                        <th>Órdenes</th>
                                        <th>
                                            Valor servicios
                                        </th>
                                        <th>%</th>
                                        <th>
                                            Comisión
                                        </th>
                                        <th>Total</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {entries.map(
                                        (e, i) => (
                                            <tr key={i}>
                                                <td>
                                                    {
                                                        e.mechanic_name
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        e.service_order_count
                                                    }
                                                </td>

                                                <td>
                                                    {money(
                                                        Number(
                                                            e.service_order_value
                                                        )
                                                    )}
                                                </td>

                                                <td>
                                                    {Number(
                                                        e.commission_rate
                                                    ).toFixed(
                                                        2
                                                    )}
                                                    %
                                                </td>

                                                <td>
                                                    {money(
                                                        Number(
                                                            e.commission_amount
                                                        )
                                                    )}
                                                </td>

                                                <td>
                                                    <strong>
                                                        {money(
                                                            Number(
                                                                e.total_due
                                                            )
                                                        )}
                                                    </strong>
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}