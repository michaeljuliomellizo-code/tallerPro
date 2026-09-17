"use client";

import { money } from "@/lib/utils";

type DashboardKpisProps = {
  salesToday?: number;
  cashToday?: number;
  ordersOpen?: number;
  appointmentsToday?: number;
  lowStock?: number;
  pendingQuotes?: number;
};

export default function DashboardKpis({
  salesToday = 0,
  cashToday = 0,
  ordersOpen = 0,
  appointmentsToday = 0,
  lowStock = 0,
  pendingQuotes = 0,
}: DashboardKpisProps) {
  const items = [
    ["Ventas de hoy", money(salesToday)],
    ["Caja / ingresos", money(cashToday)],
    ["Órdenes abiertas", String(ordersOpen)],
    ["Citas de hoy", String(appointmentsToday)],
    ["Stock bajo", String(lowStock)],
    ["Cotizaciones pendientes", String(pendingQuotes)],
  ];

  return (
    <div className="grid grid-3">
      {items.map(([label, value]) => (
        <div className="card" key={label}>
          <div className="muted">{label}</div>
          <strong style={{ fontSize: 24 }}>{value}</strong>
        </div>
      ))}
    </div>
  );
}