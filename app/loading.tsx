export default function Loading() {
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
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          textAlign: "center",
        }}
      >
        <div
          className="tallerpro-spinner"
          aria-label="Cargando"
        />

        <strong
          style={{
            display: "block",
            fontSize: 17,
            color: "#111318",
          }}
        >
          TallerPro
        </strong>

        <span
          style={{
            display: "block",
            marginTop: 6,
            color: "#6b7280",
            fontSize: 13,
          }}
        >
          Cargando módulo...
        </span>
      </div>
    </main>
  );
}