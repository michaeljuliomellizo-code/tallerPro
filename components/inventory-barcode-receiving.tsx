"use client";

import { useState } from "react";
import BarcodeField from "./barcode-field";
import { createClient } from "@/lib/supabase/client";

export default function InventoryBarcodeReceiving({ organizationId, onSuccess }: { organizationId: string; onSuccess?: () => void }) {
  const supabase = createClient();
  const [product, setProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState("1");
  const [cost, setCost] = useState("0");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function findBarcode(barcode: string) {
    setError("");
    setMessage("");

    const { data, error } = await supabase
      .from("inventory_products")
      .select("id, sku, barcode, name, brand, stock, cost, sale_price, active")
      .eq("organization_id", organizationId)
      .eq("barcode", barcode)
      .eq("active", true)
      .maybeSingle();

    if (error) {
      setError(error.message);
      return;
    }

    if (!data) {
      setError(`No existe un producto activo con código ${barcode}.`);
      setProduct(null);
      return;
    }

    setProduct(data);
    setCost(String(Number(data.cost ?? 0)));
  }

  async function receive() {
    if (!product) return;
    const qty = Number(quantity);
    const unitCost = Number(cost);

    if (!Number.isFinite(qty) || qty <= 0) {
      setError("La cantidad debe ser mayor que cero.");
      return;
    }
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      setError("El costo no es válido.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const { error: movementError } = await supabase.rpc("add_inventory_movement", {
        p_inventory_product_id: product.id,
        p_movement_type: "purchase",
        p_quantity: qty,
        p_unit_cost: unitCost,
        p_reference: `BARCODE-${product.barcode}`,
      });

      if (movementError) throw movementError;

      setMessage(`${product.name}: entrada de ${qty} unidad(es) registrada.`);
      setProduct(null);
      setQuantity("1");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible registrar la entrada.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ display: "grid", gap: 16 }}>
      <div className="section-head">
        <div>
          <h2>Entrada por código de barras</h2>
          <div className="muted">Escanee un producto, indique cantidad y registre la entrada.</div>
        </div>
      </div>

      <BarcodeField onScan={findBarcode} disabled={saving} />

      {product && (
        <div className="card" style={{ background: "#f7f7f7" }}>
          <strong>{product.name}</strong>
          <div className="muted">SKU: {product.sku}</div>
          <div className="muted">Stock actual: {Number(product.stock ?? 0)}</div>

          <div className="form-grid" style={{ marginTop: 12 }}>
            <div className="field">
              <label>Cantidad</label>
              <input value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" min="0.01" step="0.01" disabled={saving} />
            </div>
            <div className="field">
              <label>Costo unitario</label>
              <input value={cost} onChange={(e) => setCost(e.target.value)} type="number" min="0" step="0.01" disabled={saving} />
            </div>
          </div>

          <button className="btn btn-primary" onClick={() => void receive()} disabled={saving} style={{ marginTop: 12 }}>
            {saving ? "Registrando..." : "Registrar entrada"}
          </button>
        </div>
      )}

      {message && <div style={{ color: "#0c6b58" }}>{message}</div>}
      {error && <div style={{ color: "#a52222" }}>{error}</div>}
    </div>
  );
}
