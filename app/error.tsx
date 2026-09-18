"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("TallerPro error:", error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#f6f8f8",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 560,
          background: "#ffffff",
          border: "1px solid #e1e6e5",
          borderRadius: 16,
          padding: 28,
          boxShadow: "0 12px 40px rgba(17,19,24,0.08)",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            display: "grid",
            placeItems: "center",
            borderRadius: 12,
            background: "#fff0f0",
            color: "#a52222",
            fontWeight: 800,
            fontSize: 22,
            marginBottom: 16,
          }}
        >
          !
        </div>

        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            color: "#808987",
            marginBottom: 7,
          }}
        >
          TallerPro
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 24,
            color: "#111318",
          }}
        >
          Ocurrió un error inesperado
        </h1>

        <p
          style={{
            marginTop: 10,
            color: "#6b7280",
            lineHeight: 1.6,
          }}
        >
          No fue posible completar esta operación. Puedes intentar nuevamente
          o regresar al tablero principal.
        </p>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 22,
          }}
        >
          <button
            type="button"
            onClick={() => reset()}
            style={{
              border: 0,
              borderRadius: 9,
              padding: "11px 16px",
              background: "#111318",
              color: "#ffffff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Intentar nuevamente
          </button>

          <Link
            href="/dashboard"
            style={{
              borderRadius: 9,
              padding: "11px 16px",
              background: "#edf1f1",
              color: "#111318",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Ir al dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}