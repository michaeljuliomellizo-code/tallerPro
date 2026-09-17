"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Package, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/lib/utils";

type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  stock: number | string;
  cost: number | string;
  sale_price: number | string;
};

type Part = {
  id: string;
  inventory_product_id: string | null;
  description: string;
  quantity: number | string;
  unit_cost: number | string;
  unit_price: number | string;
  created_at: string;
};

function num(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function ServiceOrderPartsClient({
  serviceOrderId,
  orderStatus,
  onChanged,
}: {
  serviceOrderId: string;
  orderStatus?: string;
  onChanged?: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [parts, setParts] = useState<Part[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const locked = orderStatus === "cancelled" || orderStatus === "delivered";

  const selectedProduct = products.find((item) => item.id === selectedProductId) ?? null;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [partsResult, productsResult] = await Promise.all([
        supabase
          .from("service_order_items")
          .select(
            "id, inventory_product_id, description, quantity, unit_cost, unit_price, created_at"
          )
          .eq("service_order_id", serviceOrderId)
          .eq("item_type", "part")
          .order("created_at", { ascending: false }),
        supabase
          .from("inventory_products")
          .select("id, sku, barcode, name, brand, stock, cost, sale_price")
          .eq("active", true)
          .order("name"),
      ]);

      if (partsResult.error) throw partsResult.error;
      if (productsResult.error) throw productsResult.error;

      setParts((partsResult.data ?? []) as Part[]);
      setProducts((productsResult.data ?? []) as Product[]);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No fue posible cargar los repuestos.");
    } finally {
      setLoading(false);
    }
  }, [serviceOrderId, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products.slice(0, 30);

    return products
      .filter((product) =>
        [product.name, product.sku, product.barcode, product.brand]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      )
      .slice(0, 30);
  }, [products, search]);

  const totalPartsCost = useMemo(
    () => parts.reduce((total, part) => total + num(part.quantity) * num(part.unit_cost), 0),
    [parts]
  );

  async function consumePart() {
    if (locked) {
      setError("Esta orden ya no permite consumo de repuestos.");
      return;
    }

    if (!selectedProduct) {
      setError("Selecciona un producto.");
      return;
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("La cantidad debe ser mayor que cero.");
      return;
    }

    const availableStock = num(selectedProduct.stock);

    if (availableStock <= 0) {
      setError("El repuesto seleccionado no tiene stock disponible.");
      return;
    }

    if (availableStock < qty) {
      setError(`Stock insuficiente. Disponible: ${availableStock}.`);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const { data, error: rpcError } = await supabase.rpc("consume_service_order_part", {
        p_service_order_id: serviceOrderId,
        p_inventory_product_id: selectedProduct.id,
        p_quantity: qty,
      });

      if (rpcError) throw rpcError;

      const result = data as { product_name?: string; quantity?: number | string; new_stock?: number | string };
      setMessage(
        `Consumo registrado: ${result.product_name ?? selectedProduct.name} × ${num(result.quantity ?? qty)}. Stock restante: ${num(result.new_stock)}.`
      );
      setSelectedProductId("");
      setQuantity("1");
      setSearch("");

      await load();
      onChanged?.();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No fue posible registrar el consumo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="section-head">
        <div>
          <h2>Repuestos utilizados</h2>
          <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
            Consumo real desde inventario. Cada registro descuenta stock y crea un movimiento de tipo <strong>order_usage</strong>.
          </div>
        </div>
        <Package size={16} />
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
          <label>Buscar repuesto</label>
          <div className="search">
            <Search size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre, SKU o código de barras..."
              disabled={saving || locked}
            />
          </div>
        </div>

        <div className="field">
          <label>Producto</label>
          <select
            value={selectedProductId}
            onChange={(event) => setSelectedProductId(event.target.value)}
            disabled={loading || saving || locked}
          >
            <option value="">Seleccionar producto...</option>
            {filteredProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} · {product.sku} · Stock {num(product.stock)}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Cantidad</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            disabled={saving || locked}
          />
        </div>

        <div className="field" style={{ display: "flex", justifyContent: "flex-end" }}>
          <label style={{ visibility: "hidden" }}>Acción</label>
          <button className="btn btn-primary" type="button" onClick={consumePart} disabled={saving || locked}>
            <Plus size={14} />
            {saving ? "Registrando..." : "Consumir repuesto"}
          </button>
        </div>
      </div>

      {selectedProduct && (
        <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, background: "#f7faf9", border: "1px solid #e5ebe9", display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }}>
          <div><span className="muted">Stock disponible</span><strong style={{ display: "block" }}>{num(selectedProduct.stock)}</strong></div>
          <div><span className="muted">Costo actual</span><strong style={{ display: "block" }}>{money(num(selectedProduct.cost))}</strong></div>
          <div><span className="muted">Precio</span><strong style={{ display: "block" }}>{money(num(selectedProduct.sale_price))}</strong></div>
          <div><span className="muted">Costo de consumo</span><strong style={{ display: "block" }}>{money(num(selectedProduct.cost) * Math.max(0, Number(quantity) || 0))}</strong></div>
        </div>
      )}

      {loading ? (
        <div className="empty">Cargando repuestos...</div>
      ) : parts.length === 0 ? (
        <div className="empty">Aún no hay repuestos consumidos en esta orden.</div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Repuesto</th>
                  <th>Cantidad</th>
                  <th>Costo unitario</th>
                  <th>Costo total</th>
                </tr>
              </thead>
              <tbody>
                {parts.map((part) => (
                  <tr key={part.id}>
                    <td>{formatDate(part.created_at)}</td>
                    <td><strong>{part.description}</strong></td>
                    <td>{num(part.quantity)}</td>
                    <td>{money(num(part.unit_cost))}</td>
                    <td>{money(num(part.quantity) * num(part.unit_cost))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div className="muted" style={{ fontSize: 11 }}>
              {parts.length} consumo{parts.length === 1 ? "" : "s"} registrado{parts.length === 1 ? "" : "s"}.
            </div>
            <strong>Costo real de repuestos: {money(totalPartsCost)}</strong>
          </div>
        </>
      )}

      <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-ghost" type="button" onClick={() => void load()} disabled={loading || saving}>
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      {locked && (
        <div className="footer-note" style={{ marginTop: 10 }}>
          La orden está cerrada para consumo de inventario.
        </div>
      )}
    </div>
  );
}
