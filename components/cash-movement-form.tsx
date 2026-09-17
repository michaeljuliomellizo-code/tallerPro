"use client";

import { useState } from "react";

import {
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/client";

export default function CashMovementForm({
  cashRegisterId,
  type,
  onClose,
  onSuccess,
}: {
  cashRegisterId: string;
  type: "income" | "expense";
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}) {
  const supabase =
    createClient();

  const [amount, setAmount] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [reference, setReference] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const isIncome =
    type === "income";

  async function save(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setError("");

    const value =
      Number(amount);

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      setError(
        "El valor debe ser mayor que cero."
      );
      return;
    }

    if (!description.trim()) {
      setError(
        "La descripción es obligatoria."
      );
      return;
    }

    try {
      setSaving(true);

      const {
        error: rpcError,
      } = await supabase.rpc(
        "add_cash_movement",
        {
          p_cash_register_id:
            cashRegisterId,
          p_movement_type:
            type,
          p_amount: value,
          p_description:
            description.trim(),
          p_reference:
            reference.trim() ||
            null,
          p_payment_id:
            null,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      await onSuccess();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible registrar el movimiento."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={backdrop}>
      <form
        className="card"
        style={modal}
        onSubmit={save}
      >
        <div className="section-head">
          <div>
            <div className="eyebrow">
              {isIncome
                ? "Ingreso"
                : "Egreso"}
            </div>

            <h2>
              {isIncome
                ? "Registrar ingreso"
                : "Registrar egreso"}
            </h2>
          </div>

          {isIncome ? (
            <ArrowUpCircle
              size={18}
            />
          ) : (
            <ArrowDownCircle
              size={18}
            />
          )}
        </div>

        <div className="form-grid">
          <div className="field">
            <label>
              Valor *
            </label>

            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) =>
                setAmount(
                  event.target.value
                )
              }
              autoFocus
            />
          </div>

          <div className="field">
            <label>
              Referencia
            </label>

            <input
              value={reference}
              onChange={(event) =>
                setReference(
                  event.target.value
                )
              }
              placeholder="Comprobante..."
            />
          </div>

          <div
            className="field"
            style={{
              gridColumn:
                "1 / -1",
            }}
          >
            <label>
              Descripción *
            </label>

            <textarea
              required
              rows={3}
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder={
                isIncome
                  ? "Ej. Venta de accesorio"
                  : "Ej. Compra de insumos"
              }
            />
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 8,
              background: "#fff0f0",
              color: "#a52222",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent:
              "flex-end",
            gap: 8,
            marginTop: 16,
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving
              ? "Guardando..."
              : isIncome
              ? "Guardar ingreso"
              : "Guardar egreso"}
          </button>
        </div>
      </form>
    </div>
  );
}

const backdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background:
    "rgba(0,0,0,.45)",
  display: "grid",
  placeItems: "center",
  zIndex: 50,
  padding: 18,
};

const modal: React.CSSProperties = {
  width: "min(680px,100%)",
};