"use client";

import {
    FormEvent,
    useEffect,
    useState,
} from "react";

import Link from "next/link";

import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const defaults = [
    {
        key: "default_commission_percentage",
        label: "Comisión general sugerida (%)",
        value: "40",
        type: "number",
    },
    {
        key: "default_tax_rate",
        label: "Impuesto predeterminado (%)",
        value: "19",
        type: "number",
    },
    {
        key: "default_appointment_minutes",
        label: "Duración predeterminada de cita (minutos)",
        value: "60",
        type: "number",
    },
    {
        key: "currency",
        label: "Moneda",
        value: "COP",
        type: "text",
    },
];

export default function GeneralParametersClient() {
    const [orgId, setOrgId] = useState("");
    const [values, setValues] =
        useState<Record<string, string>>({});

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        (async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setError("No hay sesión activa.");
                setLoading(false);
                return;
            }

            const { data: m } = await supabase
                .from("organization_members")
                .select("organization_id")
                .eq("user_id", user.id)
                .maybeSingle();

            if (!m) {
                setError("No hay organización asignada.");
                setLoading(false);
                return;
            }

            setOrgId(m.organization_id);

            const {
                data,
                error,
            } = await supabase
                .from("organization_parameters")
                .select(
                    "parameter_key,parameter_value"
                )
                .eq(
                    "organization_id",
                    m.organization_id
                );

            if (error) {
                setError(error.message);
            }

            const v: Record<string, string> = {};

            for (const d of defaults) {
                v[d.key] = d.value;
            }

            for (const x of data ?? []) {
                v[x.parameter_key] =
                    x.parameter_value ?? "";
            }

            setValues(v);
            setLoading(false);
        })();
    }, []);

    async function save(e: FormEvent) {
        e.preventDefault();

        setSaving(true);
        setMessage("");
        setError("");

        const rows = defaults.map((d) => ({
            organization_id: orgId,
            parameter_key: d.key,
            parameter_value:
                values[d.key] ?? d.value,
        }));

        const { error: e2 } = await supabase
            .from("organization_parameters")
            .upsert(rows, {
                onConflict:
                    "organization_id,parameter_key",
            });

        if (e2) {
            setError(e2.message);
        } else {
            setMessage(
                "Parámetros guardados correctamente."
            );
        }

        setSaving(false);
    }

    if (loading) {
        return (
            <div className="card">
                Cargando parámetros...
            </div>
        );
    }

    return (
        <>
            <Link
                href="/configuracion"
                className="btn btn-ghost"
            >
                ← Configuración
            </Link>

            <div style={{ height: 12 }} />

            <div className="section-head">
                <div>
                    <div className="eyebrow">
                        Configuración
                    </div>

                    <h1 className="page-title">
                        Parámetros generales
                    </h1>

                    <p className="page-subtitle">
                        Valores predeterminados del taller
                        para apoyar la operación.
                    </p>
                </div>
            </div>

            {message && (
                <div
                    className="card"
                    style={{ marginBottom: 12 }}
                >
                    {message}
                </div>
            )}

            {error && (
                <div
                    className="card"
                    style={{
                        marginBottom: 12,
                        color: "#a52222",
                    }}
                >
                    {error}
                </div>
            )}

            <form
                onSubmit={save}
                className="card"
            >
                <div className="form-grid">
                    {defaults.map((d) => (
                        <div
                            className="field"
                            key={d.key}
                        >
                            <label>{d.label}</label>

                            <input
                                type={d.type}
                                value={
                                    values[d.key] ??
                                    d.value
                                }
                                onChange={(e) =>
                                    setValues((v) => ({
                                        ...v,
                                        [d.key]:
                                            e.target.value,
                                    }))
                                }
                                min={
                                    d.type === "number"
                                        ? 0
                                        : undefined
                                }
                            />
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: 14 }}>
                    <button
                        className="btn btn-primary"
                        disabled={saving}
                    >
                        {saving
                            ? "Guardando..."
                            : "Guardar parámetros"}
                    </button>
                </div>
            </form>
        </>
    );
}