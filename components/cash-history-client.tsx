"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  LockKeyhole,
  WalletCards,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/client";

import {
  money,
} from "@/lib/utils";

type Movement = {
  id: string;
  movement_type: string;
  amount: number | string;
  description: string;
  payment_id: string | null;
  reference: string | null;
  created_at: string;
  payments:
    | {
        method: string;
      }
    | Array<{
        method: string;
      }>
    | null;
};

type Register = {
  id: string;
  opened_at: string;
  closed_at: string | null;
  opening_amount: number | string;
  expected_amount: number | string | null;
  counted_amount: number | string | null;
  difference: number | string | null;
  status: string;
};

const methodLabels: Record<
  string,
  string
> = {
  cash: "Efectivo",
  bank_transfer: "Transferencia",
  card: "Tarjeta",
  nequi: "Nequi",
  daviplata: "Daviplata",
  other: "Otro",
};

export default function CashHistoryClient({
  cashRegisterId,
  showAllRegisters = false,
  organizationId,
  refreshKey,
}: {
  cashRegisterId?: string;
  showAllRegisters?: boolean;
  organizationId?: string | null;
  refreshKey?: string | number;
}) {
  const supabase =
    createClient();

  const [rows, setRows] =
    useState<Movement[]>([]);

  const [registers, setRegisters] =
    useState<Register[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      if (
        showAllRegisters
      ) {
        let query =
          supabase
            .from("cash_registers")
            .select(
              "id,opened_at,closed_at,opening_amount,expected_amount,counted_amount,difference,status"
            )
            .order(
              "opened_at",
              {
                ascending: false,
              }
            );

        if (organizationId) {
          query = query.eq(
            "organization_id",
            organizationId
          );
        }

        const {
          data,
          error: queryError,
        } = await query;

        if (queryError) {
          throw queryError;
        }

        setRegisters(
          (data ?? []) as Register[]
        );

        return;
      }

      if (!cashRegisterId) {
        setRows([]);
        return;
      }

      const {
        data,
        error: queryError,
      } = await supabase
        .from("cash_movements")
        .select(
          `
          id,
          movement_type,
          amount,
          description,
          payment_id,
          reference,
          created_at,
          payments (
            method
          )
          `
        )
        .eq(
          "cash_register_id",
          cashRegisterId
        )
        .order("created_at", {
          ascending: false,
        });

      if (queryError) {
        throw queryError;
      }

      setRows(
        (data ?? []) as Movement[]
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar el historial."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [
    cashRegisterId,
    showAllRegisters,
    organizationId,
    refreshKey,
  ]);

  if (showAllRegisters) {
    return (
      <div className="card">
        <div className="section-head">
          <div>
            <h2>
              Historial de cajas
            </h2>

            <div
              className="muted"
              style={{
                fontSize: 11,
              }}
            >
              Todas las jornadas de caja
              registradas.
            </div>
          </div>

          <LockKeyhole size={16} />
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

        {loading ? (
          <div className="empty">
            Cargando historial...
          </div>
        ) : registers.length ===
          0 ? (
          <div
            className="empty"
            style={{
              padding: 30,
            }}
          >
            Aún no existen jornadas
            de caja.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>
                    Apertura
                  </th>

                  <th>
                    Cierre
                  </th>

                  <th>
                    Inicial
                  </th>

                  <th>
                    Esperado
                  </th>

                  <th>
                    Contado
                  </th>

                  <th>
                    Diferencia
                  </th>

                  <th>
                    Estado
                  </th>
                </tr>
              </thead>

              <tbody>
                {registers.map(
                  (register) => (
                    <tr
                      key={
                        register.id
                      }
                    >
                      <td>
                        {new Date(
                          register.opened_at
                        ).toLocaleString(
                          "es-CO"
                        )}
                      </td>

                      <td>
                        {register.closed_at
                          ? new Date(
                              register.closed_at
                            ).toLocaleString(
                              "es-CO"
                            )
                          : "—"}
                      </td>

                      <td>
                        {money(
                          Number(
                            register.opening_amount ??
                              0
                          )
                        )}
                      </td>

                      <td>
                        {register.expected_amount ===
                        null
                          ? "—"
                          : money(
                              Number(
                                register.expected_amount
                              )
                            )}
                      </td>

                      <td>
                        {register.counted_amount ===
                        null
                          ? "—"
                          : money(
                              Number(
                                register.counted_amount
                              )
                            )}
                      </td>

                      <td>
                        {register.difference ===
                        null ? (
                          "—"
                        ) : (
                          <strong
                            style={{
                              color:
                                Number(
                                  register.difference
                                ) <
                                0
                                  ? "#a52222"
                                  : "#0c6b58",
                            }}
                          >
                            {money(
                              Number(
                                register.difference
                              )
                            )}
                          </strong>
                        )}
                      </td>

                      <td>
                        <span
                          className={
                            register.status ===
                            "open"
                              ? "badge badge-green"
                              : "badge"
                          }
                        >
                          {register.status ===
                          "open"
                            ? "Abierta"
                            : "Cerrada"}
                        </span>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="section-head">
        <div>
          <h2>
            Movimientos de caja
          </h2>

          <div
            className="muted"
            style={{
              fontSize: 11,
            }}
          >
            Cobros, ingresos y egresos de
            la jornada actual.
          </div>
        </div>

        <WalletCards size={16} />
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

      {loading ? (
        <div className="empty">
          Cargando movimientos...
        </div>
      ) : rows.length === 0 ? (
        <div
          className="empty"
          style={{
            padding: 30,
          }}
        >
          No hay movimientos en
          esta caja.
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>
                  Fecha
                </th>

                <th>
                  Tipo
                </th>

                <th>
                  Descripción
                </th>

                <th>
                  Método
                </th>

                <th>
                  Origen
                </th>

                <th>
                  Valor
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map(
                (movement) => {
                  const isIncome =
                    movement.movement_type ===
                    "income";

                  const paymentData =
                    movement.payments;

                  const method =
                    Array.isArray(
                      paymentData
                    )
                      ? paymentData[0]
                          ?.method
                      : paymentData?.method;

                  return (
                    <tr
                      key={
                        movement.id
                      }
                    >
                      <td>
                        {new Date(
                          movement.created_at
                        ).toLocaleString(
                          "es-CO"
                        )}
                      </td>

                      <td>
                        <span
                          style={{
                            display:
                              "inline-flex",
                            alignItems:
                              "center",
                            gap: 5,
                          }}
                        >
                          {isIncome ? (
                            <ArrowUpCircle
                              size={14}
                              color="#0c6b58"
                            />
                          ) : (
                            <ArrowDownCircle
                              size={14}
                              color="#a52222"
                            />
                          )}

                          {isIncome
                            ? "Ingreso"
                            : "Egreso"}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {
                            movement.description
                          }
                        </strong>

                        {movement.reference && (
                          <div
                            className="muted"
                            style={{
                              fontSize: 10,
                            }}
                          >
                            Ref:{" "}
                            {
                              movement.reference
                            }
                          </div>
                        )}
                      </td>

                      <td>
                        {movement.payment_id
                          ? methodLabels[
                              method ??
                                "other"
                            ] ??
                            method
                          : "Efectivo"}
                      </td>

                      <td>
                        {movement.payment_id ? (
                          <span className="badge badge-green">
                            Pago factura
                          </span>
                        ) : (
                          <span className="badge">
                            Manual
                          </span>
                        )}
                      </td>

                      <td
                        style={{
                          color:
                            isIncome
                              ? "#0c6b58"
                              : "#a52222",
                        }}
                      >
                        <strong>
                          {isIncome
                            ? "+"
                            : "-"}
                          {money(
                            Number(
                              movement.amount
                            )
                          )}
                        </strong>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}