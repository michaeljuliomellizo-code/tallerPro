"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/utils";

const METHODS = [
  ["cash", "Efectivo"],
  ["transfer", "Transferencia"],
  ["card", "Tarjeta"],
  ["other", "Otro"],
] as const;

export default function InvoicePaymentPanel({
  invoiceId,
  total,
  paid,
  onSuccess,
}: {
  invoiceId: string;
  total: number;
  paid: number;
  onSuccess: () => Promise<void> | void;
}) {
  const supabase = createClient();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const balance = Math.max(0, total - paid);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      setError("El valor del abono debe ser mayor que cero.");
      return;
    }

    if (value > balance) {
      setError(`El abono no puede superar el saldo pendiente de ${money(balance)}.`);
      return;
    }

    try {
      setSaving(true);

      const { error: rpcError } = await supabase.rpc("register_invoice_payment", {
        p_invoice_id: invoiceId,
        p_amount: value,
        p_method: method,
        p_reference: reference.trim() || null,
      });

      if (rpcError) throw rpcError;

      setAmount("");
      setReference("");
      setMethod("cash");
      setMessage("Abono registrado correctamente.");
      await onSuccess();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible registrar el abono."
      );
    } finally {
      setSaving(false);
    }
  }

  if (balance <= 0) {
    return (
      <div className="card">
        <div className="section-head">
          <h2>Pagos</h2>
        </div>
        <div style={{ padding: 14, borderRadius: 8, background: "#e9f8f2", color: "#0c6b58", fontSize: 12 }}>
          <strong>Factura totalmente pagada.</strong>
          <div style={{ marginTop: 4 }}>No existe saldo pendiente.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="section-head">
        <div>
          <h2>Registrar abono</h2>
          <div className="muted">
            Saldo pendiente: <strong>{money(balance)}</strong>
          </div>
        </div>
        <Plus size={16} />
      </div>

      <form onSubmit={save}>
        <div className="form-grid">
          <div className="field">
            <label>Valor del abono *</label>
            <input
              required
              type="number"
              min="0.01"
              max={balance}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={saving}
            />
          </div>

          <div className="field">
            <label>Método *</label>
            <select value={method} onChange={(event) => setMethod(event.target.value)} disabled={saving}>
              {METHODS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Referencia</label>
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Comprobante o referencia..."
              disabled={saving}
            />
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "#fff0f0", color: "#a52222", fontSize: 12 }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "#e9f8f2", color: "#0c6b58", fontSize: 12 }}>
            {message}
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <button className="btn btn-primary" disabled={saving}>
            <Plus size={14} />
            {saving ? "Registrando..." : "Registrar abono"}
          </button>
        </div>
      </form>
    </div>
  );
}
