"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Trash2, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/utils";

type Mechanic = {
  id: string;
  full_name: string;
};

type LaborItem = {
  id: string;
  mechanic_id: string | null;
  description: string;
  quantity: number | string;
  unit_price: number | string;
  created_at: string;
};

function num(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
}

export default function ServiceOrderLaborClient({
  serviceOrderId,
  orderStatus,
  defaultMechanicId,
  onChanged,
}: {
  serviceOrderId: string;
  orderStatus?: string;
  defaultMechanicId?: string | null;
  onChanged?: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [items, setItems] = useState<LaborItem[]>([]);
  const [mechanicId, setMechanicId] = useState(defaultMechanicId ?? "");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const locked = orderStatus === "cancelled" || orderStatus === "delivered";

  const selectedMechanic = mechanics.find((item) => item.id === mechanicId) ?? null;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [mechanicsResult, itemsResult] = await Promise.all([
        supabase
          .from("mechanics")
          .select("id, full_name")
          .eq("active", true)
          .order("full_name"),
        supabase
          .from("service_order_items")
          .select("id, mechanic_id, description, quantity, unit_price, created_at")
          .eq("service_order_id", serviceOrderId)
          .in("item_type", ["service", "labor"])
          .order("created_at", { ascending: false }),
      ]);

      if (mechanicsResult.error) throw mechanicsResult.error;
      if (itemsResult.error) throw itemsResult.error;

      const loadedMechanics = (mechanicsResult.data ?? []) as Mechanic[];
      setMechanics(loadedMechanics);
      setItems((itemsResult.data ?? []) as LaborItem[]);

      setMechanicId((current) => {
        if (current && loadedMechanics.some((item) => item.id === current)) return current;
        if (defaultMechanicId && loadedMechanics.some((item) => item.id === defaultMechanicId)) {
          return defaultMechanicId;
        }
        return loadedMechanics[0]?.id ?? "";
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No fue posible cargar la mano de obra.");
    } finally {
      setLoading(false);
    }
  }, [defaultMechanicId, serviceOrderId, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalLabor = useMemo(
    () => items.reduce((total, item) => total + num(item.quantity) * num(item.unit_price), 0),
    [items],
  );

  async function addLabor() {
    setError("");
    setMessage("");

    if (locked) {
      setError("La orden está cerrada y no permite modificar la mano de obra.");
      return;
    }

    if (!mechanicId) {
      setError("Selecciona el mecánico responsable de la mano de obra.");
      return;
    }

    if (!description.trim()) {
      setError("La descripción del trabajo es obligatoria.");
      return;
    }

    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      setError("El valor de la mano de obra no es válido.");
      return;
    }

    const confirmed = window.confirm(
      `¿Confirmas agregar esta mano de obra por ${money(parsedValue)}?\n\nMecánico: ${selectedMechanic?.full_name ?? "—"}\nTrabajo: ${description.trim()}`,
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      const { error: rpcError } = await supabase.rpc("add_service_order_labor", {
        p_service_order_id: serviceOrderId,
        p_mechanic_id: mechanicId,
        p_description: description.trim(),
        p_quantity: 1,
        p_unit_price: parsedValue,
      });

      if (rpcError) throw rpcError;

      setMessage("Mano de obra asociada correctamente.");
      setDescription("");
      setValue("");
      await load();
      onChanged?.();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No fue posible asociar la mano de obra.");
    } finally {
      setSaving(false);
    }
  }

  async function removeLabor(item: LaborItem) {
    if (locked) return;
    if (!window.confirm(`¿Eliminar la mano de obra "${item.description}" por ${money(num(item.unit_price))}?`)) return;

    try {
      setDeletingId(item.id);
      setError("");
      setMessage("");

      const { error: deleteError } = await supabase
        .from("service_order_items")
        .delete()
        .eq("id", item.id)
        .eq("service_order_id", serviceOrderId);

      if (deleteError) throw deleteError;

      setMessage("Mano de obra eliminada correctamente.");
      await load();
      onChanged?.();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No fue posible eliminar la mano de obra.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="card">
      <div className="section-head">
        <div>
          <h2>Mano de obra</h2>
          <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
            Registra el mecánico, el trabajo y el valor que se sumará a la orden.
          </div>
        </div>
        <Wrench size={16} />
      </div>

      {error && (
        <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 8, background: "#fff0f0", color: "#a52222", fontSize: 12 }}>
          {error}
        </div>
      )}

      {message && (
        <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 8, background: "#e9f8f2", color: "#146c50", fontSize: 12 }}>
          {message}
        </div>
      )}

      <div className="form-grid" style={{ marginBottom: 14 }}>
        <div className="field">
          <label>Mecánico *</label>
          <select
            value={mechanicId}
            onChange={(event) => setMechanicId(event.target.value)}
            disabled={loading || saving || locked}
          >
            <option value="">Seleccionar mecánico...</option>
            {mechanics.map((mechanic) => (
              <option key={mechanic.id} value={mechanic.id}>
                {mechanic.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Trabajo *</label>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ej. Cambio de aceite y revisión"
            disabled={saving || locked}
          />
        </div>

        <div className="field">
          <label>Valor *</label>
          <input
            type="number"
            min="0"
            step="1"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="0"
            disabled={saving || locked}
          />
        </div>

        <div className="field" style={{ display: "flex", justifyContent: "flex-end" }}>
          <label style={{ visibility: "hidden" }}>Acción</label>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => void addLabor()}
            disabled={saving || loading || locked}
          >
            <Plus size={14} />
            {saving ? "Asociando..." : "Agregar mano de obra"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty">Cargando mano de obra...</div>
      ) : items.length === 0 ? (
        <div className="empty">Aún no hay mano de obra asociada a esta orden.</div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Mecánico</th>
                  <th>Trabajo</th>
                  <th>Valor</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const mechanicName = mechanics.find((mechanic) => mechanic.id === item.mechanic_id)?.full_name ?? "Mecánico de la orden";
                  return (
                    <tr key={item.id}>
                      <td>{dateTime(item.created_at)}</td>
                      <td>{mechanicName}</td>
                      <td>{item.description}</td>
                      <td><strong>{money(num(item.quantity) * num(item.unit_price))}</strong></td>
                      <td>
                        <button
                          className="btn btn-ghost"
                          type="button"
                          onClick={() => void removeLabor(item)}
                          disabled={saving || deletingId === item.id || locked}
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                          {deletingId === item.id ? "..." : "Eliminar"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span className="muted">{items.length} línea{items.length === 1 ? "" : "s"} de mano de obra.</span>
            <strong>Total mano de obra: {money(totalLabor)}</strong>
          </div>
        </>
      )}

      <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-ghost" type="button" onClick={() => void load()} disabled={loading || saving}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {locked && (
        <div className="footer-note" style={{ marginTop: 10 }}>
          La orden está cerrada para modificaciones de mano de obra.
        </div>
      )}
    </div>
  );
}
