"use client";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import Link from "next/link";

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
    branch_id: string | null;
}

interface Branch {
    id: string;
    name: string;
}

const money = (n: number) =>
    new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
    }).format(n);

const dateInput = (d: Date) =>
    d.toISOString().slice(0, 10);

export default function MechanicsCommissionReportClient() {
    const now = new Date();

    const [start, setStart] = useState(
        dateInput(
            new Date(
                now.getFullYear(),
                now.getMonth(),
                1
            )
        )
    );

    const [end, setEnd] = useState(
        dateInput(now)
    );

    const [mechanic, setMechanic] = useState("");
    const [branch, setBranch] = useState("");
    const [payment, setPayment] = useState("");
    const [orderFilter, setOrderFilter] =
        useState("");
    const [serviceFilter, setServiceFilter] =
        useState("");

    const [rows, setRows] = useState<Row[]>([]);
    const [mechanics, setMechanics] =
        useState<Mechanic[]>([]);
    const [branches, setBranches] =
        useState<Branch[]>([]);

    const [loading, setLoading] =
        useState(false);
    const [error, setError] = useState("");
    const [periodReady, setPeriodReady] =
        useState(false);
    const [periodName, setPeriodName] =
        useState("");

    useEffect(() => {
        (async () => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (!user) {
                    setPeriodReady(true);
                    return;
                }

                const { data: mem, error: membershipError } = await supabase
                    .from("organization_members")
                    .select("organization_id")
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (membershipError) throw membershipError;
                if (!mem?.organization_id) {
                    setPeriodReady(true);
                    return;
                }

                const [
                    { data: m },
                    { data: b },
                    { data: latestClosed, error: periodError },
                ] = await Promise.all([
                    supabase
                        .from("mechanics")
                        .select("id,full_name,branch_id")
                        .eq("organization_id", mem.organization_id)
                        .order("full_name"),
                    supabase
                        .from("branches")
                        .select("id,name")
                        .eq("organization_id", mem.organization_id)
                        .order("name"),
                    supabase
                        .from("payroll_periods")
                        .select("id,name,starts_on,ends_on,status")
                        .eq("organization_id", mem.organization_id)
                        .eq("status", "closed")
                        .order("starts_on", { ascending: false })
                        .limit(1)
                        .maybeSingle(),
                ]);

                if (periodError) throw periodError;

                setMechanics(m ?? []);
                setBranches(b ?? []);

                if (latestClosed) {
                    setStart(latestClosed.starts_on);
                    setEnd(latestClosed.ends_on);
                    setPeriodName(latestClosed.name);
                }
            } catch (e) {
                setError(
                    e instanceof Error
                        ? e.message
                        : "No fue posible cargar el último periodo cerrado."
                );
            } finally {
                setPeriodReady(true);
            }
        })();
    }, []);

    async function run() {
        if (!periodReady || !start || !end) return;

        setLoading(true);
        setError("");

        const {
            data,
            error: e,
        } = await supabase.rpc(
            "get_mechanic_commission_report",
            {
                p_start_date: start,
                p_end_date: end,
                p_mechanic_id:
                    mechanic || null,
                p_branch_id:
                    branch || null,
                p_payment_status:
                    payment || null,
            }
        );

        if (e) {
            setError(e.message);
        } else {
            setRows(
                (data ?? []) as Row[]
            );
        }

        setLoading(false);
    }

    useEffect(() => {
        if (periodReady) {
            void run();
        }
    }, [
        periodReady,
        start,
        end,
        mechanic,
        branch,
        payment,
    ]);

    const filteredRows = useMemo(
        () =>
            rows.filter(
                (r) =>
                    (!orderFilter ||
                        r.order_number
                            .toLowerCase()
                            .includes(
                                orderFilter.toLowerCase()
                            )) &&
                    (!serviceFilter ||
                        String(
                            r.service_description ||
                                ""
                        )
                            .toLowerCase()
                            .includes(
                                serviceFilter.toLowerCase()
                            ))
            ),
        [
            rows,
            orderFilter,
            serviceFilter,
        ]
    );

    const totals = useMemo(
        () =>
            filteredRows.reduce(
                (a, r) => ({
                    labor:
                        a.labor +
                        Number(
                            r.labor_amount || 0
                        ),
                    commission:
                        a.commission +
                        Number(
                            r.commission_amount ||
                                0
                        ),
                }),
                {
                    labor: 0,
                    commission: 0,
                }
            ),
        [filteredRows]
    );

    function exportCsv() {
        const head = [
            "Orden",
            "Fecha",
            "Mecánico",
            "Sucursal",
            "Servicio",
            "Categoría",
            "Cantidad",
            "Mano de obra",
            "Tipo",
            "Regla",
            "Comisión",
            "Estado pago",
        ];



        const body = filteredRows.map(
            (r) => [
                r.order_number,
                r.service_date,
                r.mechanic_name,
                r.branch_name ?? "",
                r.service_description ?? "",
                r.service_category ?? "",
                r.labor_quantity,
                String(r.labor_amount),
                r.commission_type,
                String(r.commission_value),
                String(
                    r.commission_amount
                ),
                r.payment_status,
            ]
        );

        const csv = [head, ...body]
            .map((a) =>
                a
                    .map(
                        (v) =>
                            `"${String(v).replace(
                                /"/g,
                                '""'
                            )}"`
                    )
                    .join(",")
            )
            .join("\n");

        const blob = new Blob(
            ["\ufeff" + csv],
            {
                type: "text/csv;charset=utf-8;",
            }
        );

        const url =
            URL.createObjectURL(blob);

        const a =
            document.createElement("a");

        a.href = url;
        a.download = `comisiones-${start}-${end}.csv`;

        a.click();

        URL.revokeObjectURL(url);
    }

    function printLiquidation() {
        if (!mechanic) {
            alert(
            "Seleccione un mecánico para generar su liquidación."
            );
            return;
        }

        const params = new URLSearchParams({
            start,
            end,
            mechanic,
        });

        window.open(
            `/mecanicos/comisiones/impresion?${params.toString()}`,
            "_blank",
            "noopener,noreferrer"
        );
        }

    return (
        <>
            <div className="section-head">
                <div>
                    <div className="eyebrow">
                        Mecánicos
                    </div>

                    <h1 className="page-title">
                        Reporte de comisiones
                    </h1>

                    <p className="page-subtitle">
                        La comisión se calcula
                        exclusivamente sobre mano de
                        obra, nunca sobre repuestos.
                    </p>
                    {periodName && (
                        <div className="muted" style={{ marginTop: 8 }}>
                            Periodo seleccionado automáticamente: {periodName}.
                        </div>
                    )}
                </div>

                <div
                    style={{
                        display: "flex",
                        gap: 8,
                    }}
                >
                    <Link
                        href="/mecanicos/comisiones/historial"
                        className="btn btn-ghost"
                    >
                        Historial
                    </Link>

                    <Link
                        href="/mecanicos"
                        className="btn btn-ghost"
                    >
                        Volver a mecánicos
                    </Link>
                </div>
            </div>

            <div
                className="card"
                style={{ marginBottom: 16 }}
            >
                <div className="form-grid">
                    <div className="field">
                        <label>Desde</label>

                        <input
                            type="date"
                            value={start}
                            onChange={(e) =>
                                setStart(
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="field">
                        <label>Hasta</label>

                        <input
                            type="date"
                            value={end}
                            onChange={(e) =>
                                setEnd(
                                    e.target.value
                                )
                            }
                        />
                    </div>

                    <div className="field">
                        <label>Mecánico</label>

                        <select
                            value={mechanic}
                            onChange={(e) =>
                                setMechanic(
                                    e.target.value
                                )
                            }
                        >
                            <option value="">
                                Todos
                            </option>

                            {mechanics.map((m) => (
                                <option
                                    key={m.id}
                                    value={m.id}
                                >
                                    {m.full_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="field">
                        <label>Sucursal</label>

                        <select
                            value={branch}
                            onChange={(e) =>
                                setBranch(
                                    e.target.value
                                )
                            }
                        >
                            <option value="">
                                Todas
                            </option>

                            {branches.map((b) => (
                                <option
                                    key={b.id}
                                    value={b.id}
                                >
                                    {b.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="field">
                        <label>
                            Orden de trabajo
                        </label>

                        <input
                            value={orderFilter}
                            onChange={(e) =>
                                setOrderFilter(
                                    e.target.value
                                )
                            }
                            placeholder="OT-..."
                        />
                    </div>

                    <div className="field">
                        <label>Servicio</label>

                        <input
                            value={serviceFilter}
                            onChange={(e) =>
                                setServiceFilter(
                                    e.target.value
                                )
                            }
                            placeholder="Buscar servicio"
                        />
                    </div>

                    <div className="field">
                        <label>
                            Estado de pago
                        </label>

                        <select
                            value={payment}
                            onChange={(e) =>
                                setPayment(
                                    e.target.value
                                )
                            }
                        >
                            <option value="">
                                Todos
                            </option>

                            <option value="paid">
                                Pagado
                            </option>

                            <option value="pending">
                                Pendiente
                            </option>

                            <option value="partial">
                                Parcial
                            </option>

                            <option value="overdue">
                                Vencido
                            </option>
                        </select>
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 12,
                    }}
                >
                    <button
                        className="btn btn-primary"
                        onClick={run}
                    >
                        Actualizar
                    </button>

                    <button
                        className="btn btn-ghost"
                        onClick={exportCsv}
                        disabled={
                            !filteredRows.length
                        }
                    >
                        Exportar CSV
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={printLiquidation}
                        disabled={!mechanic || !filteredRows.length}
                        >
                        🖨️ Generar liquidación
                        </button>
                </div>
            </div>

            {error && (
                <div className="notice error">
                    {error}
                </div>
            )}

            <div
                className="grid grid-2"
                style={{ marginBottom: 16 }}
            >
                <div className="card">
                    <span className="muted">
                        Mano de obra
                    </span>

                    <h2>
                        {money(totals.labor)}
                    </h2>
                </div>

                <div className="card">
                    <span className="muted">
                        Comisiones
                    </span>

                    <h2>
                        {money(
                            totals.commission
                        )}
                    </h2>
                </div>
            </div>

            <div className="card">
                <div className="section-head">
                    <h2>Detalle</h2>

                    <span className="muted">
                        {filteredRows.length} líneas
                    </span>
                </div>

                <div
                    style={{
                        overflowX: "auto",
                    }}
                >
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Orden</th>
                                <th>Fecha</th>
                                <th>Mecánico</th>
                                <th>Sucursal</th>
                                <th>Servicio</th>
                                <th>Mano de obra</th>
                                <th>Comisión</th>
                                <th>Pago</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredRows.map(
                                (r, i) => (
                                    <tr
                                        key={`${r.service_order_id}-${i}`}
                                    >
                                        <td>
                                            {
                                                r.order_number
                                            }
                                        </td>

                                        <td>
                                            {
                                                r.service_date
                                            }
                                        </td>

                                        <td>
                                            {
                                                r.mechanic_name
                                            }
                                        </td>

                                        <td>
                                            {r.branch_name ||
                                                "-"}
                                        </td>

                                        <td>
                                            <strong>
                                                {r.service_description ||
                                                    "Mano de obra"}
                                            </strong>

                                            <div className="muted">
                                                {
                                                    r.service_category ||
                                                    ""
                                                }
                                            </div>
                                        </td>

                                        <td>
                                            {money(
                                                Number(
                                                    r.labor_amount
                                                )
                                            )}
                                        </td>

                                        <td>
                                            {money(
                                                Number(
                                                    r.commission_amount
                                                )
                                            )}

                                            <div className="muted">
                                                {r.commission_type ===
                                                "percentage"
                                                    ? `${r.commission_value}%`
                                                    : `${money(
                                                          Number(
                                                              r.commission_value
                                                          )
                                                      )} / unidad`}
                                            </div>
                                        </td>

                                        <td>
                                            {
                                                r.payment_status
                                            }
                                        </td>
                                    </tr>
                                )
                            )}
                        </tbody>
                    </table>

                    {loading && (
                        <div className="empty">
                            Cargando...
                        </div>
                    )}

                    {!loading &&
                        !filteredRows.length && (
                            <div className="empty">
                                No hay comisiones para
                                los filtros
                                seleccionados.
                            </div>
                        )}
                </div>
            </div>
        </>
    );
}