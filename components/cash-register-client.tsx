"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calculator,
  LockKeyhole,
  RefreshCw,
  WalletCards,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

import {
  getCurrentOrganizationId,
} from "@/lib/motomil/organization";

import {
  money,
} from "@/lib/utils";

import CashMovementForm from "@/components/cash-movement-form";
import CashCountClient from "@/components/cash-count-client";
import CashHistoryClient from "@/components/cash-history-client";

type CashRegister = {
  id: string;
  organization_id: string;
  opened_by: string;
  opened_at: string;
  opening_amount: number | string;
  closed_at: string | null;
  closed_by: string | null;
  expected_amount: number | string | null;
  counted_amount: number | string | null;
  difference: number | string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type CashMovement = {
  id: string;
  movement_type: string;
  amount: number | string;
  payment_id: string | null;
  description: string;
  reference: string | null;
  created_at: string;
};

type Payment = {
  id: string;
  method: string;
};

type CashSummary = {
  cashIncome: number;
  digitalIncome: number;
  expense: number;
  expectedCash: number;
  totalIncome: number;
};

export default function CashRegisterClient() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [register, setRegister] =
    useState<CashRegister | null>(
      null
    );

  const [lastClosedRegister, setLastClosedRegister] =
    useState<CashRegister | null>(
      null
    );

  const [summary, setSummary] =
    useState<CashSummary>({
      cashIncome: 0,
      digitalIncome: 0,
      expense: 0,
      expectedCash: 0,
      totalIncome: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [openingAmount, setOpeningAmount] =
    useState("");

  const [openingNotes, setOpeningNotes] =
    useState("");

  const [showIncome, setShowIncome] =
    useState(false);

  const [showExpense, setShowExpense] =
    useState(false);

  const [showCount, setShowCount] =
    useState(false);

  async function loadCash() {
    try {
      setLoading(true);
      setError("");

      const organizationId =
        await getCurrentOrganizationId();

      const {
        data: registers,
        error: registersError,
      } = await supabase
        .from("cash_registers")
        .select("*")
        .eq(
          "organization_id",
          organizationId
        )
        .order("opened_at", {
          ascending: false,
        });

      if (registersError) {
        throw registersError;
      }

      const allRegisters =
        (registers ?? []) as CashRegister[];

      const openRegister =
        allRegisters.find(
          (row) =>
            row.status === "open"
        ) ?? null;

      const closedRegister =
        allRegisters.find(
          (row) =>
            row.status === "closed"
        ) ?? null;

      setRegister(
        openRegister
      );

      setLastClosedRegister(
        closedRegister
      );

      /*
       * No existe caja abierta.
       */
      if (!openRegister) {
        setSummary({
          cashIncome: 0,
          digitalIncome: 0,
          expense: 0,
          expectedCash: 0,
          totalIncome: 0,
        });

        return;
      }

      /*
       * Obtener movimientos de caja.
       *
       * No usamos relaciones anidadas de Supabase
       * para evitar problemas de inferencia TypeScript.
       */
      const {
        data: movementData,
        error: movementError,
      } = await supabase
        .from("cash_movements")
        .select(
          "id,movement_type,amount,payment_id,description,reference,created_at"
        )
        .eq(
          "cash_register_id",
          openRegister.id
        )
        .order("created_at", {
          ascending: false,
        });

      if (movementError) {
        throw movementError;
      }

      const movements =
        (movementData ??
          []) as CashMovement[];

      /*
       * IDs de pagos asociados.
       */
      const paymentIds =
        movements
          .map(
            (movement) =>
              movement.payment_id
          )
          .filter(
            (
              paymentId
            ): paymentId is string =>
              Boolean(paymentId)
          );

      let payments: Payment[] = [];

      if (
        paymentIds.length > 0
      ) {
        const {
          data: paymentData,
          error: paymentError,
        } = await supabase
          .from("payments")
          .select(
            "id,method"
          )
          .in(
            "id",
            paymentIds
          );

        if (paymentError) {
          throw paymentError;
        }

        payments =
          (paymentData ??
            []) as Payment[];
      }

      const paymentMap =
        new Map<string, string>();

      for (const payment of payments) {
        paymentMap.set(
          payment.id,
          payment.method
        );
      }

      let cashIncome = 0;
      let digitalIncome = 0;
      let expense = 0;

      for (const movement of movements) {
        const amount = Number(
          movement.amount ?? 0
        );

        /*
         * Egresos:
         * por ahora todos son efectivo,
         * ya que el formulario manual
         * registra salidas de caja.
         */
        if (
          movement.movement_type ===
          "expense"
        ) {
          expense += amount;
          continue;
        }

        if (
          movement.movement_type !==
          "income"
        ) {
          continue;
        }

        /*
         * Ingreso manual:
         * se considera efectivo.
         */
        if (!movement.payment_id) {
          cashIncome += amount;
          continue;
        }

        /*
         * Pago de factura.
         */
        const method =
          paymentMap.get(
            movement.payment_id
          );

        if (
          method === "cash"
        ) {
          cashIncome += amount;
        } else {
          digitalIncome += amount;
        }
      }

      const opening =
        Number(
          openRegister.opening_amount ??
            0
        );

      const expectedCash =
        opening +
        cashIncome -
        expense;

      const totalIncome =
        cashIncome +
        digitalIncome;

      setSummary({
        cashIncome,
        digitalIncome,
        expense,
        expectedCash,
        totalIncome,
      });
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar la caja."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCash();
  }, []);

  async function openRegister(
    amountOverride?: number
  ) {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      const amount =
        typeof amountOverride ===
        "number"
          ? amountOverride
          : Number(openingAmount);

      if (
        !Number.isFinite(amount) ||
        amount < 0
      ) {
        throw new Error(
          "El saldo inicial debe ser mayor o igual a cero."
        );
      }

      const organizationId =
        await getCurrentOrganizationId();

      const {
        error: rpcError,
      } = await supabase.rpc(
        "open_cash_register",
        {
          p_organization_id:
            organizationId,
          p_opening_amount:
            amount,
          p_notes:
            openingNotes.trim() ||
            null,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setOpeningAmount("");
      setOpeningNotes("");

      setMessage(
        "Nueva caja abierta correctamente."
      );

      await loadCash();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible abrir la caja."
      );
    } finally {
      setSaving(false);
    }
  }

  async function syncPayments() {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (
        !register ||
        register.status !==
          "open"
      ) {
        throw new Error(
          "Primero debes abrir una caja."
        );
      }

      const organizationId =
        await getCurrentOrganizationId();

      const {
        data,
        error: rpcError,
      } = await supabase.rpc(
        "sync_payments_to_open_cash",
        {
          p_organization_id:
            organizationId,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setMessage(
        `Pagos pendientes integrados: ${Number(
          data ?? 0
        )}.`
      );

      await loadCash();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible integrar los pagos."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleMovementSuccess() {
    setShowIncome(false);
    setShowExpense(false);

    setMessage(
      "Movimiento registrado correctamente."
    );

    await loadCash();
  }

  async function handleCloseSuccess() {
    setShowCount(false);

    setMessage(
      "Caja cerrada correctamente."
    );

    await loadCash();
  }

  if (loading) {
    return (
      <div className="card">
        <div
          style={{
            padding: 30,
            textAlign: "center",
          }}
        >
          Cargando caja...
        </div>
      </div>
    );
  }

  /*
   * ==========================================================
   * NO HAY CAJA ABIERTA
   * ==========================================================
   */

  if (!register) {
    const suggestedOpening =
      lastClosedRegister?.counted_amount !=
      null
        ? Number(
            lastClosedRegister.counted_amount
          )
        : null;

    return (
      <>
        <div className="section-head">
          <div>
            <div className="eyebrow">
              Finanzas
            </div>

            <h1 className="page-title">
              Caja
            </h1>

            <p className="page-subtitle">
              La jornada actual está
              cerrada. Abre una nueva
              caja para comenzar las
              operaciones del día.
            </p>
          </div>

          <button
            className="btn btn-ghost"
            onClick={() => {
              void loadCash();
            }}
            disabled={saving}
          >
            <RefreshCw size={14} />
            Actualizar
          </button>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 12,
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

        {message && (
          <div
            style={{
              marginBottom: 12,
              padding: 10,
              borderRadius: 8,
              background: "#e9f8f2",
              color: "#0c6b58",
              fontSize: 12,
            }}
          >
            {message}
          </div>
        )}

        {lastClosedRegister && (
          <div
            className="card"
            style={{
              marginBottom: 16,
            }}
          >
            <div className="section-head">
              <div>
                <h2>
                  Última caja cerrada
                </h2>

                <div
                  className="muted"
                  style={{
                    fontSize: 11,
                  }}
                >
                  Cerrada:{" "}
                  {lastClosedRegister.closed_at
                    ? new Date(
                        lastClosedRegister.closed_at
                      ).toLocaleString(
                        "es-CO"
                      )
                    : "—"}
                </div>
              </div>

              <LockKeyhole size={17} />
            </div>

            <div className="grid grid-3">
              <div>
                <span className="muted">
                  Esperado
                </span>

                <strong
                  style={{
                    display: "block",
                  }}
                >
                  {money(
                    Number(
                      lastClosedRegister.expected_amount ??
                        0
                    )
                  )}
                </strong>
              </div>

              <div>
                <span className="muted">
                  Contado
                </span>

                <strong
                  style={{
                    display: "block",
                  }}
                >
                  {money(
                    Number(
                      lastClosedRegister.counted_amount ??
                        0
                    )
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
                    color:
                      Number(
                        lastClosedRegister.difference ??
                          0
                      ) < 0
                        ? "#a52222"
                        : "#0c6b58",
                  }}
                >
                  {money(
                    Number(
                      lastClosedRegister.difference ??
                        0
                    )
                  )}
                </strong>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="section-head">
            <div>
              <h2>
                Abrir nueva caja
              </h2>

              <div
                className="muted"
                style={{
                  fontSize: 11,
                }}
              >
                Cada jornada debe tener
                su propia caja.
              </div>
            </div>

            <WalletCards size={17} />
          </div>

          <div className="form-grid">
            <div className="field">
              <label>
                Saldo inicial *
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  openingAmount
                }
                onChange={(event) =>
                  setOpeningAmount(
                    event.target
                      .value
                  )
                }
                placeholder={
                  suggestedOpening !==
                  null
                    ? String(
                        suggestedOpening
                      )
                    : "0"
                }
              />

              {suggestedOpening !==
                null && (
                <div
                  className="muted"
                  style={{
                    fontSize: 10,
                    marginTop: 4,
                  }}
                >
                  Saldo sugerido según
                  el efectivo contado
                  del cierre anterior:
                  {" "}
                  <strong>
                    {money(
                      suggestedOpening
                    )}
                  </strong>
                </div>
              )}
            </div>

            <div className="field">
              <label>
                Notas
              </label>

              <input
                value={openingNotes}
                onChange={(event) =>
                  setOpeningNotes(
                    event.target
                      .value
                  )
                }
                placeholder="Ej. Apertura turno mañana"
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {suggestedOpening !==
              null && (
              <button
                className="btn btn-ghost"
                onClick={() => {
                  void openRegister(
                    suggestedOpening
                  );
                }}
                disabled={saving}
              >
                <WalletCards
                  size={14}
                />
                Usar saldo sugerido
              </button>
            )}

            <button
              className="btn btn-primary"
              onClick={() => {
                void openRegister();
              }}
              disabled={saving}
            >
              <WalletCards size={14} />

              {saving
                ? "Abriendo..."
                : "Abrir nueva caja"}
            </button>
          </div>
        </div>

        <div
          style={{
            height: 16,
          }}
        />

        <CashHistoryClient
          showAllRegisters
          organizationId={
            null
          }
          refreshKey={
            lastClosedRegister?.id ??
            "none"
          }
        />
      </>
    );
  }

  /*
   * ==========================================================
   * CAJA ABIERTA
   * ==========================================================
   */

  return (
    <>
      <div className="section-head">
        <div>
          <div className="eyebrow">
            Finanzas
          </div>

          <h1 className="page-title">
            Caja
          </h1>

          <p className="page-subtitle">
            Jornada actual de caja y
            movimientos financieros.
          </p>
        </div>

        <button
          className="btn btn-ghost"
          onClick={() => {
            void loadCash();
          }}
          disabled={saving}
        >
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 12,
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

      {message && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 8,
            background: "#e9f8f2",
            color: "#0c6b58",
            fontSize: 12,
          }}
        >
          {message}
        </div>
      )}

      <div className="grid grid-4">
        <div className="card">
          <div className="muted">
            Saldo inicial
          </div>

          <strong
            style={{
              fontSize: 22,
            }}
          >
            {money(
              Number(
                register.opening_amount
              )
            )}
          </strong>
        </div>

        <div className="card">
          <div className="muted">
            Efectivo recibido
          </div>

          <strong
            style={{
              fontSize: 22,
              color: "#0c6b58",
            }}
          >
            {money(
              summary.cashIncome
            )}
          </strong>
        </div>

        <div className="card">
          <div className="muted">
            Cobros electrónicos
          </div>

          <strong
            style={{
              fontSize: 22,
            }}
          >
            {money(
              summary.digitalIncome
            )}
          </strong>
        </div>

        <div className="card">
          <div className="muted">
            Efectivo esperado
          </div>

          <strong
            style={{
              fontSize: 22,
            }}
          >
            {money(
              summary.expectedCash
            )}
          </strong>
        </div>
      </div>

      <div
        style={{
          height: 10,
        }}
      />

      <div
        className="muted"
        style={{
          fontSize: 11,
          marginBottom: 16,
        }}
      >
        Cobros totales:
        {" "}
        <strong>
          {money(
            summary.totalIncome
          )}
        </strong>

        {" · "}

        Egresos:
        {" "}
        <strong>
          {money(
            summary.expense
          )}
        </strong>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>
              Caja abierta
            </h2>

            <div
              className="muted"
              style={{
                fontSize: 11,
              }}
            >
              Apertura:{" "}
              {new Date(
                register.opened_at
              ).toLocaleString(
                "es-CO"
              )}
            </div>
          </div>

          <span className="badge badge-green">
            <WalletCards
              size={12}
              style={{
                marginRight: 4,
                verticalAlign:
                  "middle",
              }}
            />
            Abierta
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn btn-primary"
            onClick={() =>
              setShowIncome(true)
            }
          >
            <ArrowUpCircle
              size={14}
            />
            Registrar ingreso
          </button>

          <button
            className="btn btn-ghost"
            onClick={() =>
              setShowExpense(true)
            }
          >
            <ArrowDownCircle
              size={14}
            />
            Registrar egreso
          </button>

          <button
            className="btn btn-ghost"
            onClick={syncPayments}
            disabled={saving}
          >
            <RefreshCw size={14} />
            Integrar pagos pendientes
          </button>

          <button
            className="btn btn-ghost"
            onClick={() =>
              setShowCount(true)
            }
            disabled={saving}
          >
            <Calculator
              size={14}
            />
            Arqueo y cierre
          </button>
        </div>
      </div>

      <div
        style={{
          height: 16,
        }}
      />

      <CashHistoryClient
        cashRegisterId={
          register.id
        }
        showAllRegisters={false}
        refreshKey={`${register.id}-${summary.cashIncome}-${summary.digitalIncome}-${summary.expense}`}
      />

      {showIncome && (
        <CashMovementForm
          cashRegisterId={
            register.id
          }
          type="income"
          onClose={() =>
            setShowIncome(false)
          }
          onSuccess={
            handleMovementSuccess
          }
        />
      )}

      {showExpense && (
        <CashMovementForm
          cashRegisterId={
            register.id
          }
          type="expense"
          onClose={() =>
            setShowExpense(false)
          }
          onSuccess={
            handleMovementSuccess
          }
        />
      )}

      {showCount && (
        <CashCountClient
          cashRegisterId={
            register.id
          }
          expectedAmount={
            summary.expectedCash
          }
          onClose={() =>
            setShowCount(false)
          }
          onSuccess={
            handleCloseSuccess
          }
        />
      )}
    </>
  );
}