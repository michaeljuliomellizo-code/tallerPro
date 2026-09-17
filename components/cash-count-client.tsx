"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/client";

import {
  money,
} from "@/lib/utils";

export default function CashCountClient({
  cashRegisterId,
  expectedAmount,
  onClose,
  onSuccess,
}: {
  cashRegisterId: string;
  expectedAmount: number;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}) {
  const supabase =
    createClient();

  const [counted, setCounted] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const countedValue =
    counted === ""
      ? null
      : Number(counted);

  const difference =
    countedValue === null
      ? null
      : countedValue -
        expectedAmount;

  async function closeCash(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setError("");

    if (
      countedValue === null ||
      !Number.isFinite(
        countedValue
      ) ||
      countedValue < 0
    ) {
      setError(
        "Ingresa un valor contado válido."
      );
      return;
    }

    try {
      setSaving(true);

      const {
        error: rpcError,
      } = await supabase.rpc(
        "close_cash_register",
        {
          p_cash_register_id:
            cashRegisterId,
          p_counted_amount:
            countedValue,
          p_notes:
            notes.trim() ||
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
          : "No fue posible cerrar la caja."
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
        onSubmit={closeCash}
      >
        <div className="section-head">
          <div>
            <div className="eyebrow">
              Arqueo
            </div>

            <h2>
              Arqueo y cierre
            </h2>

            <div
              className="muted"
              style={{
                fontSize: 11,
                marginTop: 3,
              }}
            >
              Se compara únicamente el
              efectivo físico esperado.
            </div>
          </div>

          <Calculator size={18} />
        </div>

        <div className="grid grid-3">
          <div>
            <span className="muted">
              Efectivo esperado
            </span>

            <strong
              style={{
                display: "block",
                fontSize: 18,
              }}
            >
              {money(
                expectedAmount
              )}
            </strong>
          </div>

          <div>
            <span className="muted">
              Efectivo contado
            </span>

            <strong
              style={{
                display: "block",
                fontSize: 18,
              }}
            >
              {countedValue ===
              null
                ? "—"
                : money(
                    countedValue
                  )}
            </strong>
          </div>

          <div>
            <span className="muted">
              Diferencia
            </span>

            <strong
              style={{
                display: "block",
                fontSize: 18,
                color:
                  difference ===
                  null
                    ? "#252b29"
                    : difference ===
                      0
                    ? "#0c6b58"
                    : difference >
                      0
                    ? "#0c6b58"
                    : "#a52222",
              }}
            >
              {difference ===
              null
                ? "—"
                : money(
                    difference
                  )}
            </strong>
          </div>
        </div>

        <div
          style={{
            height: 16,
          }}
        />

        <div className="field">
          <label>
            Efectivo contado *
          </label>

          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={counted}
            onChange={(event) =>
              setCounted(
                event.target.value
              )
            }
            autoFocus
          />
        </div>

        <div className="field">
          <label>
            Notas del arqueo
          </label>

          <textarea
            rows={3}
            value={notes}
            onChange={(event) =>
              setNotes(
                event.target.value
              )
            }
            placeholder="Ej. Diferencia por retiro de efectivo..."
          />
        </div>

        {error && (
          <div
            style={{
              marginTop: 10,
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
              ? "Cerrando..."
              : "Confirmar cierre"}
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
  width: "min(720px,100%)",
};