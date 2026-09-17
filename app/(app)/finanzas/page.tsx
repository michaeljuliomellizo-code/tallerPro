import Link from "next/link";
import {
  ArrowRight,
  FileText,
  WalletCards,
} from "lucide-react";

export default function FinanzasPage() {
  return (
    <>
      <div className="section-head">
        <div>
          <div className="eyebrow">
            Gestión financiera
          </div>

          <h1 className="page-title">
            Finanzas
          </h1>

          <p className="page-subtitle">
            Administra caja, facturación,
            pagos, ingresos, egresos y saldos
            pendientes.
          </p>
        </div>
      </div>

      <div className="grid grid-2">
        <Link
          href="/finanzas/caja"
          className="card"
          style={{
            textDecoration: "none",
            color: "inherit",
            cursor: "pointer",
          }}
        >
          <div
            className="section-head"
            style={{
              marginBottom: 12,
            }}
          >
            <div>
              <div
                className="eyebrow"
                style={{
                  color: "#0c6b58",
                }}
              >
                Operación diaria
              </div>

              <h2>
                Caja
              </h2>
            </div>

            <WalletCards size={20} />
          </div>

          <p
            className="muted"
            style={{
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            Apertura y cierre de caja,
            ingresos, egresos, pagos de
            facturas, arqueo y diferencia.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 14,
              fontSize: 12,
              color: "#0c6b58",
              fontWeight: 600,
            }}
          >
            Abrir caja
            <ArrowRight size={14} />
          </div>
        </Link>

        <Link
          href="/facturacion"
          className="card"
          style={{
            textDecoration: "none",
            color: "inherit",
            cursor: "pointer",
          }}
        >
          <div
            className="section-head"
            style={{
              marginBottom: 12,
            }}
          >
            <div>
              <div
                className="eyebrow"
                style={{
                  color: "#0c6b58",
                }}
              >
                Ingresos
              </div>

              <h2>
                Facturación y pagos
              </h2>
            </div>

            <FileText size={20} />
          </div>

          <p
            className="muted"
            style={{
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            Genera facturas desde las órdenes,
            registra abonos parciales y controla
            saldos pendientes.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 14,
              fontSize: 12,
              color: "#0c6b58",
              fontWeight: 600,
            }}
          >
            Ver facturación
            <ArrowRight size={14} />
          </div>
        </Link>
      </div>

      <div
        style={{
          height: 18,
        }}
      />

      <div className="card">
        <div className="section-head">
          <div>
            <h2>
              Flujo financiero
            </h2>

            <div
              className="muted"
              style={{
                fontSize: 11,
                marginTop: 3,
              }}
            >
              Relación entre órdenes,
              facturas, pagos y caja.
            </div>
          </div>
        </div>

        <div
          className="grid grid-3"
          style={{
            gap: 10,
          }}
        >
          <div
            className="alert"
            style={{
              cursor: "default",
            }}
          >
            <WalletCards size={17} />
            <div>
              <strong>
                Caja
              </strong>
              <small>
                Apertura, ingresos,
                egresos y cierre.
              </small>
            </div>
          </div>

          <div
            className="alert"
            style={{
              cursor: "default",
            }}
          >
            <FileText size={17} />
            <div>
              <strong>
                Facturación
              </strong>
              <small>
                Total, pagado y saldo.
              </small>
            </div>
          </div>

          <div
            className="alert"
            style={{
              cursor: "default",
            }}
          >
            <ArrowRight size={17} />
            <div>
              <strong>
                Pagos
              </strong>
              <small>
                Abonos parciales y
                movimientos de caja.
              </small>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}