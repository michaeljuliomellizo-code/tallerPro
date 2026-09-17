"use client";

function dateKeyLocal(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function daysUntil(value: string) {
  const today = parseDateOnly(dateKeyLocal());
  const due = parseDateOnly(value);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function formatDate(value: string) {
  return parseDateOnly(value).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function getTecnomecanicaState(dueDate: string | null) {
  if (!dueDate) {
    return { days: null, label: "Sin fecha registrada", tone: "neutral" as const };
  }

  const days = daysUntil(dueDate);

  if (days < 0) {
    return { days, label: `Vencida hace ${Math.abs(days)} día(s)`, tone: "danger" as const };
  }

  if (days === 0) {
    return { days, label: "Vence hoy", tone: "danger" as const };
  }

  if (days <= 14) {
    return { days, label: `Vence en ${days} día(s)`, tone: "warning" as const };
  }

  return { days, label: `Vigente · ${days} día(s) restantes`, tone: "success" as const };
}

export default function TecnomecanicaAlert({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) {
    return (
      <div
        style={{
          padding: "10px 12px",
          borderRadius: 8,
          background: "#f5f7f7",
          border: "1px solid #e5e9e8",
          color: "#606a67",
          fontSize: 12,
        }}
      >
        <strong>Tecnomecánica:</strong> sin fecha registrada.
      </div>
    );
  }

  const state = getTecnomecanicaState(dueDate);
  const styles = {
    danger: {
      background: "#fff0f0",
      border: "1px solid #f2b8b8",
      color: "#a52222",
    },
    warning: {
      background: "#fff8e7",
      border: "1px solid #eed18a",
      color: "#805f00",
    },
    success: {
      background: "#e9f8f2",
      border: "1px solid #b7e4d3",
      color: "#146c50",
    },
    neutral: {
      background: "#f5f7f7",
      border: "1px solid #e5e9e8",
      color: "#606a67",
    },
  } as const;

  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        background: styles[state.tone].background,
        border: styles[state.tone].border,
        color: styles[state.tone].color,
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 700 }}>{state.label}</div>
      <div style={{ marginTop: 3 }}>Fecha: {formatDate(dueDate)}</div>
      {state.days !== null && state.days >= 1 && state.days <= 14 && (
        <div style={{ marginTop: 4 }}>
          ⚠️ Recordatorio activo: faltan {state.days} día(s) para el vencimiento.
        </div>
      )}
      {state.days === 0 && (
        <div style={{ marginTop: 4 }}>⚠️ La tecnomecánica vence hoy.</div>
      )}
      {state.days !== null && state.days < 0 && (
        <div style={{ marginTop: 4 }}>🔴 Se recomienda contactar al cliente.</div>
      )}
    </div>
  );
}
