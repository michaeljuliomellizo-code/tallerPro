"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export default function PortalLogin() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Correo y contraseña son obligatorios.");
      return;
    }

    try {
      setSaving(true);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) throw signInError;

      window.location.href = "/portal";
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible iniciar sesión."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "min(460px, 100%)" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div className="eyebrow">MotoMil</div>
          <h1 className="page-title" style={{ marginBottom: 6 }}>
            Portal del cliente
          </h1>
          <p className="page-subtitle">
            Accede para consultar tus motocicletas, citas, servicios y documentos.
          </p>
        </div>

        <form className="card" onSubmit={submit}>
          <div className="section-head" style={{ marginBottom: 18 }}>
            <div>
              <h2>Iniciar sesión</h2>
              <div className="muted">
                Usa las credenciales entregadas por el taller.
              </div>
            </div>
            <ShieldCheck size={20} />
          </div>

          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                borderRadius: 8,
                border: "1px solid #f2b8b8",
                background: "#fff5f5",
                color: "#9b1c1c",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <div className="form-grid">
            <div className="field">
              <label htmlFor="portal-email">Correo electrónico</label>
              <input
                id="portal-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="cliente@correo.com"
              />
            </div>

            <div className="field">
              <label htmlFor="portal-password">Contraseña</label>
              <input
                id="portal-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 18,
            }}
          >
            <button
              className="btn btn-primary"
              type="submit"
              disabled={saving}
              style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
            >
              <ArrowRight size={15} />
              {saving ? "Ingresando..." : "Ingresar"}
            </button>
          </div>
        </form>

        <div
          className="muted"
          style={{ textAlign: "center", marginTop: 12, fontSize: 12 }}
        >
          El acceso al portal está separado de la administración interna de MotoMil.
        </div>
      </div>
    </main>
  );
}
