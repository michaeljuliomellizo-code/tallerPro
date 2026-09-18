import Link from "next/link";

export default function NotFound() {
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
          maxWidth: 520,
          textAlign: "center",
          background: "#ffffff",
          border: "1px solid #e1e6e5",
          borderRadius: 16,
          padding: 32,
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            lineHeight: 1,
            color: "#ed1743",
          }}
        >
          404
        </div>

        <h1
          style={{
            marginTop: 14,
            marginBottom: 8,
            fontSize: 24,
            color: "#111318",
          }}
        >
          Página no encontrada
        </h1>

        <p
          style={{
            margin: 0,
            color: "#6b7280",
            lineHeight: 1.6,
          }}
        >
          La ruta que intentas consultar no existe o ya no está disponible.
        </p>

        <Link
          href="/dashboard"
          style={{
            display: "inline-block",
            marginTop: 22,
            padding: "11px 18px",
            borderRadius: 9,
            background: "#111318",
            color: "#ffffff",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Volver al dashboard
        </Link>
      </section>
    </main>
  );
}