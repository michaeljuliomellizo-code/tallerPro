"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentOrganizationId } from "@/lib/motomil/organization";
import { money } from "@/lib/motomil/formatters";

export default function ReportsDashboard() {
    const s = createClient();

    const [d, setD] = useState({
        orders: 0,
        delivered: 0,
        revenue: 0,
        customers: 0,
        stockValue: 0,
    });

    useEffect(() => {
        (async () => {
            const o = await getCurrentOrganizationId();

            const [ord, c, inv] = await Promise.all([
                s
                    .from("service_orders")
                    .select("status,total")
                    .eq("organization_id", o),

                s
                    .from("customers")
                    .select("id", {
                        count: "exact",
                        head: true,
                    })
                    .eq("organization_id", o),

                s
                    .from("inventory_products")
                    .select("stock,cost")
                    .eq("organization_id", o)
                    .eq("active", true),
            ]);

            const orders = ord.data ?? [];

            setD({
                orders: orders.length,

                delivered: orders.filter(
                    (x) => x.status === "delivered"
                ).length,

                revenue: orders
                    .filter((x) => x.status === "delivered")
                    .reduce(
                        (a, x) => a + Number(x.total || 0),
                        0
                    ),

                customers: c.count ?? 0,

                stockValue: (inv.data ?? []).reduce(
                    (a, x) =>
                        a +
                        Number(x.stock || 0) *
                            Number(x.cost || 0),
                    0
                ),
            });
        })();
    }, []);

    return (
        <div className="grid grid-5">
            <div className="card">
                <div className="muted">Órdenes</div>

                <strong style={{ fontSize: 25 }}>
                    {d.orders}
                </strong>
            </div>

            <div className="card">
                <div className="muted">Entregadas</div>

                <strong style={{ fontSize: 25 }}>
                    {d.delivered}
                </strong>
            </div>

            <div className="card">
                <div className="muted">
                    Facturación órdenes
                </div>

                <strong style={{ fontSize: 25 }}>
                    {money(d.revenue)}
                </strong>
            </div>

            <div className="card">
                <div className="muted">Clientes</div>

                <strong style={{ fontSize: 25 }}>
                    {d.customers}
                </strong>
            </div>

            <div className="card">
                <div className="muted">
                    Valor inventario
                </div>

                <strong style={{ fontSize: 25 }}>
                    {money(d.stockValue)}
                </strong>
            </div>
        </div>
    );
}